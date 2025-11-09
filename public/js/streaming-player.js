// Enhanced Streaming Player for LL-DASH and LL-HLS
// This module provides advanced streaming capabilities

class StreamingPlayer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      autoplay: false,
      controls: true,
      preload: "metadata",
      ...options,
    };
    this.currentFormat = "hls";
    this.player = null;
    this.dashPlayer = null;
    this.hlsPlayer = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Load dash.js for DASH support
      if (!window.dashjs) {
        await this.loadScript("https://cdn.dashjs.org/latest/dash.all.min.js");
      }

      // Load hls.js for HLS support
      if (!window.Hls) {
        await this.loadScript("https://cdn.jsdelivr.net/npm/hls.js@latest");
      }

      this.isInitialized = true;
      console.log("Streaming player initialized");
    } catch (error) {
      console.error("Failed to initialize streaming player:", error);
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async loadStream(streamUrls) {
    await this.initialize();

    if (!streamUrls.hls && !streamUrls.dash) {
      throw new Error("No streaming URLs provided");
    }

    // Create video element
    this.createVideoElement();

    // Load HLS by default (better browser support)
    if (streamUrls.hls) {
      await this.loadHLS(streamUrls.hls);
    } else if (streamUrls.dash) {
      await this.loadDASH(streamUrls.dash);
    }
  }

  createVideoElement() {
    if (this.player) {
      this.player.remove();
    }

    this.player = document.createElement("video");
    this.player.controls = this.options.controls;
    this.player.preload = this.options.preload;
    this.player.style.width = "100%";
    this.player.style.height = "100%";
    this.player.style.objectFit = "cover";

    this.container.appendChild(this.player);
  }

  async loadHLS(url) {
    console.log("Loading HLS from URL:", url);

    if (window.Hls && window.Hls.isSupported()) {
      console.log("Using HLS.js library");

      // Cleanup existing player
      if (this.hlsPlayer) {
        this.hlsPlayer.destroy();
      }

      this.hlsPlayer = new window.Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        autoStartLoad: !this.options.autoplay,
      });

      this.hlsPlayer.loadSource(url);
      this.hlsPlayer.attachMedia(this.player);

      this.hlsPlayer.on(window.Hls.Events.MANIFEST_PARSED, () => {
        console.log("HLS manifest parsed successfully");
        this.player.play().catch((e) => console.log("Play failed:", e));
      });

      this.hlsPlayer.on(window.Hls.Events.ERROR, (event, data) => {
        console.error("HLS error:", data);
        if (data.fatal) {
          switch (data.type) {
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Fatal network error, trying to recover...");
              this.hlsPlayer.startLoad();
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Fatal media error, trying to recover...");
              this.hlsPlayer.recoverMediaError();
              break;
            default:
              this.handleFatalError("HLS", data);
              break;
          }
        }
      });

      this.currentFormat = "hls";
    } else if (this.player.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      console.log("Using native HLS support");
      this.player.src = url;
      this.currentFormat = "hls";
    } else {
      throw new Error("HLS not supported in this browser");
    }
  }

  async loadDASH(url) {
    console.log("Loading DASH from URL:", url);

    if (window.dashjs) {
      // Cleanup existing player
      if (this.dashPlayer) {
        this.dashPlayer.reset();
      }

      this.dashPlayer = window.dashjs.MediaPlayer().create();

      // Configure for low latency first
      this.dashPlayer.updateSettings({
        streaming: {
          lowLatencyMode: true,
          liveDelay: 2,
          liveDelayFragmentCount: 1,
          liveDelayFragmentCountLimit: 2,
          liveDelayFragmentCountLimitUnit: "fragments",
          fastSwitchEnabled: true,
        },
        debug: {
          logLevel: window.dashjs.Debug.LOG_LEVEL_WARNING,
        },
      });

      this.dashPlayer.initialize(this.player, url, this.options.autoplay);

      this.dashPlayer.on(
        window.dashjs.MediaPlayer.events.STREAM_INITIALIZED,
        () => {
          console.log("DASH stream initialized successfully");
        }
      );

      this.dashPlayer.on(window.dashjs.MediaPlayer.events.ERROR, (e) => {
        console.error("DASH error:", e);
        // Try to continue despite errors
        if (e.error && e.error.code !== undefined) {
          console.log("DASH error code:", e.error.code);
        }
      });

      this.dashPlayer.on(
        window.dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED,
        () => {
          console.log("DASH playback metadata loaded");
        }
      );

      this.currentFormat = "dash";
    } else {
      throw new Error("DASH.js library not available");
    }
  }

  switchFormat(format, streamUrls) {
    if (format === this.currentFormat) return;

    const currentTime = this.player.currentTime;
    const wasPlaying = !this.player.paused;

    this.cleanup();

    if (format === "hls" && streamUrls.hls) {
      this.loadHLS(streamUrls.hls).then(() => {
        this.player.currentTime = currentTime;
        if (wasPlaying) this.player.play();
      });
    } else if (format === "dash" && streamUrls.dash) {
      this.loadDASH(streamUrls.dash).then(() => {
        this.player.currentTime = currentTime;
        if (wasPlaying) this.player.play();
      });
    }
  }

  handleFatalError(format, error) {
    console.error(`Fatal ${format} error:`, error);

    // Try to switch to the other format if available
    if (format === "hls" && this.options.fallbackToDash) {
      console.log("Attempting to fallback to DASH...");
      // Implementation would depend on having DASH URL available
    } else if (format === "dash" && this.options.fallbackToHLS) {
      console.log("Attempting to fallback to HLS...");
      // Implementation would depend on having HLS URL available
    }
  }

  cleanup() {
    if (this.hlsPlayer) {
      this.hlsPlayer.destroy();
      this.hlsPlayer = null;
    }

    if (this.dashPlayer) {
      this.dashPlayer.reset();
      this.dashPlayer = null;
    }
  }

  destroy() {
    this.cleanup();
    if (this.player) {
      this.player.remove();
      this.player = null;
    }
  }

  // Public API methods
  play() {
    return this.player.play();
  }

  pause() {
    this.player.pause();
  }

  getCurrentTime() {
    return this.player.currentTime;
  }

  getDuration() {
    return this.player.duration;
  }

  setVolume(volume) {
    this.player.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume() {
    return this.player.volume;
  }

  setMuted(muted) {
    this.player.muted = muted;
  }

  isMuted() {
    return this.player.muted;
  }

  getBuffered() {
    return this.player.buffered;
  }

  getPlaybackRate() {
    return this.player.playbackRate;
  }

  setPlaybackRate(rate) {
    this.player.playbackRate = rate;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = StreamingPlayer;
} else {
  window.StreamingPlayer = StreamingPlayer;
}
