export class PlayerEventHandler {
  constructor(mediaHandler, volume, output, progress, videoCloseModal) {
    this.mediaHandler = mediaHandler;
    this.volume = volume;
    this.output = output;
    this.progress = progress;
    this._videoCloseModal = videoCloseModal;
    this._clearAudioPlaylist = this._clearAudioPlaylist.bind(this);
  }

  async _clearAudioPlaylist() {
    try {
      await this.mediaHandler.api.audioStop();
      await this.mediaHandler.api.api.post("/api/audio/clear");
    } catch (error) {}
  }

  getHandlers() {
    return {
      onTogglePlayPause: () => this.mediaHandler.togglePlayPause(),
      onPrev: () => this.mediaHandler.previous(),
      onNext: () => this.mediaHandler.next(),
      onStop: () => {
        if (
          this.mediaHandler.core.isVideo() &&
          this.mediaHandler.core.hasActiveFile()
        ) {
          if (this._videoCloseModal) {
            this._videoCloseModal.showWithCurrentVideo();
          } else {
            this.mediaHandler.stop();
          }
        } else {
          this.mediaHandler.stop(false);
          this._clearAudioPlaylist();
          if (this.mediaHandler.onHide) {
            this.mediaHandler.onHide();
          }
        }
      },
      onFullscreen: () => this.mediaHandler.fullscreen(),
      onToggleMinimize: () => this.mediaHandler.toggleMinimize?.(),
      onToggleSettings: () => this.mediaHandler.toggleSettings?.(),
      onVolumeDown: () => this.volume.changeVolume(-5),
      onVolumeUp: () => this.volume.changeVolume(5),
      onToggleMute: () => this.volume.toggleMute(),
      onVolumeSet: (volume) => this.volume.setVolume(volume),
      onSpeakers: () => this.output.switchToSpeakers(),
      onHeadphones: () => this.output.switchToHeadphones(),
      onProgressClick: (e) => {
        const seekTime = this.progress.getSeekTimeFromClick(e);
        if (seekTime !== null) this.mediaHandler.seek(seekTime);
      },
    };
  }
}
