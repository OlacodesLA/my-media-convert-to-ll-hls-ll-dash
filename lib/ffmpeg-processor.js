const ffmpeg = require("fluent-ffmpeg");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");
const path = require("path");
const fs = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const AWS = require("aws-sdk");
const { spawn } = require("child_process");

// Set FFmpeg paths
console.log("ffmpegStatic type:", typeof ffmpegStatic, ffmpegStatic);
console.log("ffprobeStatic type:", typeof ffprobeStatic, ffprobeStatic);

// Extract the actual path from the static packages
let ffmpegPath, ffprobePath;

if (typeof ffmpegStatic === "string") {
  ffmpegPath = ffmpegStatic;
} else if (ffmpegStatic && ffmpegStatic.path) {
  ffmpegPath = ffmpegStatic.path;
} else if (ffmpegStatic && ffmpegStatic.ffmpegPath) {
  ffmpegPath = ffmpegStatic.ffmpegPath;
} else {
  ffmpegPath = ffmpegStatic;
}

if (typeof ffprobeStatic === "string") {
  ffprobePath = ffprobeStatic;
} else if (ffprobeStatic && ffprobeStatic.path) {
  ffprobePath = ffprobeStatic.path;
} else if (ffprobeStatic && ffprobeStatic.ffprobePath) {
  ffprobePath = ffprobeStatic.ffprobePath;
} else {
  ffprobePath = ffprobeStatic;
}

console.log("Extracted ffmpegPath:", ffmpegPath);
console.log("Extracted ffprobePath:", ffprobePath);

// Validate paths are strings
if (typeof ffmpegPath !== "string") {
  throw new Error(
    `Invalid ffmpeg path: expected string, got ${typeof ffmpegPath}`
  );
}
if (typeof ffprobePath !== "string") {
  throw new Error(
    `Invalid ffprobe path: expected string, got ${typeof ffprobePath}`
  );
}

// Try setting paths with error handling
try {
  ffmpeg.setFfmpegPath(ffmpegPath);
  ffmpeg.setFfprobePath(ffprobePath);
  console.log("FFmpeg paths set successfully");
} catch (error) {
  console.error("Error setting FFmpeg paths:", error);
  // Try alternative method
  try {
    ffmpeg.setFfmpegPath(ffmpegPath);
    ffmpeg.setFfprobePath(ffprobePath);
  } catch (altError) {
    console.error("Alternative path setting failed:", altError);
    throw new Error("Failed to set FFmpeg paths");
  }
}

class FFmpegProcessor {
  constructor(s3Bucket, cloudfrontDomain) {
    this.s3Bucket = s3Bucket;
    this.cloudfrontDomain = cloudfrontDomain;
  }

  /**
   * Process video for LL-DASH and LL-HLS streaming
   * Uses CMAF (Common Media Application Format) with fMP4 segments for chunked transfer
   * @param {string} inputUrl - S3 URL of the input video
   * @param {string} outputDir - Local output directory
   * @param {string} uniqueId - Unique identifier for the video
   * @returns {Promise<Object>} Processing result with streaming URLs
   */
  async processVideoForStreaming(inputUrl, outputDir, uniqueId) {
    try {
      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      // Download video from S3 to local file
      const localVideoPath = path.join(outputDir, "input.mp4");
      await this.downloadVideoFromS3(inputUrl, localVideoPath);

      // Verify the file was downloaded successfully
      try {
        await fs.access(localVideoPath);
        console.log("Local video file exists:", localVideoPath);
      } catch (error) {
        throw new Error(`Local video file not found: ${localVideoPath}`);
      }

      const dashOutput = path.join(outputDir, "dash.mpd");
      const hlsOutput = path.join(outputDir, "hls.m3u8");
      const thumbnailOutput = path.join(outputDir, "thumbnail.jpg");

      // Get video metadata
      console.log("Getting metadata for local video path:", localVideoPath);
      const metadata = await this.getVideoMetadata(localVideoPath);
      console.log("Video metadata:", metadata);

      // Process for LL-DASH
      console.log("Creating DASH stream...");
      await this.createDashStream(localVideoPath, dashOutput, metadata);
      console.log("DASH stream creation completed");

      // Verify DASH file exists
      await fs.access(dashOutput);
      console.log("DASH file exists:", dashOutput);

      // Read and log DASH manifest content for debugging
      const dashContent = await fs.readFile(dashOutput, "utf8");
      console.log("=== DASH MANIFEST CONTENT (FULL) ===");
      console.log(dashContent);
      console.log("====================================");

      // Process for LL-HLS
      console.log("Creating HLS stream...");
      await this.createHlsStream(localVideoPath, hlsOutput, metadata);
      console.log("HLS stream creation completed");

      // Verify HLS file exists
      await fs.access(hlsOutput);
      console.log("HLS file exists:", hlsOutput);

      // Create thumbnail
      console.log("Creating thumbnail...");
      await this.createThumbnail(localVideoPath, thumbnailOutput);
      console.log("Thumbnail creation completed");

      // List ALL files in the output directory for debugging
      const allFiles = await fs.readdir(outputDir);
      console.log("=== ALL FILES IN OUTPUT DIRECTORY ===");
      for (const file of allFiles) {
        const fullPath = path.join(outputDir, file);
        const stats = await fs.stat(fullPath);
        console.log(
          `${file}: ${stats.isDirectory() ? "DIR" : "FILE"} (${
            stats.size
          } bytes)`
        );

        // If it's a directory, list its contents
        if (stats.isDirectory()) {
          console.log(`  → Scanning subdirectory: ${file}`);
          const subFiles = await fs.readdir(fullPath);
          for (const subFile of subFiles) {
            const subPath = path.join(fullPath, subFile);
            const subStats = await fs.stat(subPath);
            console.log(
              `    - ${subFile}: ${subStats.isDirectory() ? "DIR" : "FILE"} (${
                subStats.size
              } bytes)`
            );
          }
        }
      }
      console.log("=====================================");

      // Upload processed files to S3
      const uploadPromises = [
        this.uploadToS3(dashOutput, `streaming/${uniqueId}/dash.mpd`),
        this.uploadToS3(hlsOutput, `streaming/${uniqueId}/hls.m3u8`),
        this.uploadToS3(thumbnailOutput, `streaming/${uniqueId}/thumbnail.jpg`),
        // Upload HLS segments
        ...(await this.uploadHlsSegments(outputDir, uniqueId)),
        // Upload DASH segments (.m4s files)
        ...(await this.uploadDashSegments(outputDir, uniqueId)),
      ];

      console.log(`Total upload promises: ${uploadPromises.length}`);
      await Promise.all(uploadPromises);
      console.log("All uploads completed successfully!");

      // Clean up local files
      await this.cleanupLocalFiles(outputDir);

      return {
        success: true,
        dashUrl: `https://${this.cloudfrontDomain}/streaming/${uniqueId}/dash.mpd`,
        hlsUrl: `https://${this.cloudfrontDomain}/streaming/${uniqueId}/hls.m3u8`,
        thumbnailUrl: `https://${this.cloudfrontDomain}/streaming/${uniqueId}/thumbnail.jpg`,
        metadata: metadata,
      };
    } catch (error) {
      console.error("FFmpeg processing error:", error);
      throw error;
    }
  }

  /**
   * Download video from S3 to local file
   */
  async downloadVideoFromS3(s3Url, localPath) {
    const s3 = new AWS.S3();

    try {
      // Extract S3 key from URL
      const urlParts = s3Url.split("/");
      const bucketIndex = urlParts.findIndex((part) => part.includes(".s3"));
      const s3Key = urlParts.slice(bucketIndex + 1).join("/");

      console.log(`Downloading video from S3: ${s3Key}`);

      const s3Object = await s3
        .getObject({
          Bucket: this.s3Bucket,
          Key: s3Key,
        })
        .promise();

      // Write to local file
      await fs.writeFile(localPath, s3Object.Body);
      console.log(`Video downloaded to: ${localPath}`);
    } catch (error) {
      console.error("Error downloading video from S3:", error);
      throw error;
    }
  }

  /**
   * Get video metadata using FFprobe
   */
  async getVideoMetadata(inputUrl) {
    console.log("getVideoMetadata called with:", typeof inputUrl, inputUrl);

    // Ensure inputUrl is a string
    if (typeof inputUrl !== "string") {
      throw new Error(
        `Expected string for inputUrl, got ${typeof inputUrl}: ${JSON.stringify(
          inputUrl
        )}`
      );
    }

    return new Promise((resolve, reject) => {
      // Try using ffprobe with explicit path
      console.log("Using primary ffprobe method");
      const command = ffmpeg(inputUrl);
      command.setFfprobePath(ffprobePath);

      command.ffprobe((err, metadata) => {
        if (err) {
          console.error("Primary FFprobe error:", err);
          // Try fallback method using direct ffprobe call
          this.getVideoMetadataFallback(inputUrl).then(resolve).catch(reject);
          return;
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === "video"
        );
        const audioStream = metadata.streams.find(
          (s) => s.codec_type === "audio"
        );

        console.log("Primary ffprobe method succeeded");
        resolve({
          duration: parseFloat(metadata.format.duration),
          width: videoStream ? videoStream.width : 1920,
          height: videoStream ? videoStream.height : 1080,
          bitrate: parseInt(metadata.format.bit_rate) || 5000000,
          hasAudio: !!audioStream,
          framerate: videoStream ? eval(videoStream.r_frame_rate) : 30,
        });
      });
    });
  }

  /**
   * Fallback method to get video metadata using direct ffprobe call
   */
  async getVideoMetadataFallback(inputUrl) {
    return new Promise((resolve, reject) => {
      console.log("Using fallback ffprobe method");

      const ffprobeProcess = spawn(ffprobePath, [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        inputUrl,
      ]);

      let stdout = "";
      let stderr = "";

      ffprobeProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      ffprobeProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      ffprobeProcess.on("close", (code) => {
        if (code !== 0) {
          console.error("FFprobe stderr:", stderr);
          reject(
            new Error(`FFprobe process exited with code ${code}: ${stderr}`)
          );
          return;
        }

        try {
          const metadata = JSON.parse(stdout);
          const videoStream = metadata.streams.find(
            (s) => s.codec_type === "video"
          );
          const audioStream = metadata.streams.find(
            (s) => s.codec_type === "audio"
          );

          resolve({
            duration: parseFloat(metadata.format.duration),
            width: videoStream ? videoStream.width : 1920,
            height: videoStream ? videoStream.height : 1080,
            bitrate: parseInt(metadata.format.bit_rate) || 5000000,
            hasAudio: !!audioStream,
            framerate: videoStream ? eval(videoStream.r_frame_rate) : 30,
          });
        } catch (parseError) {
          console.error("Error parsing ffprobe output:", parseError);
          reject(parseError);
        }
      });

      ffprobeProcess.on("error", (error) => {
        console.error("FFprobe process error:", error);
        reject(error);
      });
    });
  }

  /**
   * Create LL-DASH stream with CMAF (fMP4) segments for chunked transfer
   * Generates .m4s files that support HTTP chunked transfer
   */
  async createDashStream(inputUrl, outputPath, metadata) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputUrl);

      // Multiple bitrate outputs for adaptive streaming
      const bitrates = this.getAdaptiveBitrates(metadata);

      // Build output options based on whether video has audio
      const outputOptions = [
        // DASH format with CMAF (fMP4) segments
        "-f",
        "dash",
        "-seg_duration",
        "2", // 2-second segments for low latency
        "-frag_duration",
        "2",
        "-ldash",
        "1", // Low latency DASH
        "-streaming",
        "1",
        "-use_template",
        "1",
        "-use_timeline",
        "0", // Disable timeline for lower latency
        "-single_file",
        "0", // Don't put all segments in one file

        // CMAF (Common Media Application Format) - fMP4 segments
        "-dash_segment_type",
        "1", // Use fragmented MP4 (fMP4/CMAF) segments for chunked transfer (1 = ISO BMFF)
        "-init_seg_name",
        "init_$RepresentationID$.mp4", // Naming for initialization segments
        "-media_seg_name",
        "segment_$RepresentationID$_$Number$.m4s", // Naming for media segments

        // Video encoding for multiple bitrates with CMAF optimization
        "-map",
        "0:v:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast", // Fast encoding
        "-crf",
        "23",
        "-maxrate",
        `${bitrates.high}K`,
        "-bufsize",
        `${bitrates.high * 2}K`,
        "-vf",
        `scale=${metadata.width}:${metadata.height}`,

        // Additional low latency options for CMAF
        "-g",
        "60", // GOP size
        "-keyint_min",
        "60",
        "-sc_threshold",
        "0",

        // CMAF fMP4 specific flags for proper chunked transfer
        "-strict",
        "experimental", // Allow experimental CMAF features
      ];

      // Add audio mapping and encoding only if video has audio
      if (metadata.hasAudio) {
        console.log(
          "Video has audio - adding audio stream mapping with CMAF encoding"
        );
        outputOptions.push(
          "-map",
          "0:a:0",
          // CMAF-compliant audio encoding for chunked transfer
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-ac",
          "2",
          "-ar",
          "48000"
        );
      } else {
        console.log("Video has no audio - skipping audio stream mapping");
      }

      command
        .outputOptions(outputOptions)
        .output(outputPath)
        .on("start", (commandLine) => {
          console.log("DASH FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          console.log("DASH encoding progress:", JSON.stringify(progress));
        })
        .on("end", () => {
          console.log("DASH stream created successfully");
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          console.error("DASH creation error:", err);
          console.error("FFmpeg stderr:", stderr);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create LL-HLS stream with CMAF (fMP4) segments for chunked transfer
   * Uses the same fMP4 segments as DASH for unified storage and streaming
   */
  async createHlsStream(inputUrl, outputPath, metadata) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputUrl);

      const bitrates = this.getAdaptiveBitrates(metadata);

      // Build output options based on whether video has audio
      const outputOptions = [
        // HLS format with CMAF (fMP4) segments
        "-f",
        "hls",
        "-hls_time",
        "2", // 2-second segments for low latency
        "-hls_list_size",
        "0", // Keep all segments in playlist
        "-hls_flags",
        "independent_segments",
        "-hls_segment_type",
        "fmp4", // Use CMAF fMP4 segments instead of MPEG-TS
        "-hls_allow_cache",
        "0", // Disable caching for lower latency
        "-hls_fmp4_init_filename",
        "init.mp4", // CMAF initialization segment
        "-hls_segment_filename",
        "hls%Y%m%d%H%M%S.m4s", // Keep timestamp-based naming for HLS segments

        // Video encoding
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-maxrate",
        `${bitrates.high}K`,
        "-bufsize",
        `${bitrates.high * 2}K`,
        "-vf",
        `scale=${metadata.width}:${metadata.height}`,

        // Low latency options for CMAF
        "-g",
        "60",
        "-keyint_min",
        "60",
        "-sc_threshold",
        "0",
        "-hls_start_number_source",
        "datetime",

        // CMAF fMP4 specific flags for proper chunked transfer
        "-strict",
        "experimental", // Allow experimental CMAF features
      ];

      // Add audio encoding only if video has audio
      if (metadata.hasAudio) {
        console.log("Video has audio - adding audio encoding for CMAF HLS");
        outputOptions.push(
          // CMAF-compliant audio encoding for chunked transfer
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-ac",
          "2",
          "-ar",
          "48000"
        );
      } else {
        console.log("Video has no audio - skipping audio encoding for HLS");
      }

      command
        .outputOptions(outputOptions)
        .output(outputPath)
        .on("start", (commandLine) => {
          console.log("HLS FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          console.log("HLS encoding progress:", JSON.stringify(progress));
        })
        .on("end", () => {
          console.log("HLS stream created successfully");
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          console.error("HLS creation error:", err);
          console.error("FFmpeg stderr:", stderr);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Create thumbnail from video
   */
  async createThumbnail(inputUrl, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputUrl)
        .screenshots({
          timestamps: ["10%"], // Take thumbnail at 10% of video duration
          filename: path.basename(outputPath),
          folder: path.dirname(outputPath),
          size: "640x360",
        })
        .on("end", () => {
          console.log("Thumbnail created successfully");
          resolve();
        })
        .on("error", (err) => {
          console.error("Thumbnail creation error:", err);
          reject(err);
        });
    });
  }

  /**
   * Get adaptive bitrates based on video resolution
   */
  getAdaptiveBitrates(metadata) {
    const { width, height } = metadata;

    if (width >= 1920 && height >= 1080) {
      return { low: 1000, medium: 2500, high: 5000 }; // 1080p
    } else if (width >= 1280 && height >= 720) {
      return { low: 800, medium: 1500, high: 3000 }; // 720p
    } else if (width >= 854 && height >= 480) {
      return { low: 600, medium: 1000, high: 2000 }; // 480p
    } else {
      return { low: 400, medium: 800, high: 1500 }; // 360p and below
    }
  }

  /**
   * Upload file to S3
   */
  async uploadToS3(localPath, s3Key) {
    const s3 = new AWS.S3();

    try {
      // Check if file exists before trying to read it
      const stats = await fs.stat(localPath);
      console.log(
        `Uploading file: ${path.basename(localPath)} (size: ${
          stats.size
        } bytes)`
      );

      const fileContent = await fs.readFile(localPath);

      const params = {
        Bucket: this.s3Bucket,
        Key: s3Key,
        Body: fileContent,
        ContentType: this.getContentType(s3Key),
      };

      const result = await s3.upload(params).promise();
      console.log(`Uploaded ${s3Key} to S3`);
      return result;
    } catch (error) {
      console.error(`Error uploading ${s3Key}:`, error);
      throw error;
    }
  }

  /**
   * Upload HLS segments to S3 (supports both .ts and .m4s/fMP4 CMAF segments)
   */
  async uploadHlsSegments(outputDir, uniqueId) {
    const uploadPromises = [];

    try {
      const files = await fs.readdir(outputDir);
      console.log(`HLS output directory contents:`, files);

      // Support both traditional .ts and CMAF .m4s/.mp4 segments
      // HLS fmp4 creates init.mp4, init.mp4.bak, or init files
      const segmentFiles = files.filter(
        (file) =>
          file.endsWith(".ts") ||
          file.endsWith(".m3u8") ||
          file.endsWith(".m4s") ||
          file === "init.mp4" ||
          (file.startsWith("init") && file.endsWith(".mp4"))
      );

      console.log(
        "HLS files with 'init':",
        files.filter((f) => f.includes("init"))
      );

      console.log(
        `Found ${segmentFiles.length} HLS segment files to upload:`,
        segmentFiles
      );

      for (const file of segmentFiles) {
        const localPath = path.join(outputDir, file);
        const s3Key = `streaming/${uniqueId}/${file}`;
        console.log(`Uploading HLS segment: ${file} from ${localPath}`);
        uploadPromises.push(this.uploadToS3(localPath, s3Key));
      }

      // Also check subdirectories recursively for nested segments
      for (const file of files) {
        const fullPath = path.join(outputDir, file);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            console.log(
              `Found subdirectory in HLS: ${file}, searching for segments...`
            );
            const subFiles = await fs.readdir(fullPath);
            const subSegments = subFiles.filter(
              (f) =>
                f.endsWith(".ts") ||
                f.endsWith(".m3u8") ||
                f.endsWith(".m4s") ||
                (f.endsWith(".mp4") && f.includes("init"))
            );
            console.log(
              `Found ${subSegments.length} HLS segments in subdirectory`
            );
            for (const subFile of subSegments) {
              const subPath = path.join(fullPath, subFile);
              const s3Key = `streaming/${uniqueId}/${subFile}`;
              console.log(`Uploading HLS segment from subdir: ${subFile}`);
              uploadPromises.push(this.uploadToS3(subPath, s3Key));
            }
          }
        } catch (err) {
          // Ignore non-directory files
        }
      }

      return uploadPromises;
    } catch (error) {
      console.error("Error uploading HLS segments:", error);
      return [];
    }
  }

  /**
   * Upload DASH segments to S3
   */
  async uploadDashSegments(outputDir, uniqueId) {
    const uploadPromises = [];

    try {
      const files = await fs.readdir(outputDir);
      console.log(`DASH output directory contents:`, files);

      // Also check project root directory where FFmpeg sometimes creates DASH segments
      // FFmpeg runs from the project directory, so segments appear there
      const projectRoot = path.join(__dirname, ".."); // Go up from lib/ to project root
      console.log(
        `Also checking project root directory for DASH segments: ${projectRoot}`
      );
      let parentFiles = [];
      try {
        parentFiles = await fs.readdir(projectRoot);
        console.log(
          `Project root directory contents (filtered):`,
          parentFiles.filter(
            (f) =>
              f.endsWith(".m4s") || f.includes("segment") || f.includes("init")
          )
        );
      } catch (err) {
        console.log(`Could not read project root directory: ${err.message}`);
      }

      // Filter for DASH segments - ANY .m4s, .m4a, or init .mp4 files
      // EXCLUDE HLS segments which start with "hls" (HLS uses timestamp-based naming)
      const segmentFiles = files.filter((file) => {
        const isHLS = file.startsWith("hls");
        const isSegment =
          file.endsWith(".m4s") ||
          file.endsWith(".m4a") ||
          (file.endsWith(".mp4") && file.includes("init"));
        return !isHLS && isSegment;
      });

      // Also check parent directory for DASH segments
      const parentSegmentFiles = parentFiles.filter((file) => {
        const isHLS = file.startsWith("hls");
        const isSegment =
          file.endsWith(".m4s") ||
          file.endsWith(".m4a") ||
          (file.endsWith(".mp4") &&
            (file.includes("init") || file.includes("segment")));
        return !isHLS && isSegment;
      });

      console.log(
        `Found ${parentSegmentFiles.length} DASH segments in parent directory:`,
        parentSegmentFiles
      );

      console.log(
        `Found ${segmentFiles.length} DASH segment files to upload:`,
        segmentFiles
      );

      for (const file of segmentFiles) {
        const localPath = path.join(outputDir, file);
        const s3Key = `streaming/${uniqueId}/${file}`;
        console.log(`Uploading DASH segment: ${file} from ${localPath}`);
        uploadPromises.push(this.uploadToS3(localPath, s3Key));
      }

      // Upload DASH segments from project root directory
      for (const file of parentSegmentFiles) {
        const localPath = path.join(projectRoot, file);
        const s3Key = `streaming/${uniqueId}/${file}`;
        console.log(
          `Uploading DASH segment from project root: ${file} from ${localPath}`
        );
        uploadPromises.push(this.uploadToS3(localPath, s3Key));
      }

      // Also check subdirectories recursively for nested segments
      for (const file of files) {
        const fullPath = path.join(outputDir, file);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isDirectory()) {
            console.log(
              `Found subdirectory: ${file}, searching for segments...`
            );
            const subFiles = await fs.readdir(fullPath);
            const subSegments = subFiles.filter((f) => {
              const isHLS = f.startsWith("hls");
              const isSegment =
                f.endsWith(".m4s") ||
                f.endsWith(".m4a") ||
                (f.endsWith(".mp4") && f.includes("init"));
              return !isHLS && isSegment;
            });
            console.log(`Found ${subSegments.length} segments in subdirectory`);
            for (const subFile of subSegments) {
              const subPath = path.join(fullPath, subFile);
              const s3Key = `streaming/${uniqueId}/${subFile}`;
              console.log(`Uploading DASH segment from subdir: ${subFile}`);
              uploadPromises.push(this.uploadToS3(subPath, s3Key));
            }
          }
        } catch (err) {
          // Ignore non-directory files
        }
      }

      return uploadPromises;
    } catch (error) {
      console.error("Error uploading DASH segments:", error);
      return [];
    }
  }

  /**
   * Get content type based on file extension
   */
  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const types = {
      ".mpd": "application/dash+xml",
      ".m3u8": "application/vnd.apple.mpegurl",
      ".ts": "video/mp2t",
      ".m4s": "video/mp4",
      ".m4a": "audio/mp4",
      ".mp4": "video/mp4", // CMAF initialization segment for HLS
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    return types[ext] || "application/octet-stream";
  }

  /**
   * Clean up local temporary files
   */
  async cleanupLocalFiles(outputDir) {
    try {
      // Clean up temp directory
      const files = await fs.readdir(outputDir);
      const deletePromises = files.map((file) =>
        fs.unlink(path.join(outputDir, file))
      );
      await Promise.all(deletePromises);
      await fs.rmdir(outputDir);
      console.log("Cleaned up local files");

      // Also clean up DASH segments from project root if they exist
      try {
        const projectRoot = path.join(__dirname, "..");
        const rootFiles = await fs.readdir(projectRoot);
        const dashFiles = rootFiles.filter(
          (file) =>
            (file.includes("segment_") && file.endsWith(".m4s")) ||
            (file.includes("init_") && file.endsWith(".mp4"))
        );

        if (dashFiles.length > 0) {
          console.log(
            `Cleaning up ${dashFiles.length} DASH segment files from project root:`,
            dashFiles
          );
          const dashDeletePromises = dashFiles.map((file) =>
            fs.unlink(path.join(projectRoot, file))
          );
          await Promise.all(dashDeletePromises);
          console.log("Cleaned up DASH segments from project root");
        }
      } catch (rootError) {
        // Ignore errors cleaning up root - files might not exist or already deleted
      }
    } catch (error) {
      console.error("Error cleaning up files:", error);
    }
  }

  /**
   * Process image (resize and optimize)
   */
  async processImage(inputUrl, outputDir, uniqueId) {
    try {
      const sharp = require("sharp");

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      const outputPath = path.join(outputDir, "optimized.jpg");

      // Download image from S3
      const s3 = new AWS.S3();

      const s3Key = inputUrl.split("/").slice(-2).join("/"); // Extract key from URL
      const s3Object = await s3
        .getObject({
          Bucket: this.s3Bucket,
          Key: s3Key,
        })
        .promise();

      // Process with Sharp
      await sharp(s3Object.Body)
        .resize(1920, 1080, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({
          quality: 85,
          progressive: true,
        })
        .toFile(outputPath);

      // Upload optimized image
      await this.uploadToS3(outputPath, `streaming/${uniqueId}/optimized.jpg`);

      // Clean up
      await this.cleanupLocalFiles(outputDir);

      return {
        success: true,
        optimizedUrl: `https://${this.cloudfrontDomain}/streaming/${uniqueId}/optimized.jpg`,
        thumbnailUrl: `https://${this.cloudfrontDomain}/streaming/${uniqueId}/optimized.jpg`,
      };
    } catch (error) {
      console.error("Image processing error:", error);
      throw error;
    }
  }
}

module.exports = FFmpegProcessor;
