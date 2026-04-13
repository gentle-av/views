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
    await this.checkActiveVideo();
  },
  getServerUrl() {
    return `http://${this.serverHost}:${this.serverPort}`;
  },
  async callApi(endpoint, data = {}) {
    try {
      const url = `${this.getServerUrl()}${endpoint}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
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
    this.isPlaying = true;
    this.showControl();
    this.updateUI();
    const response = await fetch(`${this.getServerUrl()}/api/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: path }),
    });
    const data = await response.json();
    if (data.success) {
      this.mpvSocket = data.socket;
      Utils.showNotification(
        `Воспроизведение: ${path.split("/").pop()}`,
        "success",
      );
    } else {
      Utils.showNotification("Не удалось воспроизвести видео", "error");
      this.isPlaying = false;
      this.updateUI();
    }
  },
  async sendMpvCommand(command) {
    if (!this.mpvSocket) return;
    await fetch(`${this.getServerUrl()}/api/mpv/control`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socket: this.mpvSocket, command: command }),
    });
  },
  async checkActiveVideo() {
    try {
      const response = await fetch(`${this.getServerUrl()}/api/mpv/active`);
      const data = await response.json();
      if (data.success && data.active) {
        this.mpvSocket = data.socket;
        this.currentFile = data.path;
        this.playerActive = true;
        this.isPlaying = true;
        this.showControl();
        this.updateUI();
        console.log("Active video restored:", data.path);
      }
    } catch (error) {
      console.error("Error checking active video:", error);
    }
  },
  setupEventListeners() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    const seekForwardBtn = document.getElementById("seekForwardBtn");
    const seekBackwardBtn = document.getElementById("seekBackwardBtn");
    const closeFileBtn = document.getElementById("closeFileBtn");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
    const closeControlPageBtn = document.getElementById("closeControlPage");
    const deleteFileBtn = document.getElementById("deleteFileBtn");
    if (playPauseBtn) {
      playPauseBtn.removeEventListener("click", this._playPauseHandler);
      this._playPauseHandler = () => this.togglePlayPause();
      playPauseBtn.addEventListener("click", this._playPauseHandler);
    }
    if (seekForwardBtn) {
      seekForwardBtn.removeEventListener("click", this._seekForwardHandler);
      this._seekForwardHandler = () => this.seekForward();
      seekForwardBtn.addEventListener("click", this._seekForwardHandler);
    }
    if (seekBackwardBtn) {
      seekBackwardBtn.removeEventListener("click", this._seekBackwardHandler);
      this._seekBackwardHandler = () => this.seekBackward();
      seekBackwardBtn.addEventListener("click", this._seekBackwardHandler);
    }
    if (closeFileBtn) {
      closeFileBtn.removeEventListener("click", this._closeFileHandler);
      this._closeFileHandler = () => this.closeFile();
      closeFileBtn.addEventListener("click", this._closeFileHandler);
    }
    if (fullscreenBtn) {
      fullscreenBtn.removeEventListener("click", this._fullscreenHandler);
      this._fullscreenHandler = () => this.toggleFullscreen();
      fullscreenBtn.addEventListener("click", this._fullscreenHandler);
    }
    if (closeControlPageBtn) {
      closeControlPageBtn.removeEventListener(
        "click",
        this._closeControlHandler,
      );
      this._closeControlHandler = () => this.hideControl();
      closeControlPageBtn.addEventListener("click", this._closeControlHandler);
    }
    if (deleteFileBtn) {
      deleteFileBtn.removeEventListener("click", this._deleteFileHandler);
      this._deleteFileHandler = () => this.deleteCurrentFile();
      deleteFileBtn.addEventListener("click", this._deleteFileHandler);
    }
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  },
  async togglePlayPause() {
    if (!this.playerActive) return;
    if (this.isPlaying) {
      await this.sendMpvCommand("set pause yes");
      this.isPlaying = false;
    } else {
      await this.sendMpvCommand("set pause no");
      this.isPlaying = true;
    }
    this.updateUI();
  },
  async closeFile() {
    if (!this.playerActive) {
      this.hideControl();
      return;
    }
    try {
      await fetch(`${this.getServerUrl()}/api/mpv/kill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socket: this.mpvSocket || "" }),
      });
    } catch (e) {
      console.log("Kill error:", e);
    }
    this.playerActive = false;
    this.currentFile = null;
    this.isPlaying = false;
    this.mpvSocket = null;
    this.hideControl();
  },
  async toggleFullscreen() {
    if (!this.playerActive) return;
    await this.sendMpvCommand("cycle fullscreen");
    this.isFullscreen = !this.isFullscreen;
    this.updateUI();
  },
  async seekForward() {
    if (!this.playerActive) return;
    await this.sendMpvCommand("seek 10");
  },
  async seekBackward() {
    if (!this.playerActive) return;
    await this.sendMpvCommand("seek -10");
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
      <div>Выберите видео для воспроизведения</div>
      <div style="font-size: 1rem; margin-top: 20px; color: var(--fg3)">
        Нажмите на файл для просмотра
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
