// album-library.js
class AlbumLibrary {
  constructor(musicApi, events) {
    this.api = musicApi;
    this.events = events;
    this.albums = [];
    this.filteredAlbums = [];
    this.container = document.getElementById("albumsGrid");
    this._loading = false;
    this._isDestroyed = false;
    this._currentPage = 1;
    this._pageSize = 20;
    this._totalPages = 0;
    this._currentArtist = null;
    this._artistsList = [];
    this._currentArtistIndex = 0;
    this._isLoadingMore = false;
    this._lastClickedAlbum = null;
    this._lastClickTime = 0;
  }

  destroy() {
    this._loading = false;
    this._isDestroyed = true;
    this.albums = [];
    this.filteredAlbums = [];
    if (this.container) {
      this.container.innerHTML = "";
    }
    window.removeEventListener("scroll", this._handleScroll.bind(this));
  }

  async init() {
    await this._loadArtistsAndFirstAlbums();
    this.events.on("albumDelete", () => this.refresh());
    this.events.on("albumEdit", () => this.refresh());
    this.events.on("albumContextMenu", ({ x, y, album }) =>
      this._showContextMenu(x, y, album),
    );
    this.events.on("albumClick", (album) => {
      if (
        this._lastClickedAlbum === album.title &&
        Date.now() - this._lastClickTime < 500
      ) {
        return;
      }
      this._lastClickedAlbum = album.title;
      this._lastClickTime = Date.now();
      this.events.emit("album:open", album);
    });
    window.addEventListener("albumTagsUpdated", () => this.refresh());
    window.addEventListener("scroll", this._handleScroll.bind(this));
  }

  async refresh() {
    this.albums = [];
    this.filteredAlbums = [];
    this._currentPage = 1;
    this._currentArtistIndex = 0;
    this._artistsList = await this.api.getArtists();
    await this._loadMoreAlbums();
    this._render();
  }

  async _loadArtistsAndFirstAlbums() {
    if (this._loading || this._isDestroyed) return;
    this._loading = true;
    if (this.container) {
      this.container.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка альбомов...</div>';
    }
    this._artistsList = await this.api.getArtists();
    if (
      !this._artistsList ||
      this._artistsList.length === 0 ||
      this._isDestroyed
    ) {
      if (!this._isDestroyed) this._showError();
      this._loading = false;
      return;
    }
    this.albums = [];
    this.filteredAlbums = [];
    this._currentArtistIndex = 0;
    this._currentArtist = this._artistsList[0];
    await this._loadMoreAlbums();
    this._loading = false;
  }

  async _loadMoreAlbums() {
    if (this._isLoadingMore || this._isDestroyed) return;
    this._isLoadingMore = true;
    this._render();
    while (this._currentArtistIndex < this._artistsList.length) {
      const artist = this._artistsList[this._currentArtistIndex];
      const result = await this.api.getAlbumsPaginated(
        artist,
        this._currentPage,
        this._pageSize,
      );
      if (result.albums && result.albums.length > 0) {
        for (const albumData of result.albums) {
          const key = `${albumData.artist}|${albumData.album}`;
          if (!this.albums.some((a) => `${a.artist}|${a.title}` === key)) {
            const coverUrl = await this.api.fetchAlbumCover(
              albumData.album,
              albumData.artist,
            );
            const album = new Album({
              title: albumData.album,
              artist: albumData.artist,
              year: albumData.year,
              tracks: [],
              coverUrl,
            });
            this.albums.push(album);
          }
        }
        this.filteredAlbums = [...this.albums];
        this._render();
        if (result.pagination.hasNext) {
          this._currentPage++;
          this._isLoadingMore = false;
          return;
        }
      }
      this._currentArtistIndex++;
      this._currentPage = 1;
    }
    this._isLoadingMore = false;
    this._render();
  }

  _handleScroll() {
    if (this._isDestroyed || this._isLoadingMore || this._loading) return;
    const scrollable = document.getElementById("scrollableContent");
    if (!scrollable) return;
    const scrollHeight = scrollable.scrollHeight;
    const scrollTop = scrollable.scrollTop;
    const clientHeight = scrollable.clientHeight;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      this._loadMoreAlbums();
    }
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

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  _extractNameFromPath(path) {
    if (!path) return "Без названия";
    const fileName = path.split("/").pop();
    return fileName.replace(/\.(flac|mp3|m4a|wav)$/i, "");
  }

  async _loadAlbumsAsync() {
    await this._loadArtistsAndFirstAlbums();
  }

  _render() {
    if (!this.container || this._isDestroyed) return;
    const loadingIndicator = this.container.querySelector(".loading");
    if (
      loadingIndicator &&
      this.filteredAlbums.length === 0 &&
      !this._isLoadingMore
    ) {
      return;
    }
    if (loadingIndicator) {
      loadingIndicator.remove();
    }
    if (this.filteredAlbums.length === 0 && !this._isLoadingMore) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-music"></i> Альбомы не найдены</div>';
      return;
    }
    const existingCards = this.container.querySelectorAll(
      ".album-swipe-delete-container",
    );
    const existingCount = existingCards.length;
    const newAlbums = this.filteredAlbums.slice(existingCount);
    for (const album of newAlbums) {
      const card = new AlbumCard(album, this.events);
      this.container.appendChild(card.render());
    }
    const oldLoadingMore = this.container.querySelector(".loading-more");
    if (oldLoadingMore) {
      oldLoadingMore.remove();
    }
    if (this._isLoadingMore) {
      const loadingMore = document.createElement("div");
      loadingMore.className = "loading-more";
      loadingMore.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Загрузка альбомов...';
      this.container.appendChild(loadingMore);
    }
  }

  search(term) {
    this._closeAllSwipes();
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
    this.container.innerHTML = "";
    this._render();
  }

  _closeAllSwipes() {
    if (!this.container) return;
    const cards = this.container.querySelectorAll(".album-card");
    cards.forEach((card) => {
      card.classList.remove("swipe-left");
      card.style.transform = "translateX(0)";
    });
  }

  _showError() {
    if (this.container && !this._isDestroyed) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
    }
  }
}
