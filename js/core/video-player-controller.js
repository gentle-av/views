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
    this._isDestroyed = false;
    this._currentVolume = 100;
    this._isMuted = false;
    this._volumePollInterval = null;
    this._currentOutput = "speakers";
    this._volumeUpHandler = null;
    this._volumeDownHandler = null;
    this._volumeMuteHandler = null;
    this._volumeSliderHandler = null;
    this._speakersHandler = null;
    this._headphonesHandler = null;
    this._bindEvents();
    this._initPanel();
    this._startProgressPolling();
    this._loadCurrentVolume();
    this._loadCurrentOutput();
    this._startVolumePolling();
  }

  destroy() {
    this._isDestroyed = true;
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
    if (this._volumePollInterval) {
      clearInterval(this._volumePollInterval);
      this._volumePollInterval = null;
    }
    if (this.panel) {
      this.panel.style.display = "none";
    }
    this.currentFile = null;
  }

  _initPanel() {
    this.panel = document.getElementById("playerControlPage");
    if (!this.panel) {
      const observer = new MutationObserver(() => {
        this.panel = document.getElementById("playerControlPage");
        if (this.panel && !this._isDestroyed) {
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

  async checkExistingPlayback() {
    if (this._isDestroyed) return false;
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
        await this._loadCurrentVolume();
        await this._loadCurrentOutput();
        this.show();
        return true;
      } else if (
        response.success &&
        !response.playing &&
        response.currentFile
      ) {
        this.currentFile = response.currentFile;
        this.isPlaying = false;
        this._updateFileInfo(this.currentFile);
        await this._loadCurrentVolume();
        await this._loadCurrentOutput();
        this.show();
        return true;
      }
    } catch (error) {
      console.error("Failed to check existing playback:", error);
    }
    return false;
  }

  _bindEvents() {
    this.events.on("playback:videoStart", (path) => this.startPlayback(path));
    this.events.on("playback:closeWindow", () => this.stop());
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
    const volumeUpBtn = document.getElementById("volumeUpBtn");
    const volumeDownBtn = document.getElementById("volumeDownBtn");
    const volumeMuteBtn = document.getElementById("volumeMuteBtn");
    const volumeSlider = document.getElementById("volumeSlider");
    if (volumeUpBtn) {
      if (this._volumeUpHandler)
        volumeUpBtn.removeEventListener("click", this._volumeUpHandler);
      this._volumeUpHandler = () => this.increaseVolume();
      volumeUpBtn.addEventListener("click", this._volumeUpHandler);
    }
    if (volumeDownBtn) {
      if (this._volumeDownHandler)
        volumeDownBtn.removeEventListener("click", this._volumeDownHandler);
      this._volumeDownHandler = () => this.decreaseVolume();
      volumeDownBtn.addEventListener("click", this._volumeDownHandler);
    }
    if (volumeMuteBtn) {
      if (this._volumeMuteHandler)
        volumeMuteBtn.removeEventListener("click", this._volumeMuteHandler);
      this._volumeMuteHandler = () => this.toggleMute();
      volumeMuteBtn.addEventListener("click", this._volumeMuteHandler);
    }
    if (volumeSlider) {
      if (this._volumeSliderHandler)
        volumeSlider.removeEventListener("click", this._volumeSliderHandler);
      this._volumeSliderHandler = (e) => this._handleVolumeSliderClick(e);
      volumeSlider.addEventListener("click", this._volumeSliderHandler);
    }
    const speakersBtn = document.getElementById("switchToSpeakersBtn");
    const headphonesBtn = document.getElementById("switchToHeadphonesBtn");
    if (speakersBtn) {
      if (this._speakersHandler)
        speakersBtn.removeEventListener("click", this._speakersHandler);
      this._speakersHandler = () => this.switchToSpeakers();
      speakersBtn.addEventListener("click", this._speakersHandler);
    }
    if (headphonesBtn) {
      if (this._headphonesHandler)
        headphonesBtn.removeEventListener("click", this._headphonesHandler);
      this._headphonesHandler = () => this.switchToHeadphones();
      headphonesBtn.addEventListener("click", this._headphonesHandler);
    }
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

  async _loadCurrentVolume() {
    try {
      const response = await this.api.get("/api/simple/volume");
      if (response.success && response.data) {
        if (response.data.volume !== undefined) {
          this._currentVolume = response.data.volume;
        }
        if (response.data.muted !== undefined) {
          this._isMuted = response.data.muted;
        }
        this._updateVolumeDisplay();
      }
    } catch (error) {
      console.error("Failed to load volume:", error);
    }
  }

  async _loadCurrentOutput() {
    try {
      const response = await this.api.get("/api/audio/output");
      if (response.success && response.data && response.data.current) {
        this._currentOutput = response.data.current;
        this._updateOutputButtons();
      }
    } catch (error) {
      console.error("Failed to load audio output:", error);
    }
  }

  _startVolumePolling() {
    if (this._volumePollInterval) clearInterval(this._volumePollInterval);
    this._volumePollInterval = setInterval(async () => {
      if (this._isDestroyed) return;
      try {
        const response = await this.api.get("/api/simple/volume");
        if (response.success && response.data) {
          let updated = false;
          if (
            response.data.volume !== undefined &&
            this._currentVolume !== response.data.volume
          ) {
            this._currentVolume = response.data.volume;
            updated = true;
          }
          if (
            response.data.muted !== undefined &&
            this._isMuted !== response.data.muted
          ) {
            this._isMuted = response.data.muted;
            updated = true;
          }
          if (updated) {
            this._updateVolumeDisplay();
          }
        }
        const outputResponse = await this.api.get("/api/audio/output");
        if (
          outputResponse.success &&
          outputResponse.data &&
          outputResponse.data.current !== this._currentOutput
        ) {
          this._currentOutput = outputResponse.data.current;
          this._updateOutputButtons();
        }
      } catch (error) {
        console.error("Failed to poll volume:", error);
      }
    }, 2000);
  }

  _updateVolumeDisplay() {
    const volumeValueSpan = document.getElementById("volumeValue");
    const volumeFill = document.getElementById("volumeFill");
    const volumeMuteBtn = document.getElementById("volumeMuteBtn");
    if (volumeValueSpan) {
      volumeValueSpan.textContent = this._isMuted
        ? "0%"
        : `${this._currentVolume}%`;
    }
    if (volumeFill) {
      const percent = this._isMuted ? 0 : this._currentVolume;
      volumeFill.style.width = `${percent}%`;
      volumeFill.classList.remove("animate");
      void volumeFill.offsetWidth;
      volumeFill.classList.add("animate");
    }
    if (volumeMuteBtn) {
      const icon = volumeMuteBtn.querySelector("i");
      if (this._isMuted || this._currentVolume === 0) {
        icon.className = "fas fa-volume-mute";
        volumeMuteBtn.title = "Включить звук";
        volumeMuteBtn.classList.add("muted");
      } else if (this._currentVolume < 30) {
        icon.className = "fas fa-volume-off";
        volumeMuteBtn.title = "Выключить звук";
        volumeMuteBtn.classList.remove("muted");
      } else if (this._currentVolume < 70) {
        icon.className = "fas fa-volume-down";
        volumeMuteBtn.title = "Выключить звук";
        volumeMuteBtn.classList.remove("muted");
      } else {
        icon.className = "fas fa-volume-up";
        volumeMuteBtn.title = "Выключить звук";
        volumeMuteBtn.classList.remove("muted");
      }
    }
  }

  _updateOutputButtons() {
    const speakersBtn = document.getElementById("switchToSpeakersBtn");
    const headphonesBtn = document.getElementById("switchToHeadphonesBtn");
    if (speakersBtn) {
      if (this._currentOutput === "speakers") {
        speakersBtn.classList.add("active");
      } else {
        speakersBtn.classList.remove("active");
      }
    }
    if (headphonesBtn) {
      if (this._currentOutput === "headphones") {
        headphonesBtn.classList.add("active");
      } else {
        headphonesBtn.classList.remove("active");
      }
    }
  }

  _handleVolumeSliderClick(e) {
    const slider = document.getElementById("volumeSlider");
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const percent = Math.min(
      100,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * 100),
    );
    const volume = Math.round(percent);
    this.setVolume(volume);
  }

  async setVolume(volume) {
    if (volume < 0) volume = 0;
    if (volume > 100) volume = 100;
    try {
      const response = await this.api.post("/api/simple/volume", {
        volume: volume,
      });
      if (
        response.success &&
        response.data &&
        response.data.volume !== undefined
      ) {
        this._currentVolume = response.data.volume;
        if (this._currentVolume > 0 && this._isMuted) {
          this._isMuted = false;
        }
        this._updateVolumeDisplay();
      }
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  }

  async increaseVolume() {
    try {
      const response = await this.api.post("/api/simple/volume/increase", {
        delta: 5,
      });
      if (response.success && response.data) {
        if (response.data.volume !== undefined) {
          this._currentVolume = response.data.volume;
        }
        this._isMuted = false;
        this._updateVolumeDisplay();
      }
    } catch (error) {
      console.error("Failed to increase volume:", error);
    }
  }

  async decreaseVolume() {
    try {
      const response = await this.api.post("/api/simple/volume/decrease", {
        delta: 5,
      });
      if (response.success && response.data) {
        if (response.data.volume !== undefined) {
          this._currentVolume = response.data.volume;
        }
        this._isMuted = this._currentVolume === 0;
        this._updateVolumeDisplay();
      }
    } catch (error) {
      console.error("Failed to decrease volume:", error);
    }
  }

  async toggleMute() {
    const btn = document.getElementById("volumeMuteBtn");
    if (btn) {
      btn.classList.add("animate-pop");
      setTimeout(() => btn.classList.remove("animate-pop"), 300);
    }
    try {
      const response = await this.api.post("/api/simple/volume/mute");
      if (response.success && response.data) {
        if (response.data.muted !== undefined) {
          this._isMuted = response.data.muted;
        }
        if (response.data.volume !== undefined) {
          this._currentVolume = response.data.volume;
        }
        this._updateVolumeDisplay();
      }
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  }

  async switchToSpeakers() {
    try {
      const response = await this.api.post("/api/audio/output/speakers");
      if (response.success) {
        this._currentOutput = "speakers";
        this._updateOutputButtons();
        const btn = document.getElementById("switchToSpeakersBtn");
        if (btn) {
          btn.classList.add("animate-switch");
          setTimeout(() => btn.classList.remove("animate-switch"), 300);
        }
      }
    } catch (error) {
      console.error("Failed to switch to speakers:", error);
    }
  }

  async switchToHeadphones() {
    try {
      const response = await this.api.post("/api/audio/output/headphones");
      if (response.success) {
        this._currentOutput = "headphones";
        this._updateOutputButtons();
        const btn = document.getElementById("switchToHeadphonesBtn");
        if (btn) {
          btn.classList.add("animate-switch");
          setTimeout(() => btn.classList.remove("animate-switch"), 300);
        }
      }
    } catch (error) {
      console.error("Failed to switch to headphones:", error);
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
      if (this._isDestroyed) return;
      try {
        const response = await this.api.get("/api/video/status");
        if (response.success && response.playing) {
          this.isPlaying = !response.paused;
          this._currentTime = response.currentTime || 0;
          this._duration = response.duration || 0;
          this._updateProgressBar(this._currentTime, this._duration);
          this._updateTimeDisplay(this._currentTime, this._duration);
          this._updatePlayPauseButton();
          this.events.emit(
            "playback:timeUpdate",
            this._currentTime,
            this._duration,
          );
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
    try {
      await this.api.post("/api/video/close");
    } catch (error) {
      console.error("Failed to close video:", error);
    }
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

  async closeAndDelete() {
    const filePath = this.currentFile;
    if (!filePath) {
      console.error("No current file to delete");
      return;
    }
    const fileName = filePath.split("/").pop();
    const confirmed = await CustomDeleteDialogInstance.showConfirm(
      fileName,
      false,
    );
    if (confirmed) {
      CustomDeleteDialogInstance.close();
      try {
        await this.api.post("/api/video/close");
      } catch (error) {
        console.error("Failed to close video:", error);
      }
      if (this._progressInterval) {
        clearInterval(this._progressInterval);
        this._progressInterval = null;
      }
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
      this.api.post("/api/trash", { path: filePath });
      this.currentFile = null;
      this.isPlaying = false;
      this._duration = 0;
      this._currentTime = 0;
      this.events.emit("video:refresh");
    }
  }

  show() {
    if (this.panel) {
      this.panel.style.display = "flex";
      this.panel.classList.add("active");
    }
  }

  hide() {
    if (this.panel) {
      this.panel.style.display = "none";
      this.panel.classList.remove("active");
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
