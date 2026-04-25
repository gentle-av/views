class VideoPlayerController {
  constructor(apiClient, events) {
    this.api = apiClient;
    this.events = events;
    this.currentFile = null;
    this.isPlaying = false;
    this.isFullscreen = false;
    this.panel = null;
    this._progressInterval = null;
    this._duration = 0;
    this._currentTime = 0;
    this._bindEvents();
    this._initPanel();
    this._startProgressPolling();
    setTimeout(() => this._checkExistingPlayback(), 1000);
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

  async _checkExistingPlayback() {
    try {
      const response = await this.api.get("/api/video/status");
      if (response.success && response.playing && response.currentFile) {
        this.currentFile = response.currentFile;
        this.isPlaying = !response.paused;
        this._currentTime = response.currentTime || 0;
        this._duration = response.duration || 0;
        this._updateFileInfo(this.currentFile);
        this._updateProgressBar(this._currentTime, this._duration);
        this._updateTimeDisplay(this._currentTime, this._duration);
        this._updatePlayPauseButton();
        this._loadVideoPreview(this.currentFile);
        this.show();
      }
    } catch (error) {
      console.error("Failed to check existing playback:", error);
    }
  }

  _bindEvents() {
    this.events.on("playback:videoStart", (path) => this.startPlayback(path));
    this.events.on("page:videoLoaded", () => this._checkExistingPlayback());
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
      ?.addEventListener("click", () => this.closeAndDelete());
    document
      .getElementById("closeControlPage")
      ?.addEventListener("click", () => this.hide());
    const progressBar = document.getElementById("videoProgressBar");
    if (progressBar) {
      progressBar.addEventListener("click", (e) =>
        this._handleProgressBarClick(e),
      );
      progressBar.addEventListener("mousemove", (e) =>
        this._handleProgressBarHover(e),
      );
      progressBar.addEventListener("mouseleave", () =>
        this._hideProgressHover(),
      );
    }
  }

  async startPlayback(path) {
    if (!this.panel) {
      this.panel = document.getElementById("playerControlPage");
    }
    if (!this.panel) {
      console.error("Player control panel not found");
      return;
    }
    if (this.currentFile === path && this.panel.style.display === "flex") {
      return;
    }
    try {
      this.currentFile = path;
      console.log("Saved currentFile:", this.currentFile);
      this._updateFileInfo(path);
      await this._loadVideoPreview(path);
      this._updateProgressBar(0, 0);
      this._updateTimeDisplay(0, 0);
      const response = await this.api.post("/api/open", { path });
      if (response.success) {
        this.isPlaying = true;
        this.show();
        setTimeout(() => {
          this._startProgressPolling();
        }, 500);
      } else {
        console.error("Failed to open video:", response.error);
      }
      this._updateUI();
    } catch (error) {
      console.error("Start playback error:", error);
    }
  }

  _updateFileInfo(path) {
    const fileName = path.split("/").pop();
    const fileNameEl = document.getElementById("videoFileName");
    if (fileNameEl) {
      fileNameEl.textContent = this._escape(fileName);
    }
  }

  _startProgressPolling() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
    }
    this._progressInterval = setInterval(async () => {
      if (!this.currentFile) return;
      try {
        const response = await this.api.get("/api/video/status");
        if (response.success && response.playing) {
          this.isPlaying = !response.paused;
          this._currentTime = response.currentTime || 0;
          this._duration = response.duration || 0;
          this._updateProgressBar(this._currentTime, this._duration);
          this._updateTimeDisplay(this._currentTime, this._duration);
          this._updatePlayPauseButton();
        } else if (response.success && !response.playing && this.currentFile) {
          if (response.reason === "process_dead") {
            this.stop();
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
      progressFill.style.width = `${(currentTime / duration) * 100}%`;
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
    } else if (durationEl) {
      durationEl.textContent = "0:00";
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

  async _handleProgressBarClick(e) {
    const progressBar = document.getElementById("videoProgressBar");
    if (!progressBar || this._duration === 0) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = this._duration * percent;
    await this.seekTo(seekTime);
  }

  async _handleProgressBarHover(e) {
    const progressBar = document.getElementById("videoProgressBar");
    const hoverFill = document.getElementById("videoProgressHover");
    if (!progressBar || !hoverFill || this._duration === 0) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    hoverFill.style.width = `${percent * 100}%`;
    const hoverTime = this._duration * percent;
    let timeTooltip = document.getElementById("videoProgressTooltip");
    if (!timeTooltip) {
      timeTooltip = document.createElement("div");
      timeTooltip.id = "videoProgressTooltip";
      timeTooltip.className = "video-progress-tooltip";
      progressBar.parentElement.appendChild(timeTooltip);
    }
    timeTooltip.textContent = this._formatTime(hoverTime);
    timeTooltip.style.left = `${e.clientX - rect.left - 25}px`;
    timeTooltip.style.display = "block";
  }

  _hideProgressHover() {
    const hoverFill = document.getElementById("videoProgressHover");
    const timeTooltip = document.getElementById("videoProgressTooltip");
    if (hoverFill) hoverFill.style.width = "0%";
    if (timeTooltip) timeTooltip.style.display = "none";
  }

  async seekTo(time) {
    try {
      const response = await this.api.post("/api/mpv/seek", { time: time });
      if (response.success) {
        this._currentTime = response.time;
        this._updateProgressBar(this._currentTime, this._duration);
        this._updateTimeDisplay(this._currentTime, this._duration);
      }
    } catch (error) {
      console.error("Seek request failed:", error);
    }
  }

  async togglePlayPause() {
    const command = this.isPlaying ? "pause" : "play";
    await this.api.post("/api/mpv/control", { command: command });
    this.isPlaying = !this.isPlaying;
    this._updatePlayPauseButton();
  }

  async seek(seconds) {
    const newTime = Math.max(
      0,
      Math.min(this._duration, this._currentTime + seconds),
    );
    await this.seekTo(newTime);
  }

  async toggleFullscreen() {
    await this.api.post("/api/mpv/control", { command: "fullscreen" });
    this.isFullscreen = !this.isFullscreen;
  }

  async stop() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
    await this.api.post("/api/mpv/control", { command: "stop" });
    this.currentFile = null;
    this.isPlaying = false;
    this._duration = 0;
    this._currentTime = 0;
    const previewImg = document.getElementById("videoPreviewImg");
    const previewPlaceholder = document.getElementById(
      "videoPreviewPlaceholder",
    );
    if (previewImg) {
      previewImg.src = "";
      previewImg.style.display = "none";
    }
    if (previewPlaceholder) {
      previewPlaceholder.style.display = "flex";
    }
    this.hide();
    this.events.emit("playback:videoStopped");
  }

  async deleteCurrentFile() {
    const filePath = this.currentFile;
    if (!filePath) {
      console.error("No current file to delete");
      return;
    }
    const fileName = filePath.split("/").pop();
    console.log("Deleting file, saved path:", filePath);
    const confirmed = await CustomDeleteDialogInstance.showConfirm(
      fileName,
      false,
    );
    if (confirmed) {
      CustomDeleteDialogInstance.close();
      await this.stop();
      const response = await this.api.post("/api/trash", { path: filePath });
      console.log("Trash response:", response);
      if (response.success) {
        Utils.showNotification(
          `Файл "${fileName}" отправлен в корзину`,
          "success",
        );
      } else {
        Utils.showNotification(response.error || "Ошибка удаления", "error");
      }
      this.events.emit("video:refresh");
    }
  }

  async closeAndDelete() {
    const filePath = this.currentFile;
    if (!filePath) {
      console.error("No current file to delete");
      return;
    }
    const fileName = filePath.split("/").pop();
    console.log("Closing and deleting video, saved path:", filePath);
    const confirmed = await CustomDeleteDialogInstance.showConfirm(
      fileName,
      false,
    );
    if (confirmed) {
      CustomDeleteDialogInstance.close();
      await this.stop();
      const response = await this.api.post("/api/trash", { path: filePath });
      if (response.success) {
        Utils.showNotification(
          `Видео "${fileName}" закрыто и отправлено в корзину`,
          "success",
        );
      } else {
        Utils.showNotification(response.error || "Ошибка удаления", "error");
      }
      this.events.emit("video:refresh");
    }
  }

  show() {
    if (this.panel) {
      this.panel.style.display = "flex";
      this.panel.classList.add("active");
      console.log("Player panel shown");
    }
  }

  hide() {
    if (this.panel) {
      this.panel.style.display = "none";
      this.panel.classList.remove("active");
      console.log("Player panel hidden");
    }
  }

  _updateUI() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) {
      playPauseBtn.innerHTML = this.isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
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
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async _loadVideoPreview(path) {
    const previewImg = document.getElementById("videoPreviewImg");
    const previewPlaceholder = document.getElementById(
      "videoPreviewPlaceholder",
    );
    if (!previewImg || !previewPlaceholder) return;
    previewImg.style.display = "none";
    previewPlaceholder.style.display = "flex";
    try {
      const thumbnailUrl = `/api/thumbnail?path=${encodeURIComponent(path)}`;
      const response = await fetch(thumbnailUrl);
      const data = await response.json();
      if (data.success && data.thumbnail) {
        previewImg.src = data.thumbnail;
        previewImg.style.display = "block";
        previewPlaceholder.style.display = "none";
      }
    } catch (error) {
      console.error("Failed to load video preview:", error);
    }
  }
}
