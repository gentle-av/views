export class AlbumModalState {
  constructor() {
    this._currentAlbum = null;
    this.modal = document.getElementById("albumModal");
    this.titleEl = document.getElementById("modalAlbumTitle");
    this.tracksContainer = document.getElementById("modalTracksList");
  }

  get currentAlbum() {
    return this._currentAlbum;
  }
  set currentAlbum(album) {
    this._currentAlbum = album;
  }

  getModal() {
    return this.modal;
  }
  getTitleEl() {
    return this.titleEl;
  }
  getTracksContainer() {
    return this.tracksContainer;
  }

  reset() {
    this._currentAlbum = null;
  }
}
