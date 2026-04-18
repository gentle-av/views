class PlaylistPopup {
  constructor(playbackController, events) {
    this.playback = playbackController;
    this.events = events;
    this.container = document.getElementById("playlistContainer");
    this.popup = document.getElementById("playlistPopup");
    this._init();
  }

  async _init() {
    this._attachControls();
    this.events.on("playlistChanged", () => this.refresh());
    this.events.on("playlistCleared", () => this.refresh());
    await this.refresh();
    setInterval(() => this.refresh(), 3000);
  }

  async refresh() {
    const playlistData = await this.playback.api.getPlaylist();
    const state = await this.playback.api.getPlaybackState();
    let currentPath = state?.data?.currentTrack;
    let tracks = playlistData?.data?.tracks || playlistData?.data || [];
    this._render(tracks, currentPath);
    this._updateCount(tracks.length);
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
      const title =
        track.title || track.name || track.path?.split("/").pop() || "Unknown";
      html += `
                <div class="playlist-track-item ${isCurrent ? "current" : ""}" data-index="${i}">
                    <div class="playlist-track-number">${String(i + 1).padStart(2, "0")}</div>
                    <div class="playlist-track-info">
                        <div class="playlist-track-name">${this._escape(title)}</div>
                    </div>
                    <div class="playlist-track-remove-btn" data-index="${i}"><i class="fas fa-trash"></i></div>
                </div>
            `;
    });
    html += "</div>";
    this.container.innerHTML = html;
    this._attachTrackEvents();
  }

  _attachTrackEvents() {
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
      closeBtn.addEventListener("click", () =>
        this.popup?.classList.remove("open"),
      );
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        await this.playback.api.clearPlaylist();
        await this.refresh();
        this.events.emit("playlistCleared");
      });
    }
    if (headerBtn) {
      headerBtn.addEventListener("click", () => {
        this.popup?.classList.toggle("open");
        this.refresh();
      });
    }
    document.addEventListener("click", (e) => {
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
