export class MediaCenterState {
  constructor() {
    this._lastPlayPath = null;
    this._lastPlayTime = 0;
    this._currentPage = "video";
    this._isInitialized = false;
    this._isDestroyed = false;
  }

  get lastPlayPath() {
    return this._lastPlayPath;
  }

  set lastPlayPath(value) {
    this._lastPlayPath = value;
  }

  get lastPlayTime() {
    return this._lastPlayTime;
  }

  set lastPlayTime(value) {
    this._lastPlayTime = value;
  }

  get currentPage() {
    return this._currentPage;
  }

  set currentPage(value) {
    this._currentPage = value;
  }

  get isInitialized() {
    return this._isInitialized;
  }

  set isInitialized(value) {
    this._isInitialized = value;
  }

  get isDestroyed() {
    return this._isDestroyed;
  }

  reset() {
    this._lastPlayPath = null;
    this._lastPlayTime = 0;
    this._currentPage = "video";
  }

  destroy() {
    this._isDestroyed = true;
    this.reset();
  }
}
