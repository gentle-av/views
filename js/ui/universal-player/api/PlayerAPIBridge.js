export class PlayerAPIBridge {
  constructor(api, lifecycle, mediaHandler) {
    this.api = api;
    this.lifecycle = lifecycle;
    this.mediaHandler = mediaHandler;
  }

  getVideoStatus() {
    return this.api.getVideoStatus();
  }

  getAudioPlaybackState() {
    return this.api.getAudioPlaybackState();
  }

  getAudioCurrentTime() {
    return this.api.getAudioCurrentTime();
  }

  getFileMetadata(path) {
    return this.api.getFileMetadata(path);
  }

  getAlbumCover(path, title, artist) {
    return this.api.getAlbumCover(path, title, artist);
  }

  closeVideo() {
    return this.api.closeVideo();
  }

  openFile(path) {
    return this.api.openFile(path);
  }

  controlVideo(command) {
    return this.api.controlVideo(command);
  }

  seekVideo(time) {
    return this.api.seekVideo(time);
  }

  audioPlay() {
    return this.api.audioPlay();
  }

  audioPause() {
    return this.api.audioPause();
  }

  audioStop() {
    return this.api.audioStop();
  }

  audioNext() {
    return this.api.audioNext();
  }

  audioPrevious() {
    return this.api.audioPrevious();
  }

  audioSeek(time) {
    return this.api.audioSeek(time);
  }

  getVideoThumbnail(path) {
    return this.api.getVideoThumbnail(path);
  }

  clearState() {
    this.lifecycle?.clearState();
  }

  destroy() {
    if (this.lifecycle) {
      this.lifecycle.clearState();
    }
  }
}
