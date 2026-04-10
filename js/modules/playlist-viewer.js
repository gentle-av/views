const PlaylistViewer = {
  playlist: [],
  currentIndex: -1,
  updateInterval: null,
  initialized: false,
  playerAvailable: false,

  getServerUrl() {
    return `http://${window.location.hostname}:${window.location.port}`;
  },

  showEmptyPlaylist(message) {
    const container = document.getElementById("playlistContainer");
    if (!container) return;
    container.innerHTML = `
      <div class="playlist-empty">
        <i class="fas fa-music"></i>
        <p>${message}</p>
      </div>
    `;
  },

  async checkPlayerAvailable() {
    try {
      const response = await fetch(`${this.getServerUrl()}/api/playbackState`);
      if (response.ok) {
        const data = await response.json();
        this.playerAvailable = data.success === true;
        return this.playerAvailable;
      }
    } catch (error) {
      console.log("[PlaylistViewer] Player not available");
    }
    this.playerAvailable = false;
    return false;
  },

  async getPlaylist() {
    if (!this.playerAvailable) return null;
    try {
      const response = await fetch(`${this.getServerUrl()}/api/getPlaylist`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting playlist:", error);
      return null;
    }
  },

  async getPlaybackState() {
    if (!this.playerAvailable) return null;
    try {
      const response = await fetch(`${this.getServerUrl()}/api/playbackState`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error getting playback state:", error);
      return null;
    }
  },

  async refresh() {
    const available = await this.checkPlayerAvailable();
    if (!available) {
      this.showEmptyPlaylist("Плеер недоступен");
      return;
    }
    const playlistData = await this.getPlaylist();
    const playbackState = await this.getPlaybackState();
    let currentTrackPath = null;
    if (playbackState && playbackState.success && playbackState.data) {
      currentTrackPath = playbackState.data.currentTrack;
    }
    if (playlistData && playlistData.success && playlistData.data) {
      let tracks = playlistData.data;
      if (
        typeof tracks === "object" &&
        !Array.isArray(tracks) &&
        tracks.tracks
      ) {
        tracks = tracks.tracks;
      }
      this.renderPlaylist(tracks, currentTrackPath);
      this.updateTrackCount(tracks.length);
    } else {
      this.showEmptyPlaylist("Плейлист пуст");
      this.updateTrackCount(0);
    }
  },

  updateTrackCount(count) {
    const countElement = document.getElementById("playlistTrackCount");
    if (countElement) {
      const tracksText = this.getTracksText(count);
      countElement.textContent = tracksText;
    }
  },

  getTracksText(count) {
    if (count === 0) return "0 треков";
    if (count === 1) return "1 трек";
    if (count >= 2 && count <= 4) return `${count} трека`;
    return `${count} треков`;
  },

  renderPlaylist(playlist, currentTrackPath) {
    const container = document.getElementById("playlistContainer");
    if (!container) return;
    if (!playlist || playlist.length === 0) {
      this.showEmptyPlaylist("Плейлист пуст");
      return;
    }
    let html = `<div class="playlist-tracks-list">`;
    for (let i = 0; i < playlist.length; i++) {
      const trackPath = playlist[i];
      const trackName = trackPath.split("/").pop();
      const isCurrent = trackPath === currentTrackPath;
      html += `
        <div class="playlist-track-item ${isCurrent ? "current" : ""}" data-index="${i}" data-path="${this.escapeHtml(trackPath)}">
          <div class="playlist-track-number">${String(i + 1).padStart(2, "0")}</div>
          <div class="playlist-track-name" title="${this.escapeHtml(trackName)}">${this.escapeHtml(trackName)}</div>
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

  async playTrack(index) {
    try {
      const response = await fetch(`${this.getServerUrl()}/api/playIndex`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: index }),
      });
      const data = await response.json();
      if (data.success) {
        await this.delay(200);
        await this.refresh();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.updateUI();
        }
      }
    } catch (error) {
      console.error("Error playing track:", error);
    }
  },

  async removeTrack(index) {
    try {
      const response = await fetch(
        `${this.getServerUrl()}/api/removeFromPlaylist`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index: index }),
        },
      );
      const data = await response.json();
      if (data.success) {
        await this.refresh();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.updateUI();
        }
        Utils.showNotification("Трек удален из плейлиста", "success");
      } else {
        Utils.showNotification(
          data.message || "Ошибка удаления трека",
          "error",
        );
      }
    } catch (error) {
      console.error("Error removing track:", error);
      Utils.showNotification("Ошибка удаления трека", "error");
    }
  },

  openPlaylist() {
    const popup = document.getElementById("playlistPopup");
    if (popup) {
      popup.classList.add("open");
      this.refresh();
    }
  },

  closePlaylist() {
    const popup = document.getElementById("playlistPopup");
    if (popup) {
      popup.classList.remove("open");
    }
  },

  async clearPlaylist() {
    try {
      await fetch(`${this.getServerUrl()}/api/clear`, { method: "POST" });
      await this.refresh();
      if (typeof AudioPlayer !== "undefined") {
        AudioPlayer.updateUI();
      }
      Utils.showNotification("Плейлист очищен", "success");
    } catch (error) {
      console.error("Error clearing playlist:", error);
      Utils.showNotification("Ошибка очистки плейлиста", "error");
    }
  },

  setupEventListeners() {
    const closeBtn = document.getElementById("playlistPopupClose");
    const clearBtn = document.getElementById("playlistClearBtn");
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener("click", () => this.closePlaylist());
    }
    if (clearBtn) {
      const newClearBtn = clearBtn.cloneNode(true);
      clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
      newClearBtn.addEventListener("click", () => this.clearPlaylist());
    }
    document.addEventListener("click", (e) => {
      const popup = document.getElementById("playlistPopup");
      const playlistBtn = document.getElementById("headerPlaylistBtn");
      if (popup && popup.classList.contains("open")) {
        if (!popup.contains(e.target) && !playlistBtn?.contains(e.target)) {
          this.closePlaylist();
        }
      }
    });
  },

  startPolling() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      if (this.playerAvailable) {
        this.refresh();
      }
    }, 3000);
  },

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.setupEventListeners();
    await this.refresh();
    this.startPolling();
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
