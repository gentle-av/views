export class VideoPlaybackStarter {
  constructor(api, core, uiUpdater, progress, onShow) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.progress = progress;
    this.onShow = onShow;
    this._forceRefreshVideo = null;
  }

  setForceRefreshVideo(fn) {
    this._forceRefreshVideo = fn;
  }

  async start(path) {
    this.core.startStartingVideo();
    this.uiUpdater.updateTrackInfo("Видео", "");
    this.uiUpdater.updateFullscreenButtonVisibility("video");
    this.onShow?.();
    try {
      const thumbnail = await this.api.getVideoThumbnail(path);
      if (thumbnail) this.uiUpdater.showPreviewImage(thumbnail);
      await this.api.closeVideo();
      const response = await this.api.openFile(path);
      if (!response.success) {
        Utils.showNotification(
          response.error || "Ошибка воспроизведения",
          "error",
        );
        this.core.finishStartingVideo();
        return;
      }
      this.uiUpdater.updatePlayPauseButton(true);
      this.core.setPlaying(true);
      this.core.finishStartingVideo();
      this.progress.reset();
      setTimeout(() => {
        if (this._forceRefreshVideo) {
          this._forceRefreshVideo();
        }
      }, 100);
    } catch (error) {
      Utils.showNotification("Ошибка запуска видео", "error");
      this.core.finishStartingVideo();
    }
  }
}
