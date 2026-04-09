const PlaylistViewer = {
  musiumUrl: null,
  musiumAvailable: false,
  playlist: [],
  currentIndex: -1,
  updateInterval: null,
  mediaServerUrl: null,
  initialized: false,
  retryCount: 0,
  maxRetries: 5,
  addingToPlaylist: false,
  pendingTracks: null,
  lastAddToPlaylistTime: 0,

  getMusiumUrl() {
    if (this.musiumUrl) return this.musiumUrl;
    if (typeof AudioPlayer !== "undefined" && AudioPlayer.musiumUrl) {
      this.musiumUrl = AudioPlayer.musiumUrl;
      return this.musiumUrl;
    }
    return `http://${window.location.hostname}:8084`;
  },

  setMusiumUrl(url) {
    this.musiumUrl = url;
  },

  async callMusium(endpoint, method = "GET", data = null) {
    try {
      const url = `${this.getMusiumUrl()}${endpoint}`;
      const options = {
        method: method,
        headers: { "Content-Type": "application/json" },
      };
      if (method === "POST" && data) {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Musium error for ${endpoint}:`, error);
      return null;
    }
  },

  async checkMusiumAvailable() {
    if (this.musiumAvailable === true) return true;
    try {
      const response = await fetch(`${this.getMusiumUrl()}/api/playbackState`);
      if (response.ok) {
        this.musiumAvailable = true;
        return true;
      }
    } catch (error) {
      this.musiumAvailable = false;
    }
    return false;
  },

  async ensureMusiumRunning(tracks) {
    if (typeof AudioPlayer !== "undefined" && AudioPlayer.ensureMusiumRunning) {
      return await AudioPlayer.ensureMusiumRunning(tracks);
    }
    const isAvailable = await this.checkMusiumAvailable();
    if (isAvailable) return true;
    return false;
  },

  async sendToMusium(endpoint, data, method = "POST") {
    if (typeof AudioPlayer !== "undefined" && AudioPlayer.sendToMusium) {
      return await AudioPlayer.sendToMusium(endpoint, data, method);
    }
    return await this.callMusium(endpoint, method, data);
  },

  async addToPlaylist(album, trackIndex = null) {
    console.log(
      "[DEBUG] addToPlaylist called, album:",
      album?.title,
      "trackIndex:",
      trackIndex,
    );
    if (this.addingToPlaylist) {
      console.log("Already adding to playlist, skipping");
      return;
    }
    this.addingToPlaylist = true;
    try {
      const tracksToAdd =
        trackIndex !== null ? [album.tracks[trackIndex]] : album.tracks;
      console.log("[DEBUG] tracksToAdd count:", tracksToAdd.length);
      this.pendingTracks = tracksToAdd;
      const started = await this.ensureMusiumRunning(tracksToAdd);
      if (!started) {
        if (typeof Utils !== "undefined") {
          Utils.showNotification("Не удалось запустить аудиоплеер", "error");
        }
        return;
      }
      await this.delay(500);
      let addedCount = 0;
      for (const track of tracksToAdd) {
        const result = await this.sendToMusium("/api/add", {
          path: track.path,
        });
        if (result && result.success) {
          addedCount++;
        }
        await this.delay(100);
      }
      if (typeof Utils !== "undefined") {
        Utils.showNotification(
          `Добавлено ${addedCount} из ${tracksToAdd.length} треков в плейлист`,
          "success",
        );
      }
      await this.delay(500);
      await this.refresh();
      await this.delay(300);
    } finally {
      this.addingToPlaylist = false;
    }
  },

  async refresh() {
    console.log("[PlaylistViewer] refresh called");
    const musiumRunning = await this.checkMusiumAvailable();
    if (!musiumRunning) {
      this.showEmptyPlaylist(
        "Musium не запущен. Выберите альбом для воспроизведения.",
      );
      return;
    }
    await this.loadPlaylistFromMusium();
  },

  async loadPlaylistFromMusium() {
    try {
      const response = await fetch(`${this.getMusiumUrl()}/api/queue`);
      if (!response.ok) throw new Error("Failed to load playlist");
      const data = await response.json();
      this.renderPlaylist(data.queue);
    } catch (error) {
      console.error("[PlaylistViewer] Error loading playlist:", error);
      this.showEmptyPlaylist("Ошибка загрузки плейлиста");
    }
  },

  renderPlaylist(playlist) {
    const container = document.getElementById("playlistContainer");
    if (!container) return;
    if (!playlist || playlist.length === 0) {
      this.showEmptyPlaylist("Плейлист пуст");
      return;
    }
    let html = `<div class="playlist-tracks-list">`;
    for (let i = 0; i < playlist.length; i++) {
      const track = playlist[i];
      const trackName = track.title || track.name || "Неизвестный трек";
      const artist = track.artist || "";
      html += `
        <div class="playlist-track-item" data-index="${i}">
          <div class="playlist-track-number">${i + 1}</div>
          <div class="playlist-track-info">
            <div class="playlist-track-name">${this.escapeHtml(trackName)}</div>
            ${artist ? `<div class="playlist-track-artist">${this.escapeHtml(artist)}</div>` : ""}
          </div>
          <div class="playlist-track-remove-btn" data-index="${i}">
            <i class="fas fa-trash"></i>
          </div>
        </div>
      `;
    }
    html += `</div>`;
    container.innerHTML = html;
    this.attachPlaylistEvents();
  },

  attachPlaylistEvents() {
    const container = document.getElementById("playlistContainer");
    if (!container) return;
    container.querySelectorAll(".playlist-track-item").forEach((item) => {
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);
      newItem.addEventListener("click", async (e) => {
        if (e.target.closest(".playlist-track-remove-btn")) return;
        const index = parseInt(newItem.dataset.index);
        await this.playTrack(index);
      });
    });
    container.querySelectorAll(".playlist-track-remove-btn").forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const index = parseInt(newBtn.dataset.index);
        await this.removeTrack(index);
      });
    });
  },

  showEmptyPlaylist(message) {
    const container = document.getElementById("playlistContainer");
    if (!container) return;
    container.innerHTML = `
      <div class="playlist-empty">
        <i class="fas fa-music" style="font-size: 48px; opacity: 0.5;"></i>
        <p>${message}</p>
        <small>Нажмите на альбом, чтобы начать воспроизведение</small>
      </div>
    `;
  },

  async playTrack(index) {
    console.log(`Play track at index: ${index}`);
    const result = await this.sendToMusium("/api/playIndex", { index: index });
    if (result && result.success) {
      await this.delay(200);
      if (typeof AudioPlayer !== "undefined") {
        AudioPlayer.updateUI();
      }
    } else {
      if (typeof Utils !== "undefined") {
        Utils.showNotification("Ошибка воспроизведения трека", "error");
      }
    }
  },

  async removeTrack(index) {
    console.log(`Remove track at index: ${index}`);
    const result = await this.sendToMusium("/api/remove", { index: index });
    if (result && result.success) {
      await this.refresh();
      if (typeof Utils !== "undefined") {
        Utils.showNotification("Трек удален из плейлиста", "success");
      }
    } else {
      if (typeof Utils !== "undefined") {
        Utils.showNotification("Ошибка удаления трека", "error");
      }
    }
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  setupCloseHandler() {
    const closeBtn = document.getElementById("playlistSidebarClose");
    const overlay = document.getElementById("playlistOverlay");
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closePlaylist();
      });
    }
    if (overlay) {
      const newOverlay = overlay.cloneNode(true);
      overlay.parentNode.replaceChild(newOverlay, overlay);
      newOverlay.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closePlaylist();
      });
    }
  },

  closePlaylist() {
    const sidebar = document.getElementById("playlistSidebar");
    const overlay = document.getElementById("playlistOverlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
  },

  openPlaylistSidebar() {
    const sidebar = document.getElementById("playlistSidebar");
    const overlay = document.getElementById("playlistOverlay");
    if (sidebar) sidebar.classList.add("open");
    if (overlay) overlay.classList.add("open");
    this.refresh();
  },

  reset() {
    this.initialized = false;
    this.musiumAvailable = false;
    this.playlist = [];
    this.currentIndex = -1;
  },

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.setupCloseHandler();
    this.showEmptyPlaylist("Плейлист пуст");
  },
};
