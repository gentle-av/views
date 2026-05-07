export class AlbumLibraryState {
  constructor() {
    this.albums = [];
    this.filteredAlbums = [];
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
    this._trackPathToMetadata = new Map();
  }

  get loading() {
    return this._loading;
  }
  set loading(val) {
    this._loading = val;
  }
  get isDestroyed() {
    return this._isDestroyed;
  }
  set isDestroyed(val) {
    this._isDestroyed = val;
  }
  get currentPage() {
    return this._currentPage;
  }
  set currentPage(val) {
    this._currentPage = val;
  }
  get pageSize() {
    return this._pageSize;
  }
  get currentArtist() {
    return this._currentArtist;
  }
  set currentArtist(val) {
    this._currentArtist = val;
  }
  get artistsList() {
    return this._artistsList;
  }
  set artistsList(val) {
    this._artistsList = val;
  }
  get currentArtistIndex() {
    return this._currentArtistIndex;
  }
  set currentArtistIndex(val) {
    this._currentArtistIndex = val;
  }
  get isLoadingMore() {
    return this._isLoadingMore;
  }
  set isLoadingMore(val) {
    this._isLoadingMore = val;
  }

  indexTracks() {
    this._trackPathToMetadata.clear();
    for (const album of this.albums) {
      for (const track of album.tracks) {
        this._trackPathToMetadata.set(track.path, {
          title: track.title || track.name,
          artist: album.artist,
          album: album.title,
          duration: track.duration || 0,
        });
      }
    }
  }

  getMetadataByPath(path) {
    return this._trackPathToMetadata.get(path);
  }

  reset() {
    this.albums = [];
    this.filteredAlbums = [];
    this._currentPage = 1;
    this._currentArtistIndex = 0;
    this._artistsList = [];
    this._trackPathToMetadata.clear();
    this._loading = false;
    this._isLoadingMore = false;
  }

  destroy() {
    this._isDestroyed = true;
    this.reset();
  }
}
