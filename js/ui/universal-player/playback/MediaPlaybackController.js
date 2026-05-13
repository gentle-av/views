export class MediaPlaybackController {
  constructor(api, core, uiUpdater, onShow, onStop) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.onShow = onShow;
    this.onStop = onStop;
    this.onHide = null;
    this.progress = null;
    this.strategy = null;
    this.videoCloseModal = null;
    this.AudioPlaybackStrategy = null;
  }

  setAudioPlaybackStrategyClass(strategyClass) {
    this.AudioPlaybackStrategy = strategyClass;
  }

  setOnHide(callback) {
    this.onHide = callback;
  }

  setProgress(progress) {
    this.progress = progress;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  _ensureStrategy() {
    if (this.strategy) return true;
    if (
      this.core.hasActiveFile() &&
      this.core.isAudio() &&
      this.AudioPlaybackStrategy
    ) {
      this.strategy = new this.AudioPlaybackStrategy(this.api);
      this.strategy.setCore(this.core);
      this.strategy.setUIUpdater(this.uiUpdater);
      this.strategy.setProgress(this.progress);
      return true;
    }
    return false;
  }

  async stop(keepState = false) {
    if (this.strategy) await this.strategy.stop();
    if (!keepState) {
      this.core.reset();
      this.uiUpdater.reset();
      this.uiUpdater.updateFullscreenButtonVisibility(null);
      if (this.onHide) this.onHide();
      if (this.onStop) this.onStop();
    }
  }

  stopAudio() {
    this.stop(true);
  }

  async togglePlayPause() {
    this._ensureStrategy();
    if (this.strategy) await this.strategy.togglePlayPause();
  }

  async seek(time) {
    this._ensureStrategy();
    if (this.strategy) await this.strategy.seek(time);
  }

  async previous() {
    this._ensureStrategy();
    if (this.strategy) await this.strategy.previous();
  }

  async next() {
    this._ensureStrategy();
    if (this.strategy) await this.strategy.next();
  }

  async fullscreen() {
    if (this.core.isVideo()) {
      await this.api.controlVideo("fullscreen");
    } else {
      const element = document.getElementById("universalBottomPlayer");
      if (!document.fullscreenElement) {
        element?.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }

  forceRefreshPlayback(path) {
    this.core.setCurrentFile(path);
    this.core.setMediaType("audio");
    this.core.setPlaying(true);
    this.uiUpdater.updateFileInfo(path);
    this.uiUpdater.updatePlayPauseButton(true);
    this.onShow?.();
    if (this._forceRefresh) this._forceRefresh();
  }

  setForceRefresh(fn) {
    this._forceRefresh = fn;
  }

  async restoreFromState() {
    const status = await this.strategy?.getStatus();
    if (status?.success && status.currentFile) {
      this.core.setCurrentFile(status.currentFile);
      this.core.setPlaying(!status.paused);
      this.uiUpdater.updateFileInfo(status.currentFile);
      this.uiUpdater.updatePlayPauseButton(!status.paused);
      this.strategy?.updateUI();
      return true;
    }
    return false;
  }
}
