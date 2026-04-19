class PlaylistPopup {
  constructor(playbackController, events) {
    this.playback = playbackController;
    this.events = events;
    this.musicApi = null;
    this.tracksCache = new Map();
    this._init();
  }
  _getElements() {
    this.container = document.getElementById("playlistContainer");
    this.popup = document.getElementById("playlistPopup");
    this.badge = document.getElementById("playlistBadge");
  }
  async _init() {
    this._getElements();
    if (window.musicApi) {
      this.musicApi = window.musicApi;
    }
    this._attachControls();
    this.events.on("playlistChanged", () => this.refresh());
    this.events.on("playlistCleared", () => this.refresh());
    await this.refresh();
    setInterval(() => this.refresh(), 5000);
  }
  async _fetchTrackMetadata(filePath) {
    if (this.tracksCache.has(filePath)) {
      return this.tracksCache.get(filePath);
    }
    if (!this.musicApi) {
      const fileName = filePath.split("/").pop() || "Unknown";
      return { title: fileName, artist: "", duration: 0 };
    }
    try {
      const response = await this.musicApi.getFileMetadata(filePath);
      if (response && response.data && response.data.file) {
        const fileData = response.data.file;
        const metadata = {
          title: fileData.title || this._getFileName(filePath),
          artist: fileData.artist || "",
          duration: fileData.duration || 0,
        };
        this.tracksCache.set(filePath, metadata);
        return metadata;
      }
    } catch (error) {
      console.error("Failed to fetch metadata for:", filePath, error);
    }
    const fileName = filePath.split("/").pop() || "Unknown";
    return { title: fileName, artist: "", duration: 0 };
  }
  _getFileName(filePath) {
    const parts = filePath.split("/");
    let fileName = parts.pop() || "Unknown";
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot > 0) {
      fileName = fileName.substring(0, lastDot);
    }
    return fileName;
  }
  async refresh() {
    this._getElements();
    if (!this.container) return;
    const playlistData = await this.playback.api.getPlaylist();
    const state = await this.playback.api.getPlaybackState();
    let currentPath = state?.data?.currentTrack;
    let tracks = playlistData?.data || [];
    if (!Array.isArray(tracks)) {
      tracks = [];
    }
    const tracksWithMetadata = await Promise.all(
      tracks.map(async (track, index) => {
        const path = typeof track === "string" ? track : track.path;
        const metadata = await this._fetchTrackMetadata(path);
        return {
          path: path,
          title: metadata.title,
          artist: metadata.artist,
          duration: metadata.duration,
          index: index,
        };
      }),
    );
    this._render(tracksWithMetadata, currentPath);
    this._updateCount(tracksWithMetadata.length);
  }
  _render(tracks, currentPath) {
    if (!this.container) return;
    if (!tracks.length) {
      this.container.innerHTML =
        '<div class="playlist-empty"><i class="fas fa-music"></i><p>Плейлист пуст</p></div>';
      return;
    }
    let html = '<div class="playlist-tracks-list">';
    tracks.forEach((track, i) => {
      const isCurrent = track.path === currentPath;
      const trackNumber = i + 1;
      html += `<div class="playlist-track-item ${isCurrent ? "current" : ""}" data-index="${i}" data-path="${this._escape(track.path)}"><div class="playlist-track-number">${String(trackNumber).padStart(2, "0")}</div><div class="playlist-track-info"><div class="playlist-track-name">${this._escape(track.title)}</div>${track.artist ? `<div class="playlist-track-artist">${this._escape(track.artist)}</div>` : ""}</div><div class="playlist-track-remove-btn" data-index="${i}"><i class="fas fa-trash"></i></div></div>`;
    });
    html += "</div>";
    this.container.innerHTML = html;
    this._attachTrackEvents();
  }
  _attachTrackEvents() {
    if (!this.container) return;
    this.container.querySelectorAll(".playlist-track-item").forEach((item) => {
      const handler = () => {
        const index = parseInt(item.dataset.index);
        this.playback.api.playIndex(index);
      };
      item.removeEventListener("click", item._clickHandler);
      item._clickHandler = handler;
      item.addEventListener("click", item._clickHandler);
    });
    this.container
      .querySelectorAll(".playlist-track-remove-btn")
      .forEach((btn) => {
        const removeHandler = async (e) => {
          e.stopPropagation();
          const index = parseInt(btn.dataset.index);
          await this.playback.api.post("/api/removeFromPlaylist", { index });
          this.tracksCache.clear();
          await this.refresh();
          this.events.emit("playlistChanged");
        };
        btn.removeEventListener("click", btn._removeHandler);
        btn._removeHandler = removeHandler;
        btn.addEventListener("click", btn._removeHandler);
      });
  }
  _attachControls() {
    const closeBtn = document.getElementById("playlistPopupClose");
    const clearBtn = document.getElementById("playlistClearBtn");
    const headerBtn = document.getElementById("headerPlaylistBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this._getElements();
        this.popup?.classList.remove("open");
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        await this.playback.api.clearPlaylist();
        this.tracksCache.clear();
        await this.refresh();
        this.events.emit("playlistCleared");
      });
    }
    if (headerBtn) {
      headerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._getElements();
        if (this.popup) {
          this.popup.classList.toggle("open");
          this.refresh();
        }
      });
    }
    document.addEventListener("click", (e) => {
      this._getElements();
      if (
        this.popup?.classList.contains("open") &&
        headerBtn &&
        !headerBtn.contains(e.target) &&
        !this.popup.contains(e.target)
      ) {
        this.popup.classList.remove("open");
      }
    });
  }
  _updateCount(count) {
    const countElement = document.getElementById("playlistTrackCount");
    if (countElement) {
      const tracksWord = this._getTracksWord(count);
      countElement.textContent = `${count} ${tracksWord}`;
    }
    if (this.badge) {
      this.badge.textContent = count;
      this.badge.style.display = count > 0 ? "inline-block" : "none";
    }
  }
  _getTracksWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) return "трек";
    if (
      count % 10 >= 2 &&
      count % 10 <= 4 &&
      (count % 100 < 10 || count % 100 >= 20)
    )
      return "трека";
    return "треков";
  }
  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
