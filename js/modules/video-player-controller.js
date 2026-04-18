// js/modules/video-player-controller.js
class VideoPlayerController {
  constructor(apiClient, events) {
    this.api = apiClient;
    this.events = events;
    this.currentFile = null;
    this.isPlaying = false;
    this.isFullscreen = false;
    this.panel = document.getElementById("playerControlPage");

    this._bindEvents();
    this._bindUIEvents();
  }

  _bindEvents() {
    this.events.on("playback:videoStart", (path) => this.startPlayback(path));
    this.events.on("player:show", () => this.show());
    this.events.on("player:hide", () => this.hide());
  }

  _bindUIEvents() {
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
  }

  async startPlayback(path) {
    this.currentFile = path;
    this.show();
    await this.api.post("/api/open", { path });
    this.isPlaying = true;
    this._updateUI();
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

  async stop() {
    await this.api.post("/api/mpv/control", { command: "stop" });
    this.currentFile = null;
    this.isPlaying = false;
    this.hide();
    this.events.emit("playback:videoStopped");
  }

  async deleteCurrentFile() {
    if (!this.currentFile) return;
    const confirmed = await CustomDeleteDialogInstance.showConfirm(
      this.currentFile.split("/").pop(),
    );
    if (confirmed) {
      await this.api.post("/api/trash", { path: this.currentFile });
      await this.stop();
      this.events.emit("video:refresh");
      Utils.showNotification("Файл удален", "success");
    }
  }

  show() {
    if (this.panel) this.panel.style.display = "flex";
  }

  hide() {
    if (this.panel) this.panel.style.display = "none";
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

  _escape(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
