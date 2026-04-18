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
