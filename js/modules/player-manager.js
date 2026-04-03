// player-manager.js - упрощенная версия
const PlayerManager = {
  currentFile: null,
  isPlaying: false,
  isFullscreen: false,
  playerActive: false,
  serverHost: window.location.hostname,
  serverPort: window.location.port,
  statusCheckInterval: null,
  initialized: false,

  init() {
    if (this.initialized) return;
    this.initialized = true;
    this.setupEventListeners();
    this.startStatusPolling();
    console.log("PlayerManager initialized");
  },

  getPlayerUrl() {
    return `http://${this.serverHost}:8082`;
  },

  getServerUrl() {
    return `http://${this.serverHost}:${this.serverPort}`;
  },

  setupEventListeners() {
    const playPauseBtn = document.getElementById("playPauseBtn");
    const seekForwardBtn = document.getElementById("seekForwardBtn");
    const seekBackwardBtn = document.getElementById("seekBackwardBtn");
    const closeFileBtn = document.getElementById("closeFileBtn");
    const fullscreenBtn = document.getElementById("fullscreenBtn");
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
    document.addEventListener("keydown", (e) => this.handleKeyPress(e));
  },

  async callApi(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.getPlayerUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (error) {
      console.error(`API error ${endpoint}:`, error);
      return null;
    }
  },

  async getPlaybackState() {
    const result = await this.callApi("/api/playbackState");
    if (result && result.success) {
      this.isPlaying = result.data.isPlaying;
      this.isFullscreen = result.data.isFullScreen;
      if (result.data.hasTrack && result.data.currentPath) {
        this.currentFile = result.data.currentPath;
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

  async playMedia(path) {
    console.log("playMedia called with path:", path);
    const launchResult = await this.launchPlayerWithFile(path);
    if (!launchResult) {
      Utils.showNotification("Не удалось запустить плеер", "error");
      return;
    }
    const started = await this.waitForPlayerReady(10000);
    if (!started) {
      Utils.showNotification("Плеер не запустился", "error");
      return;
    }
    const openResult = await this.openFileInPlayer(path);
    if (openResult && openResult.success) {
      this.playerActive = true;
      this.currentFile = path;
      await this.delay(1000);
      await this.getPlaybackState();
      Utils.showNotification(
        `Воспроизведение: ${path.split("/").pop()}`,
        "success",
      );
    }
  },

  async launchPlayerWithFile(path) {
    try {
      const response = await fetch(`${this.getServerUrl()}/api/open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path }),
      });
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error("Error launching player:", error);
      return false;
    }
  },

  async openFileInPlayer(path) {
    try {
      const response = await fetch(`${this.getPlayerUrl()}/api/openfile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path }),
      });
      return await response.json();
    } catch (error) {
      console.error("Error opening file:", error);
      return null;
    }
  },

  async checkPlayerReady() {
    const result = await this.callApi("/api/playbackState");
    return result && result.success && result.data;
  },

  async waitForPlayerReady(timeoutMs) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const isReady = await this.checkPlayerReady();
      if (isReady) {
        await this.delay(500);
        return true;
      }
      await this.delay(1000);
    }
    return false;
  },

  async togglePlayPause() {
    if (!this.playerActive) return;
    const result = await this.callApi("/api/playpause");
    if (result && result.success) await this.getPlaybackState();
  },

  async toggleFullscreen() {
    if (!this.playerActive) return;
    const result = await this.callApi("/api/fullscreen", {
      fullscreen: !this.isFullscreen,
    });
    if (result && result.success) await this.getPlaybackState();
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
    await this.callApi("/api/close");
    this.playerActive = false;
    this.currentFile = null;
    this.hideControl();
  },

  showControl() {
    const panel = document.getElementById("playerControlPage");
    if (panel) {
      panel.style.display = "flex";
      panel.style.opacity = "1";
      panel.style.visibility = "visible";
    }
    const library = document.querySelector(".page-container");
    if (library) library.style.display = "none";
  },

  hideControl() {
    const panel = document.getElementById("playerControlPage");
    if (panel) panel.style.display = "none";
    const library = document.querySelector(".page-container");
    if (library) library.style.display = "flex";
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

  startStatusPolling() {
    this.stopStatusPolling();
    this.statusCheckInterval = setInterval(() => this.getPlaybackState(), 2000);
  },

  stopStatusPolling() {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
      this.statusCheckInterval = null;
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
