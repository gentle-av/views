class AlbumLibrary {
  constructor(musicApi, events) {
    this.api = musicApi;
    this.events = events;
    this.albums = [];
    this.filteredAlbums = [];
    this.container = document.getElementById("albumsGrid");
    this._loading = false;
  }

  async init() {
    await this._loadAlbums();
    this.events.on("albumDelete", () => this._loadAlbums());
    this.events.on("albumEdit", () => this._loadAlbums());
    this.events.on("albumContextMenu", ({ x, y, album }) =>
      this._showContextMenu(x, y, album),
    );
    this.events.on("albumClick", (album) => this._showAlbumModal(album));
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
    menu
      .querySelector('[data-action="delete"]')
      .addEventListener("click", () => {
        this.events.emit("albumDelete", album);
        menu.remove();
      });
    menu.querySelector('[data-action="edit"]').addEventListener("click", () => {
      this.events.emit("albumEdit", album);
      menu.remove();
    });
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  _showAlbumModal(album) {
    this.events.emit("album:open", album);
  }

  async _loadAlbums() {
    if (this._loading) return;
    this._loading = true;
    this._showLoading();

    const artistsData = await this.api.getArtists();
    if (!artistsData?.artists) {
      this._showError();
      this._loading = false;
      return;
    }

    const uniqueAlbums = new Map();
    for (const artist of artistsData.artists) {
      const albumsData = await this.api.getAlbums(artist);
      if (albumsData?.albums) {
        for (const albumData of albumsData.albums) {
          const key = `${albumData.artist}|${albumData.album}`;
          if (!uniqueAlbums.has(key)) {
            const tracksData = await this.api.getTracks(
              albumData.album,
              albumData.artist,
            );
            const coverUrl = await this.api.fetchAlbumCover(
              albumData.album,
              albumData.artist,
            );
            const album = new Album({
              title: albumData.album,
              artist: albumData.artist,
              year: albumData.year,
              tracks: tracksData.tracks || [],
              coverUrl,
            });
            uniqueAlbums.set(key, album);
          }
        }
      }
    }

    this.albums = Array.from(uniqueAlbums.values());
    this.filteredAlbums = [...this.albums];
    this._render();
    this._loading = false;
  }

  _render() {
    if (!this.container) return;
    if (this.filteredAlbums.length === 0) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-music"></i> Альбомы не найдены</div>';
      return;
    }
    this.container.innerHTML = "";
    this.filteredAlbums.forEach((album) => {
      const card = new AlbumCard(album, this.events);
      this.container.appendChild(card.render());
    });
  }

  search(term) {
    if (!term.trim()) {
      this.filteredAlbums = [...this.albums];
    } else {
      const lowerTerm = term.toLowerCase();
      this.filteredAlbums = this.albums.filter(
        (a) =>
          a.title.toLowerCase().includes(lowerTerm) ||
          a.artist.toLowerCase().includes(lowerTerm),
      );
    }
    this._render();
  }

  _showLoading() {
    if (this.container) {
      this.container.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
    }
  }

  _showError() {
    if (this.container) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
    }
  }
}
