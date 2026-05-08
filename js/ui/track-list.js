class TrackList {
  constructor(events) {
    this.events = events;
    this.container = null;
    this.currentAlbum = null;
  }

  render(container, album) {
    this.container = container;
    this.currentAlbum = album;
    if (!this.container) return;
    this.container.innerHTML = album.tracks
      .map(
        (track, idx) => `
      <div class="track-item" data-track-index="${idx}">
        <span class="track-number">${(idx + 1).toString().padStart(2, "0")}</span>
        <span class="track-name" title="${this._escape(track.displayName || track.title || "Unknown")}">${this._escape(track.displayName || track.title || "Unknown")}</span>
        <span class="track-duration">${track.displayDuration || ""}</span>
        <div class="track-actions">
          <button class="track-play-btn" data-index="${idx}" title="Воспроизвести">
            <i class="fas fa-play"></i>
          </button>
          <button class="track-edit-btn" data-index="${idx}" title="Редактировать метаданные">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </div>
    `,
      )
      .join("");
    this._attachEvents();
  }

  _attachEvents() {
    this.container.querySelectorAll(".track-play-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const track = this.currentAlbum.tracks[index];
        if (window.MediaCenter && window.MediaCenter.universalPlayer) {
          window.MediaCenter.universalPlayer.startPlayback(track.path, "audio");
        }
        this.events.emit("track:play", {
          album: this.currentAlbum,
          trackIndex: index,
        });
      });
    });
    this.container.querySelectorAll(".track-edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        const track = this.currentAlbum.tracks[index];
        this.events.emit("track:editMetadata", {
          album: this.currentAlbum,
          track: track,
          trackIndex: index,
        });
      });
    });
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
