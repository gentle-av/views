const PlayerManager = {
  currentFile: null,
  isPlaying: false,
  isFullscreen: false,
  playerActive: false,
  serverHost: window.location.hostname,
  serverPort: window.location.port,
  statusCheckInterval: null,
  initialized: false,
  playerAvailable: false,

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.setupEventListeners();
    this.playerAvailable = true;
    console.log("PlayerManager initialized");
  },

  getServerUrl() {
    return `http://${this.serverHost}:${this.serverPort}`;
  },

  async callApi(endpoint, data = {}) {
    try {
      const url = `${this.getServerUrl()}${endpoint}`;
      console.log("[PlayerManager] callApi:", url, data);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log("[PlayerManager] API response:", result);
      return result;
    } catch (error) {
      console.error(`API error ${endpoint}:`, error);
      return null;
    }
  },

  async playMedia(path) {
    console.log("playMedia called with path:", path);
    this.currentFile = path;
    this.playerActive = true;
    this.showControl();
    this.updateUI();
    const result = await this.callApi("/api/track", { track: path });
    console.log("API result:", result);
    if (!result || !result.success) {
      Utils.showNotification("Не удалось воспроизвести видео", "error");
      return;
    }
    Utils.showNotification(
      `Воспроизведение: ${path.split("/").pop()}`,
      "success",
    );
  },

  setupEventListeners() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    const seekForwardBtn = document.getElementById("seekForwardBtn");
    const seekBackwardBtn = document.getElementById("seekBackwardBtn");
    const closeFileBtn = document.getElementById("closeFileBtn");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    const closeControlPageBtn = document.getElementById("closeControlPage");
    const deleteFileBtn = document.getElementById("deleteFileBtn");
    if (playPauseBtn)
      playPauseBtn.addEventListener("click", () => this.togglePlayPause());
    if (seekForwardBtn)
      seekForwardBtn.addEventListener("click", () => this.seekForward());
    if (seekBackwardBtn)
      seekBackwardBtn.addEventListener("click", () => this.seekBackward());
    if (closeFileBtn)
      closeFileBtn.addEventListener("click", () => this.closeFile());
    if (fullscreenBtn)
      fullscreenBtn.addEventListener("click", () => this.toggleFullscreen());
    if (closeControlPageBtn)
      closeControlPageBtn.addEventListener("click", () => this.hideControl());
    if (deleteFileBtn)
      deleteFileBtn.addEventListener("click", () => this.deleteCurrentFile());
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  },

  async getPlaybackState() {
    const result = await this.callApi("/api/playbackState");
    if (result && result.success) {
      this.isPlaying = result.data.isPlaying;
      this.isFullscreen = result.data.isFullscreen || false;
      if (result.data.currentTrack) {
        this.currentFile = result.data.currentTrack;
        this.playerActive = true;
        this.showControl();
      } else {
        this.playerActive = false;
        this.hideControl();
      }
      this.updateUI();
      return result.data;
    }
    return null;
  },

  async togglePlayPause() {
    if (!this.playerActive) return;
    if (this.isPlaying) {
      await this.callApi("/api/pause");
    } else {
      await this.callApi("/api/play");
    }
    await this.getPlaybackState();
  },

  async toggleFullscreen() {
    if (!this.playerActive) return;
    await this.callApi("/api/fullscreen", {
      fullscreen: !this.isFullscreen,
    });
    await this.getPlaybackState();
  },

  async seekForward() {
    if (!this.playerActive) return;
    await this.callApi("/api/seekforward", { seconds: 10 });
    await this.getPlaybackState();
  },

  async seekBackward() {
    if (!this.playerActive) return;
    await this.callApi("/api/seekbackward", { seconds: 10 });
    await this.getPlaybackState();
  },

  async closeFile() {
    if (!this.playerActive) {
      this.hideControl();
      return;
    }
    await this.callApi("/api/stop");
    this.playerActive = false;
    this.currentFile = null;
    this.hideControl();
  },

  async deleteCurrentFile() {
    if (!this.currentFile) {
      this.hideControl();
      return;
    }
    const fileName = this.currentFile.split("/").pop();
    const confirmed = confirm(`Удалить файл "${fileName}"?`);
    if (!confirmed) return;
    try {
      const response = await fetch(`${this.getServerUrl()}/api/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: this.currentFile }),
      });
      const data = await response.json();
      if (data.success) {
        Utils.showNotification(
          `Файл "${fileName}" перемещен в корзину`,
          "success",
        );
        await this.closeFile();
        if (typeof VideoExplorer !== "undefined") {
          setTimeout(() => {
            VideoExplorer.loadDirectory(VideoExplorer.currentPath, false);
          }, 500);
        }
      } else {
        Utils.showNotification(
          data.error || data.message || "Ошибка при удалении файла",
          "error",
        );
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      Utils.showNotification(
        "Ошибка при удалении файла: " + error.message,
        "error",
      );
    }
  },

  showControl() {
    const panel = document.getElementById("playerControlPage");
    if (panel) {
      panel.style.display = "flex";
      panel.style.opacity = "1";
      panel.style.visibility = "visible";
    }
  },

  hideControl() {
    const panel = document.getElementById("playerControlPage");
    if (panel) {
      panel.style.display = "none";
    }
    this.playerActive = false;
    this.currentFile = null;
    this.isPlaying = false;
    const placeholder = document.querySelector(".player-placeholder");
    if (placeholder) {
      placeholder.innerHTML = `
        <i class="fas fa-play-circle"></i>
        <div>Видео воспроизводится</div>
        <div style="font-size: 1rem; margin-top: 20px; color: var(--fg3)">
          Используйте кнопки управления
        </div>
      `;
    }
  },

  updateUI() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    if (playPauseBtn) {
      playPauseBtn.innerHTML = this.isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    }
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    if (fullscreenBtn) {
      fullscreenBtn.innerHTML = this.isFullscreen
        ? '<i class="fas fa-compress"></i>'
        : '<i class="fas fa-expand"></i>';
    }
    const placeholder = document.querySelector(".player-placeholder");
    if (placeholder && this.currentFile) {
      const fileName = this.currentFile.split("/").pop();
      const statusText = this.isPlaying ? "Воспроизводится" : "На паузе";
      const statusIcon = this.isPlaying
        ? '<i class="fas fa-play-circle" style="color: var(--green); font-size: 60px;"></i>'
        : '<i class="fas fa-pause-circle" style="color: var(--orange); font-size: 60px;"></i>';
      placeholder.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center;"><div style="margin-bottom: 20px;">${statusIcon}</div><div style="font-size: 1.3rem; font-weight: 500; color: var(--fg0); margin-bottom: 10px; text-align: center; max-width: 80vw; word-break: break-word;">${this.escapeHtml(fileName)}</div><div style="font-size: 1rem; color: ${this.isPlaying ? "var(--green)" : "var(--orange)"}; margin-bottom: 5px;">${statusText}</div><div style="font-size: 0.9rem; color: var(--fg3);">Видео</div></div>`;
    }
  },

  handleKeyPress(e) {
    if (!this.playerActive) return;
    switch (e.code) {
      case "Space":
        e.preventDefault();
        this.togglePlayPause();
        break;
      case "ArrowLeft":
        e.preventDefault();
        this.seekBackward();
        break;
      case "ArrowRight":
        e.preventDefault();
        this.seekForward();
        break;
      case "KeyF":
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case "Escape":
        if (this.isFullscreen) this.toggleFullscreen();
        break;
    }
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
