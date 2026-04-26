class PlaylistPopup {
  constructor(playbackController, events, albumLibrary) {
    this.playback = playbackController;
    this.events = events;
    this.albumLibrary = albumLibrary;
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

  _findArtistFromLibrary(filePath) {
    if (!this.albumLibrary || !this.albumLibrary.albums) {
      return null;
    }
    for (const album of this.albumLibrary.albums) {
      for (const track of album.tracks) {
        if (track.path === filePath) {
          return {
            artist: album.artist,
            title: track.title || track.name,
            album: album.title,
          };
        }
      }
    }
    return null;
  }

  async _fetchTrackMetadata(filePath) {
    if (this.tracksCache.has(filePath)) {
      return this.tracksCache.get(filePath);
    }
    const libraryData = this._findArtistFromLibrary(filePath);
    if (libraryData) {
      const metadata = {
        title: libraryData.title,
        artist: libraryData.artist,
        album: libraryData.album,
        duration: 0,
      };
      this.tracksCache.set(filePath, metadata);
      return metadata;
    }
    if (!this.musicApi) {
      const fileName = this._getFileName(filePath);
      const artistFromPath = this._extractArtistFromPath(filePath);
      return {
        title: fileName,
        artist: artistFromPath || "Неизвестный исполнитель",
        album: "",
        duration: 0,
      };
    }
    try {
      const response = await this.musicApi.getFileMetadata(filePath);
      if (response && response.data && response.data.file) {
        const fileData = response.data.file;
        const metadata = {
          title: fileData.title || this._getFileName(filePath),
          artist:
            fileData.artist ||
            this._extractArtistFromPath(filePath) ||
            "Неизвестный исполнитель",
          album: fileData.album || "",
          duration: fileData.duration || 0,
        };
        this.tracksCache.set(filePath, metadata);
        return metadata;
      }
      const dbData = response?.data?.database;
      if (dbData && dbData.title && dbData.title !== "Unknown") {
        const metadata = {
          title: dbData.title,
          artist:
            dbData.artist ||
            this._extractArtistFromPath(filePath) ||
            "Неизвестный исполнитель",
          album: dbData.album || "",
          duration: dbData.duration || 0,
        };
        this.tracksCache.set(filePath, metadata);
        return metadata;
      }
    } catch (error) {
      console.error("Failed to fetch metadata for:", filePath, error);
    }
    const fileName = this._getFileName(filePath);
    const artistFromPath = this._extractArtistFromPath(filePath);
    return {
      title: fileName,
      artist: artistFromPath || "Неизвестный исполнитель",
      album: "",
      duration: 0,
    };
  }

  _extractArtistFromPath(filePath) {
    const parts = filePath.split("/");
    const musicIndex = parts.findIndex((part) => part === "music");
    if (musicIndex !== -1 && parts.length > musicIndex + 1) {
      return parts[musicIndex + 1];
    }
    return null;
  }

  _getFileName(filePath) {
    const parts = filePath.split("/");
    let fileName = parts.pop() || "Unknown";
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot > 0) {
      fileName = fileName.substring(0, lastDot);
    }
    return decodeURIComponent(fileName);
  }

  async refresh() {
    this._getElements();
    if (!this.container) return;
    const playlistData = await this.playback.api.getPlaylist();
    const state = await this.playback.api.getPlaybackState();
    let currentPath = state?.data?.currentTrack;
    let currentIndex = state?.data?.currentIndex ?? -1;
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
          album: metadata.album,
          duration: metadata.duration,
          index: index,
        };
      }),
    );
    this._render(tracksWithMetadata, currentPath, currentIndex);
    this._updateCount(tracksWithMetadata.length);
  }

  _scrollToCurrentTrack() {
    if (!this.container) return;
    const currentItem = this.container.querySelector(
      ".playlist-track-item.current",
    );
    if (currentItem) {
      currentItem.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  _render(tracks, currentPath, currentIndex) {
    if (!this.container) return;
    if (!tracks.length) {
      this.container.innerHTML =
        '<div class="playlist-empty"><i class="fas fa-music"></i><p>Плейлист пуст</p></div>';
      return;
    }
    let html = '<div class="playlist-tracks-list">';
    let currentArtist = "";
    for (const [i, track] of tracks.entries()) {
      const isCurrent = track.path === currentPath || i === currentIndex;
      const trackNumber = i + 1;
      let artist = track.artist || "Неизвестный исполнитель";
      if (artist === "Неизвестный исполнитель" || !artist) {
        artist =
          this._extractArtistFromPath(track.path) || "Неизвестный исполнитель";
      }
      if (artist !== currentArtist) {
        currentArtist = artist;
        html += `<div class="playlist-artist-separator" style="padding: 12px 0 6px 0; font-size: 0.8rem; font-weight: 600; color: var(--yellow); border-bottom: 1px solid var(--bg3); margin-top: 8px;"><i class="fas fa-user"></i> ${this._escape(artist)}</div>`;
      }
      html += `<div class="playlist-track-item ${isCurrent ? "current" : ""}" data-index="${i}" data-path="${this._escape(track.path)}">
      <div class="playlist-track-number">${String(trackNumber).padStart(2, "0")}</div>
      <div class="playlist-track-info">
        <div class="playlist-track-name">${this._escape(track.title)}</div>
        ${track.album ? `<div class="playlist-track-album" style="font-size: 0.65rem; color: var(--fg3); margin-top: 2px;"><i class="fas fa-compact-disc"></i> ${this._escape(track.album)}</div>` : ""}
      </div>
      <div class="playlist-track-remove-btn" data-index="${i}"><i class="fas fa-trash"></i></div>
    </div>`;
    }
    html += "</div>";
    this.container.innerHTML = html;
    this._attachTrackEvents();
    setTimeout(() => this._scrollToCurrentTrack(), 100);
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
        this._hideOverlay();
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
          const isOpen = this.popup.classList.toggle("open");
          if (isOpen) {
            this._showOverlay();
            this.refresh();
          } else {
            this._hideOverlay();
          }
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
        this._hideOverlay();
      }
    });
  }

  _updateCount(count) {
    const countElement = document.getElementById("playlistTrackCount");
    if (countElement) {
      const tracksWord = this._getTracksWord(count);
      countElement.textContent = `${count} ${tracksWord}`;
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

  _showOverlay() {
    let overlay = document.querySelector(".overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "overlay";
      document.body.appendChild(overlay);
    }
    overlay.classList.add("active");
    overlay.style.display = "block";
  }

  _hideOverlay() {
    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.classList.remove("active");
      overlay.style.display = "none";
    }
  }
}
