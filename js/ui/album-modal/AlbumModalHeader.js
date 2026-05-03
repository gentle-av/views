export class AlbumModalHeader {
  constructor(titleEl) {
    this.titleEl = titleEl;
  }

  render(album) {
    if (!this.titleEl) return;
    this.titleEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: var(--bg2); display: flex; align-items: center; justify-content: center;">
          ${album.coverUrl ? `<img src="${album.coverUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : '<i class="fas fa-music" style="font-size: 30px; color: var(--yellow);"></i>'}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 1.1rem; font-weight: 600;">${this._escape(album.title)}</div>
          <div style="font-size: 0.85rem; color: var(--yellow);">${this._escape(album.artist)}</div>
          <div style="font-size: 0.75rem; color: var(--fg3);">${album.trackCount || (album.tracks ? album.tracks.length : 0)} треков</div>
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
