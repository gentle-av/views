class AlbumCard {
  constructor(album, events) {
    this.album = album;
    this.events = events;
    this.element = null;
  }

  render() {
    const coverHtml = this.album.coverUrl
      ? `<img src="${this.album.coverUrl}" alt="${this._escape(this.album.title)}" loading="lazy">`
      : `<div class="album-card-placeholder"><i class="fas fa-music"></i></div>`;
    this.element = document.createElement("div");
    this.element.className = "album-card";
    this.element.dataset.album = this.album.title;
    this.element.dataset.artist = this.album.artist;
    this.element.innerHTML = `
      <div class="album-card-art">
        ${coverHtml}
        <button class="album-delete-btn" title="Удалить альбом"><i class="fas fa-trash-alt"></i></button>
      </div>
      <div class="album-card-info">
        <div class="album-card-title" title="${this._escape(this.album.title)}">${this._escape(this.album.title)}</div>
        <div class="album-card-artist" title="${this._escape(this.album.artist)}">${this._escape(this.album.artist)}</div>
        <div class="album-card-meta">
          ${this.album.year ? `<span>${this.album.year}</span>` : ""}
          <span>${this.album.trackCount} треков</span>
        </div>
      </div>
    `;
    this._attachEvents();
    return this.element;
  }

  _attachEvents() {
    const deleteBtn = this.element.querySelector(".album-delete-btn");
    deleteBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.events.emit("albumDelete", this.album);
    });
    this.element.addEventListener("click", () => {
      this.events.emit("albumClick", this.album);
    });
    this.element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.events.emit("albumContextMenu", {
        x: e.clientX,
        y: e.clientY,
        album: this.album,
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
