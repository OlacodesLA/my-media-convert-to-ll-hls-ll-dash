const express = require("express");
const multer = require("multer");
const AWS = require("aws-sdk");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const FFmpegProcessor = require("./lib/ffmpeg-processor");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const PLACEHOLDER_DATABASE_URL =
  "postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public";

if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set. Using placeholder value so the application can start. Configure the real database URL to enable persistence."
  );
  process.env.DATABASE_URL = PLACEHOLDER_DATABASE_URL;
}

const databaseConfigured =
  process.env.DATABASE_URL && process.env.DATABASE_URL !== PLACEHOLDER_DATABASE_URL;

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.dashjs.org",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com",
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        mediaSrc: ["'self'", "https:", "blob:"],
        connectSrc: ["'self'", "https:"],
      },
    },
  })
);

// Performance middleware
app.use(compression());
app.use(morgan("combined"));

// CORS configuration for development
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? ["https://yourdomain.com"] : true,
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files
app.use(express.static("public"));

const ensureDatabaseConfigured = (req, res, next) => {
  if (!databaseConfigured) {
    return res.status(503).json({
      success: false,
      error:
        "Database is not configured yet. Set the DATABASE_URL environment variable and redeploy.",
    });
  }
  next();
};

app.use("/api", ensureDatabaseConfigured);

// AWS Configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// Initialize FFmpeg processor
const ffmpegProcessor = new FFmpegProcessor(
  process.env.S3_BUCKET_NAME,
  process.env.CLOUDFRONT_DOMAIN
);

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/quicktime",
      "video/x-msvideo",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Invalid file type. Only images and videos are allowed."),
        false
      );
    }
  },
});

// Utility functions
const generateUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const toSnakeCasePost = (post) => {
  if (!post) {
    return null;
  }

  const fileSize =
    post.fileSizeBytes !== null && post.fileSizeBytes !== undefined
      ? parseInt(post.fileSizeBytes.toString(), 10)
      : null;

  return {
    id: post.id,
    user_id: post.userId,
    caption: post.caption,
    media_type: post.mediaType,
    original_media_url: post.originalMediaUrl,
    thumbnail_url: post.thumbnailUrl,
    dash_manifest_url: post.dashManifestUrl,
    hls_playlist_url: post.hlsPlaylistUrl,
    duration_seconds: post.durationSeconds,
    file_size_bytes: fileSize,
    resolution: post.resolution,
    bitrate_kbps: post.bitrateKbps,
    likes_count: post.likesCount,
    comments_count: post.commentsCount,
    shares_count: post.sharesCount,
    views_count: post.viewsCount,
    processing_status: post.processingStatus,
    processing_job_id: post.processingJobId,
    created_at: post.createdAt ? post.createdAt.toISOString() : null,
    updated_at: post.updatedAt ? post.updatedAt.toISOString() : null,
    username: post.user ? post.user.username : null,
    profile_image_url: post.user ? post.user.profileImageUrl : null,
  };
};

// Async processing functions
async function processVideoAsync(postId, inputUrl, uniqueId) {
  if (!databaseConfigured) {
    console.warn(
      "Skipping video post-processing database updates because DATABASE_URL is not configured."
    );
    return;
  }
  try {
    console.log(`Starting FFmpeg processing for post ${postId}`);

    const outputDir = path.join(__dirname, "temp", uniqueId);
    const result = await ffmpegProcessor.processVideoForStreaming(
      inputUrl,
      outputDir,
      uniqueId
    );

    // Update post with streaming URLs
    await prisma.post.update({
      where: { id: Number(postId) },
      data: {
        processingStatus: "ready",
        dashManifestUrl: result.dashUrl,
        hlsPlaylistUrl: result.hlsUrl,
        thumbnailUrl: result.thumbnailUrl,
      },
    });

    console.log(`FFmpeg processing completed for post ${postId}`);
  } catch (error) {
    console.error(`FFmpeg processing failed for post ${postId}:`, error);

    // Update post status to failed
    await prisma.post.update({
      where: { id: Number(postId) },
      data: { processingStatus: "failed" },
    });
  }
}

async function processImageAsync(postId, inputUrl, uniqueId) {
  if (!databaseConfigured) {
    console.warn(
      "Skipping image post-processing database updates because DATABASE_URL is not configured."
    );
    return;
  }
  try {
    console.log(`Starting image processing for post ${postId}`);

    const outputDir = path.join(__dirname, "temp", uniqueId);
    const result = await ffmpegProcessor.processImage(
      inputUrl,
      outputDir,
      uniqueId
    );

    // Update post with optimized image URL
    await prisma.post.update({
      where: { id: Number(postId) },
      data: {
        processingStatus: "ready",
        thumbnailUrl: result.thumbnailUrl,
      },
    });

    console.log(`Image processing completed for post ${postId}`);
  } catch (error) {
    console.error(`Image processing failed for post ${postId}:`, error);

    // Update post status to failed
    await prisma.post.update({
      where: { id: Number(postId) },
      data: { processingStatus: "failed" },
    });
  }
}

const uploadToS3 = async (file, key, contentType) => {
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
  };

  return await s3.upload(params).promise();
};

// Routes

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Get all posts with pagination
app.get("/api/posts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: { processingStatus: "ready" },
      include: {
        user: {
          select: {
            username: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    res.json({
      success: true,
      posts: posts.map(toSnakeCasePost),
      pagination: {
        page: page,
        limit: limit,
        hasMore: posts.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch posts" });
  }
});

// Get single post
app.get("/api/posts/:id", async (req, res) => {
  try {
    const postId = Number(req.params.id);

    if (Number.isNaN(postId)) {
      return res.status(400).json({ success: false, error: "Invalid post ID" });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            username: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    res.json({ success: true, post: toSnakeCasePost(post) });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(500).json({ success: false, error: "Failed to fetch post" });
  }
});

// Create new post
app.post("/api/posts", upload.single("media"), async (req, res) => {
  try {
    const { caption, userId = 1 } = req.body; // Default to user ID 1 for testing
    const file = req.file;

    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: "No media file provided" });
    }

    const uniqueId = generateUniqueId();
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uniqueId}${fileExtension}`;
    const mediaType = file.mimetype.startsWith("video/") ? "video" : "image";
    const parsedUserId = parseInt(userId, 10);
    const normalizedUserId =
      Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : 1;

    // Upload original file to S3
    const uploadResult = await uploadToS3(
      file,
      `uploads/${fileName}`,
      file.mimetype
    );

    // Insert post into database
    const post = await prisma.post.create({
      data: {
        userId: normalizedUserId,
        caption,
        mediaType,
        originalMediaUrl: uploadResult.Location || uploadResult.location,
        processingStatus: "uploading",
      },
    });

    const postId = post.id;

    // Process media based on type
    if (mediaType === "video") {
      try {
        // Update post status to processing
        await prisma.post.update({
          where: { id: postId },
          data: { processingStatus: "processing" },
        });

        // Start FFmpeg processing in background
        const videoUrl = uploadResult.Location || uploadResult.location;
        console.log("Upload result:", JSON.stringify(uploadResult, null, 2));
        console.log("Video URL for processing:", videoUrl);

        if (!videoUrl || typeof videoUrl !== "string") {
          throw new Error(`Invalid video URL: ${videoUrl}`);
        }

        processVideoAsync(postId, videoUrl, uniqueId);
      } catch (processingError) {
        console.error("FFmpeg processing error:", processingError);
        await prisma.post.update({
          where: { id: postId },
          data: { processingStatus: "failed" },
        });
      }
    } else {
      // For images, process with Sharp
      try {
        await prisma.post.update({
          where: { id: postId },
          data: { processingStatus: "processing" },
        });

        // Process image in background
        const imageUrl = uploadResult.Location || uploadResult.location;
        console.log("Image URL for processing:", imageUrl);
        processImageAsync(postId, imageUrl, uniqueId);
      } catch (imageError) {
        console.error("Image processing error:", imageError);
        await prisma.post.update({
          where: { id: postId },
          data: { processingStatus: "failed" },
        });
      }
    }

    res.json({
      success: true,
      postId: postId,
      message:
        mediaType === "video"
          ? "Video uploaded and processing started"
          : "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({ success: false, error: "Failed to create post" });
  }
});

// Check processing status
app.get("/api/posts/:id/status", async (req, res) => {
  try {
    const postId = Number(req.params.id);

    if (Number.isNaN(postId)) {
      return res.status(400).json({ success: false, error: "Invalid post ID" });
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        processingStatus: true,
        dashManifestUrl: true,
        hlsPlaylistUrl: true,
        thumbnailUrl: true,
      },
    });

    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    if (post.processingStatus === "ready") {
      res.json({
        success: true,
        status: "ready",
        dashUrl: post.dashManifestUrl,
        hlsUrl: post.hlsPlaylistUrl,
        thumbnailUrl: post.thumbnailUrl,
      });
    } else if (post.processingStatus === "failed") {
      res.json({
        success: true,
        status: "failed",
        error: "Processing failed",
      });
    } else {
      res.json({
        success: true,
        status: "processing",
        message: "Video is being processed with FFmpeg...",
      });
    }
  } catch (error) {
    console.error("Error checking post status:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to check post status" });
  }
});

// Like/Unlike post
app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const userIdRaw = req.body.userId;
    const parsedUserId = parseInt(userIdRaw, 10);
    const userId =
      Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : 1;

    if (Number.isNaN(postId)) {
      return res.status(400).json({ success: false, error: "Invalid post ID" });
    }

    const existingLike = await prisma.like.findFirst({
      where: {
        userId,
        postId,
      },
      select: { id: true },
    });

    if (existingLike) {
      await prisma.$transaction(async (tx) => {
        await tx.like.deleteMany({
          where: { userId, postId },
        });

        await tx.post.updateMany({
          where: { id: postId, likesCount: { gt: 0 } },
          data: { likesCount: { decrement: 1 } },
        });
      });

      return res.json({ success: true, liked: false });
    }

    await prisma.$transaction(async (tx) => {
      await tx.like.create({
        data: {
          userId,
          postId,
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });
    });

    res.json({ success: true, liked: true });
  } catch (error) {
    console.error("Error toggling like:", error);
    res.status(500).json({ success: false, error: "Failed to toggle like" });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Ultra Fast Social Platform running on port ${PORT}`);
  console.log(`📱 Frontend available at: http://localhost:${PORT}`);
  console.log(`🔗 API endpoints available at: http://localhost:${PORT}/api`);
});

const shutdown = async () => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    console.error("Error disconnecting Prisma client:", error);
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

module.exports = app;
