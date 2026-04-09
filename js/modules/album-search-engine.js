class AlbumSearchEngine {
  constructor(library) {
    this.library = library;
  }

  async performSearch(searchTerm) {
    if (!searchTerm.trim()) {
      this.library.filteredAlbums = [...this.library.albums];
      if (this.library.uiRenderer) {
        this.library.uiRenderer.renderAlbums();
      }
      return;
    }
    const term = searchTerm.toLowerCase();
    this.library.filteredAlbums = this.library.albums.filter(
      (album) =>
        album.title.toLowerCase().includes(term) ||
        album.artist.toLowerCase().includes(term),
    );
    if (this.library.uiRenderer) {
      this.library.uiRenderer.renderAlbums();
    }
  }

  updateSearchModeIndicator() {
    const modeIndicator = document.getElementById("searchModeIndicator");
    if (!modeIndicator) return;
    if (this.library.searchMode === "albums") {
      modeIndicator.innerHTML =
        '<i class="fas fa-album"></i> Поиск по альбомам';
    } else {
      modeIndicator.innerHTML =
        '<i class="fas fa-headphones"></i> Поиск по трекам';
    }
  }
}
