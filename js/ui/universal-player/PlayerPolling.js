export class PlayerPolling {
  constructor(api, core, progress, uiUpdater, onStateChange) {
    this.api = api;
    this.core = core;
    this.progress = progress;
    this.uiUpdater = uiUpdater;
    this.onStateChange = onStateChange;
    this._progressInterval = null;
    this._isPollingStarted = false;
  }

  start() {
    if (this._progressInterval || this._isPollingStarted) return;
    this._isPollingStarted = true;
    this._progressInterval = setInterval(async () => {
      if (this.core.isDestroyed()) return;
      if (this.core.shouldIgnorePolling()) return;
      try {
        if (this.core.isAudio() && this.api.playerApi) {
          await this._pollAudio();
        } else if (this.core.isVideo()) {
          await this._pollVideo();
        }
      } catch (error) {}
    }, 500);
  }

  async _pollAudio() {
    const timeInfo = await this.api.getAudioCurrentTime();
    if (timeInfo && timeInfo.success) {
      this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
    }
    const state = await this.api.getAudioPlaybackState();
    if (state && state.success) {
      if (state.currentTrack && state.currentTrack !== this.core.currentFile) {
        this.core.currentFile = state.currentTrack;
        this.uiUpdater.updateFileInfo(this.core.currentFile);
        if (this.onStateChange) this.onStateChange(state);
      }
      const wasPlaying = this.core.isPlaying;
      this.core.isPlaying = state.isPlaying || false;
      if (wasPlaying !== this.core.isPlaying) {
        this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
      }
      if (state.currentIndex !== undefined && state.totalTracks !== undefined) {
        this.uiUpdater.updateTrackCount(state.currentIndex, state.totalTracks);
      }
    }
  }

  async _pollVideo() {
    const status = await this.api.getVideoStatus();
    if (status.success && status.currentFile) {
      if (status.currentFile !== this.core.currentFile) {
        this.core.currentFile = status.currentFile;
        this.uiUpdater.updateFileInfo(this.core.currentFile);
      }
      this.progress.update(status.currentTime || 0, status.duration || 0);
    }
  }

  stop() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
      this._isPollingStarted = false;
    }
  }
}
