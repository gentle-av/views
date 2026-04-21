class AlbumModal {
  constructor(events) {
    this.events = events;
    this.modal = document.getElementById("albumModal");
    this.titleEl = document.getElementById("modalAlbumTitle");
    this.tracksContainer = document.getElementById("modalTracksList");
    this.trackList = new TrackList(events);
    this._bindEvents();
  }

  _bindEvents() {
    this.events.on("album:open", (album) => this.show(album));
    const closeBtn = this.modal?.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => this.hide();
    }
    this.modal?.addEventListener("click", (e) => {
      if (e.target === this.modal) this.hide();
    });
  }

  show(album) {
    if (!this.modal) return;
    this._renderHeader(album);
    this._renderActions(album);
    this.trackList.render(this.tracksContainer, album);
    this.modal.classList.add("active");
    this._currentAlbum = album;
  }

  hide() {
    this.modal?.classList.remove("active");
  }

  _renderHeader(album) {
    if (!this.titleEl) return;
    this.titleEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: var(--bg2); display: flex; align-items: center; justify-content: center;">
          ${album.coverUrl ? `<img src="${album.coverUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : '<i class="fas fa-music" style="font-size: 30px; color: var(--yellow);"></i>'}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 1.1rem; font-weight: 600;">${this._escape(album.title)}</div>
          <div style="font-size: 0.85rem; color: var(--yellow);">${this._escape(album.artist)}</div>
          <div style="font-size: 0.75rem; color: var(--fg3);">${album.trackCount} треков</div>
        </div>
      </div>
    `;
  }

  _renderActions(album) {
    const modalBody = this.modal?.querySelector(".modal-body");
    const existingActions = modalBody?.querySelector(".modal-album-actions");
    if (existingActions) existingActions.remove();
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "modal-album-actions";
    actionsDiv.style.cssText =
      "display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid var(--bg3); background: var(--bg2); flex-wrap: wrap;";
    actionsDiv.innerHTML = `
      <button class="modal-play-btn" style="flex: 1; padding: 10px; background: var(--yellow); color: var(--bg0); border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i class="fas fa-play"></i> Воспроизвести альбом
      </button>
      <button class="modal-add-btn" style="flex: 1; padding: 10px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i class="fas fa-plus"></i> Добавить в плейлист
      </button>
      <button class="modal-edit-btn" style="flex: 1; padding: 10px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <i class="fas fa-edit"></i> Редактировать теги
      </button>
    `;
    modalBody?.insertBefore(actionsDiv, modalBody.firstChild);
    actionsDiv
      .querySelector(".modal-play-btn")
      ?.addEventListener("click", () => {
        this.events.emit("album:play", album);
        this.hide();
      });
    actionsDiv
      .querySelector(".modal-add-btn")
      ?.addEventListener("click", () => {
        this.events.emit("album:addToPlaylist", album);
        this.hide();
      });
    actionsDiv
      .querySelector(".modal-edit-btn")
      ?.addEventListener("click", () => {
        if (window.TagEditor) {
          window.TagEditor.showAlbumTagEditor(album);
        } else {
          Utils.showNotification("Редактор тегов временно недоступен", "error");
        }
        this.hide();
      });
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
