export class AlbumModalHeader {
  constructor(titleEl) {
    this.titleEl = titleEl;
  }

  render(album) {
    if (!this.titleEl) return;
    this.titleEl.innerHTML = `
      <div class="album-modal-header-content">
        <div class="album-modal-cover">
          ${album.coverUrl ? `<img src="${album.coverUrl}" alt="${this._escape(album.title)}">` : '<i class="fas fa-music"></i>'}
        </div>
        <div class="album-modal-info">
          <div class="album-modal-title">${this._escape(album.title)}</div>
          <div class="album-modal-artist">${this._escape(album.artist)}</div>
          <div class="album-modal-track-count">${album.trackCount || (album.tracks ? album.tracks.length : 0)} треков</div>
        </div>
      </div>
    `;
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
