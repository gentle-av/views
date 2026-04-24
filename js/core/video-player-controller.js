class VideoPlayerController {
  constructor(apiClient, events) {
    this.api = apiClient;
    this.events = events;
    this.currentFile = null;
    this.isPlaying = false;
    this.isFullscreen = false;
    this.panel = null;
    this._isStarting = false;
    this._progressInterval = null;
    this._bindEvents();
    this._initPanel();
    this._restorePlaybackOnLoad();
  }

  _initPanel() {
    this.panel = document.getElementById("playerControlPage");
    if (!this.panel) {
      const observer = new MutationObserver(() => {
        this.panel = document.getElementById("playerControlPage");
        if (this.panel) {
          this._bindUIEvents();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 5000);
    } else {
      this._bindUIEvents();
    }
  }

  _bindEvents() {
    this.events.on("playback:videoStart", (path) => this.startPlayback(path));
    this.events.on("player:show", () => this.show());
    this.events.on("player:hide", () => this.hide());
  }

  _bindUIEvents() {
    if (this._uiBound) return;
    this._uiBound = true;
    document
      .getElementById("playPauseBtn")
      ?.addEventListener("click", () => this.togglePlayPause());
    document
      .getElementById("seekForwardBtn")
      ?.addEventListener("click", () => this.seek(10));
    document
      .getElementById("seekBackwardBtn")
      ?.addEventListener("click", () => this.seek(-10));
    document
      .getElementById("fullscreenBtn")
      ?.addEventListener("click", () => this.toggleFullscreen());
    document
      .getElementById("closeFileBtn")
      ?.addEventListener("click", () => this.stop());
    document
      .getElementById("deleteFileBtn")
      ?.addEventListener("click", () => this.deleteCurrentFile());
    document
      .getElementById("closeControlPage")
      ?.addEventListener("click", () => this.hide());
    const progressBar = document.getElementById("videoProgressBar");
    if (progressBar) {
      progressBar.addEventListener("click", (e) => this._seekFromClick(e));
    }
  }

  async startPlayback(path) {
    console.log(
      "startPlayback called, _isStarting:",
      this._isStarting,
      "path:",
      path,
    );
    if (!this.panel) {
      this.panel = document.getElementById("playerControlPage");
    }
    if (!this.panel) {
      console.error("Player control panel not found");
      return;
    }
    if (this._isStarting) {
      console.log("Already starting playback, ignoring");
      return;
    }
    if (this.currentFile === path && this.panel.style.display === "flex") {
      console.log("Already playing this file, ignoring");
      return;
    }
    console.log("startPlayback proceeding...");
    this._isStarting = true;
    try {
      this.currentFile = path;
      this.show();
      this._updateFileInfo(path);
      const response = await this.api.post("/api/open", { path });
      if (response.success) {
        this.isPlaying = true;
        this._startProgressPolling();
        this._saveCurrentState();
      } else {
        this.hide();
      }
      this._updateUI();
    } finally {
      setTimeout(() => {
        this._isStarting = false;
        console.log("_isStarting reset to false");
      }, 500);
    }
  }

  _updateFileInfo(path) {
    const fileName = path.split("/").pop();
    const fileNameEl = document.getElementById("videoFileName");
    if (fileNameEl) {
      fileNameEl.textContent = this._escape(fileName);
    }
  }

  async _startProgressPolling() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
    }
    let lastTime = 0;
    let stuckCount = 0;
    let zeroDurationCount = 0;
    this._progressInterval = setInterval(async () => {
      if (!this.currentFile) return;
      try {
        const response = await this.api.get("/api/video/status");
        console.log("Polling response:", {
          playing: response.playing,
          currentTime: response.currentTime,
          duration: response.duration,
          paused: response.paused,
          reason: response.reason,
        });
        if (
          response.duration === 0 &&
          response.currentTime === 0 &&
          response.playing
        ) {
          zeroDurationCount++;
          console.log("Zero duration detected, count:", zeroDurationCount);
          if (zeroDurationCount >= 3) {
            console.log("Video finished (zero duration)");
            await this.stop();
          }
          return;
        } else {
          zeroDurationCount = 0;
        }
        if (response.success && response.playing) {
          this.isPlaying = !response.paused;
          this._updateProgressBar(response.currentTime, response.duration);
          this._updateTimeDisplay(response.currentTime, response.duration);
          this._updatePlayPauseButton();
          this._saveCurrentState();
          if (response.duration > 0) {
            if (response.currentTime >= response.duration - 1) {
              console.log("Video finished (reached end)");
              await this.stop();
            } else if (
              lastTime === response.currentTime &&
              response.currentTime > 0 &&
              !response.paused
            ) {
              stuckCount++;
              console.log(
                "Video stuck at:",
                response.currentTime,
                "stuckCount:",
                stuckCount,
              );
              if (stuckCount >= 3) {
                console.log("Video finished (stuck at same position)");
                await this.stop();
              }
            } else {
              stuckCount = 0;
              lastTime = response.currentTime;
            }
          }
        } else if (!response.playing && this.currentFile) {
          console.log("Video not playing, reason:", response.reason);
          if (response.reason === "process_dead") {
            this.stop();
          } else if (!response.playing && response.currentTime === undefined) {
            await this.stop();
          }
        }
      } catch (error) {
        console.error("Failed to get video status:", error);
      }
    }, 500);
  }

  _updateProgressBar(currentTime, duration) {
    const progressFill = document.getElementById("videoProgressFill");
    if (progressFill && duration > 0) {
      const percent = (currentTime / duration) * 100;
      progressFill.style.width = `${percent}%`;
    }
  }

  _updateTimeDisplay(currentTime, duration) {
    const currentTimeEl = document.getElementById("videoCurrentTime");
    const durationEl = document.getElementById("videoDuration");
    if (currentTimeEl) {
      currentTimeEl.textContent = this._formatTime(currentTime);
    }
    if (durationEl && duration > 0) {
      durationEl.textContent = this._formatTime(duration);
    }
  }

  _updatePlayPauseButton() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) {
      playPauseBtn.innerHTML = this.isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    }
  }

  async _seekFromClick(e) {
    const progressBar = document.getElementById("videoProgressBar");
    if (!progressBar) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    try {
      const response = await this.api.get("/api/video/status");
      if (response.success && response.duration > 0) {
        const seekTime = response.duration * percent;
        await this.seekTo(seekTime);
      }
    } catch (error) {
      console.error("Failed to seek:", error);
    }
  }

  async seekTo(time) {
    await this.api.post("/api/mpv/control", {
      command: `seek ${time} absolute`,
    });
  }

  async togglePlayPause() {
    await this.api.post("/api/mpv/control", {
      command: this.isPlaying ? "set pause yes" : "set pause no",
    });
    this.isPlaying = !this.isPlaying;
    this._updateUI();
  }

  async seek(seconds) {
    await this.api.post("/api/mpv/control", { command: `seek ${seconds}` });
  }

  async toggleFullscreen() {
    await this.api.post("/api/mpv/control", { command: "cycle fullscreen" });
    this.isFullscreen = !this.isFullscreen;
    this._updateUI();
  }

  async deleteCurrentFile() {
    if (!this.currentFile) return;
    const confirmed = await CustomDeleteDialogInstance.showConfirm(
      this.currentFile.split("/").pop(),
      false,
    );
    if (confirmed) {
      await this.api.post("/api/trash", { path: this.currentFile });
      await this.stop();
      this.events.emit("video:refresh");
    }
  }

  show() {
    if (this.panel) this.panel.style.display = "flex";
  }

  async stop() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
    await this.api.post("/api/mpv/control", { command: "stop" });
    this.currentFile = null;
    this.isPlaying = false;
    this.hide();
    localStorage.removeItem("currentPlayingVideo");
    this.events.emit("playback:videoStopped");
  }

  hide() {
    if (this.panel) this.panel.style.display = "none";
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
    localStorage.removeItem("currentPlayingVideo");
  }

  _updateUI() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) {
      playPauseBtn.innerHTML = this.isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    }
    const placeholder = document.querySelector(".player-placeholder");
    if (placeholder && this.currentFile) {
      placeholder.innerHTML = `
        <i class="fas fa-${this.isPlaying ? "play" : "pause"}-circle" style="font-size: 60px; color: var(--yellow);"></i>
        <div>${this._escape(this.currentFile.split("/").pop())}</div>
        <div style="font-size: 0.9rem; color: var(--fg3);">${this.isPlaying ? "Воспроизводится" : "На паузе"}</div>
      `;
    }
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  _escape(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  _saveCurrentState() {
    if (this.currentFile && this.panel && this.panel.style.display === "flex") {
      const currentTimeEl = document.getElementById("videoCurrentTime");
      let currentTime = 0;
      if (currentTimeEl && currentTimeEl.textContent) {
        const timeStr = currentTimeEl.textContent;
        const parts = timeStr.split(":");
        if (parts.length === 2) {
          currentTime = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        } else if (parts.length === 3) {
          currentTime =
            parseInt(parts[0]) * 3600 +
            parseInt(parts[1]) * 60 +
            parseInt(parts[2]);
        }
      }
      const videoData = {
        url: this.currentFile,
        currentTime: currentTime,
        isPlaying: this.isPlaying,
        name: this.currentFile.split("/").pop(),
        timestamp: Date.now(),
      };
      localStorage.setItem("currentPlayingVideo", JSON.stringify(videoData));
    }
  }

  async _restorePlaybackOnLoad() {
    console.log("=== _restorePlaybackOnLoad START ===");
    try {
      console.log("Fetching /api/video/status...");
      const statusResponse = await this.api.get("/api/video/status");
      console.log("Status response:", statusResponse);
      if (
        statusResponse.success &&
        statusResponse.playing &&
        statusResponse.currentFile
      ) {
        console.log(
          "Video is already running, restoring UI:",
          statusResponse.currentFile,
        );
        this.currentFile = statusResponse.currentFile;
        this.isPlaying = !statusResponse.paused;
        this.show();
        this._updateFileInfo(this.currentFile);
        this._updateProgressBar(
          statusResponse.currentTime,
          statusResponse.duration,
        );
        this._updateTimeDisplay(
          statusResponse.currentTime,
          statusResponse.duration,
        );
        this._updatePlayPauseButton();
        this._updateUI();
        this._startProgressPolling();
        console.log("=== _restorePlaybackOnLoad END (from server) ===");
        return;
      }
    } catch (error) {
      console.error("Failed to get video status:", error);
    }
    console.log("No running video on server, clearing localStorage");
    localStorage.removeItem("currentPlayingVideo");
    console.log("=== _restorePlaybackOnLoad END ===");
  }
}
