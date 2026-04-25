class AlbumLibrary {
  constructor(musicApi, events) {
    this.api = musicApi;
    this.events = events;
    this.albums = [];
    this.filteredAlbums = [];
    this.container = document.getElementById("albumsGrid");
    this._loading = false;
    this._isDestroyed = false;
    this._pendingRenders = [];
  }

  destroy() {
    console.log("[AlbumLibrary] destroy called");
    this._loading = false;
    this._isDestroyed = true;
    this.albums = [];
    this.filteredAlbums = [];
    if (this.container) {
      this.container.innerHTML = "";
    }
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  async init() {
    await this._loadAlbumsAsync();
    this.events.on("albumDelete", () => this._loadAlbumsAsync());
    this.events.on("albumEdit", () => this._loadAlbumsAsync());
    this.events.on("albumContextMenu", ({ x, y, album }) =>
      this._showContextMenu(x, y, album),
    );
    this.events.on("albumClick", (album) => this._showAlbumModal(album));
    window.addEventListener("albumTagsUpdated", () => this._loadAlbumsAsync());
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

  async _loadAlbumsAsync() {
    if (this._loading || this._isDestroyed) return;
    this._loading = true;
    const artistsData = await this.api.getArtists();
    if (!artistsData?.artists || this._isDestroyed) {
      if (!this._isDestroyed) this._showError();
      this._loading = false;
      return;
    }
    this.albums = [];
    this.filteredAlbums = [];
    if (this.container) {
      this.container.innerHTML = "";
    }
    const uniqueAlbums = new Map();
    let processedArtists = 0;
    for (const artist of artistsData.artists) {
      if (this._isDestroyed) break;
      const albumsData = await this.api.getAlbums(artist);
      if (albumsData?.albums) {
        for (const albumData of albumsData.albums) {
          if (this._isDestroyed) break;
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
            this.albums.push(album);
            const currentAlbums = Array.from(uniqueAlbums.values());
            this.filteredAlbums = [...currentAlbums];
            this._renderStreaming(currentAlbums);
            await this._delay(50);
          }
        }
      }
      processedArtists++;
      if (processedArtists % 3 === 0) {
        await this._delay(10);
      }
    }
    this.albums = Array.from(uniqueAlbums.values());
    this.filteredAlbums = [...this.albums];
    this._render();
    this._loading = false;
  }

  _renderStreaming(albums) {
    if (!this.container || this._isDestroyed) return;
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
    this._animationFrame = requestAnimationFrame(() => {
      if (!this.container || this._isDestroyed) return;
      const existingCards = this.container.children;
      const existingCount = existingCards.length;
      if (existingCount === 0 && albums.length > 0) {
        this.container.innerHTML = "";
      }
      const remainingAlbums = albums.slice(existingCount);
      for (let i = 0; i < remainingAlbums.length; i++) {
        const album = remainingAlbums[i];
        const card = new AlbumCard(album, this.events);
        this.container.appendChild(card.render());
      }
    });
  }

  _delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _render() {
    if (!this.container || this._isDestroyed) return;
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
    if (this.filteredAlbums.length === this.albums.length) {
      this._renderStreaming(this.filteredAlbums);
    } else {
      this._render();
    }
  }

  _closeAllSwipes() {
    if (!this.container) return;
    const cards = this.container.querySelectorAll(".album-card");
    cards.forEach((card) => {
      card.classList.remove("swipe-left");
      card.style.transform = "translateX(0)";
    });
  }

  _showLoading() {
    if (this.container && !this._isDestroyed) {
      this.container.innerHTML = "";
    }
  }

  _showError() {
    if (this.container && !this._isDestroyed) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
    }
  }
}
