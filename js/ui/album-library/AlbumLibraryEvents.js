export class AlbumLibraryEvents {
  constructor(api, events, state, loader, renderer, onRefresh) {
    this.api = api;
    this.events = events;
    this.state = state;
    this.loader = loader;
    this.renderer = renderer;
    this.onRefresh = onRefresh;
    this._currentContextMenu = null;
    this._lastClickedAlbum = null;
    this._lastClickTime = 0;
  }

  bind() {
    this.events.on("albumDelete", () => this.onRefresh());
    this.events.on("albumEdit", (album) => this._handleAlbumEdit(album));
    this.events.on("albumContextMenu", ({ x, y, album }) =>
      this._showContextMenu(x, y, album),
    );
    this.events.on("albumClick", (album) => this._handleAlbumClick(album));
    window.addEventListener("albumTagsUpdated", () => this._refreshAlbumData());
  }

  async _handleAlbumEdit(album) {
    if (window.TagEditor && window.TagEditor.showAlbumTagEditor) {
      window.TagEditor.showAlbumTagEditor(album);
    } else {
      console.error("TagEditor not available");
    }
  }

  async _refreshAlbumData() {
    this.state.albums = [];
    this.state.filteredAlbums = [];
    this.state.currentArtistIndex = 0;
    this.state.currentPage = 1;
    await this.loader.loadMoreAlbums();
    this.state.indexTracks();
    this.renderer.clear();
    this.renderer.renderAlbums();
  }

  _handleAlbumClick(album) {
    if (
      this._lastClickedAlbum === album.title &&
      Date.now() - this._lastClickTime < 500
    ) {
      return;
    }
    this._lastClickedAlbum = album.title;
    this._lastClickTime = Date.now();
    this.events.emit("album:open", album);
  }

  _showContextMenu(x, y, album) {
    const existingMenu = document.querySelector(".album-context-menu");
    if (existingMenu) existingMenu.remove();
    const menu = document.createElement("div");
    menu.className = "album-context-menu";
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.innerHTML = `
      <div class="context-menu-item" data-action="delete">
        <i class="fas fa-trash-alt"></i> Удалить альбом
      </div>
      <div class="context-menu-item" data-action="edit">
        <i class="fas fa-edit"></i> Редактировать теги
      </div>
    `;
    document.body.appendChild(menu);
    if (window.MediaCenter && window.MediaCenter._showOverlay) {
      window.MediaCenter._showOverlay();
    }
    const closeMenuWithOverlay = () => {
      menu.remove();
      if (window.MediaCenter && window.MediaCenter._hideOverlay) {
        window.MediaCenter._hideOverlay();
      }
    };
    menu
      .querySelector('[data-action="delete"]')
      .addEventListener("click", () => {
        this.events.emit("albumDelete", album);
        closeMenuWithOverlay();
      });
    menu.querySelector('[data-action="edit"]').addEventListener("click", () => {
      this.events.emit("albumEdit", album);
      closeMenuWithOverlay();
    });
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        closeMenuWithOverlay();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  }

  unbind() {
    this.events.off("albumDelete", this.onRefresh);
    this.events.off("albumEdit", this._handleAlbumEdit);
    this.events.off("albumContextMenu");
    this.events.off("albumClick");
    window.removeEventListener("albumTagsUpdated", this._refreshAlbumData);
  }
}
