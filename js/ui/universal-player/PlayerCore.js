// js/ui/universal-player/PlayerCore.js
export class PlayerCore {
  constructor() {
    this.mediaType = null;
    this.currentFile = null;
    this.isPlaying = false;
    this._isDestroyed = false;
    this._isStartingVideo = false;
    this._ignorePollingUpdate = false;
  }

  setMediaType(type) {
    this.mediaType = type;
  }

  setPlaying(playing, ignorePolling = false) {
    this.isPlaying = playing;
    if (ignorePolling) {
      this._ignorePollingUpdate = true;
      setTimeout(() => {
        this._ignorePollingUpdate = false;
      }, 500);
    }
  }

  setCurrentFile(file) {
    this.currentFile = file;
  }

  isVideo() {
    return this.mediaType === "video";
  }
  isAudio() {
    return this.mediaType === "audio";
  }
  hasActiveFile() {
    return !!this.currentFile;
  }

  isSameFile(path, type) {
    return this.currentFile === path && this.mediaType === type;
  }

  startStartingVideo() {
    this._isStartingVideo = true;
  }

  finishStartingVideo() {
    this._isStartingVideo = false;
  }

  isStartingVideo() {
    return this._isStartingVideo;
  }

  shouldIgnorePolling() {
    return this._ignorePollingUpdate;
  }

  reset() {
    this.currentFile = null;
    this.isPlaying = false;
    this._ignorePollingUpdate = false;
  }

  destroy() {
    this._isDestroyed = true;
  }

  isDestroyed() {
    return this._isDestroyed;
  }
}
