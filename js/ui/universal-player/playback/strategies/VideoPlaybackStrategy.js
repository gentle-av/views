import { PlaybackStrategy } from "./PlaybackStrategy.js";
export class VideoPlaybackStrategy extends PlaybackStrategy {
  constructor(api) {
    super();
    this.api = api;
    this.core = null;
    this.uiUpdater = null;
    this.progress = null;
    this.onShow = null;
    this._forceRefresh = null;
  }

  setCore(core) {
    this.core = core;
  }

  setUIUpdater(uiUpdater) {
    this.uiUpdater = uiUpdater;
  }

  setProgress(progress) {
    this.progress = progress;
  }

  setOnShow(onShow) {
    this.onShow = onShow;
  }

  setForceRefresh(fn) {
    this._forceRefresh = fn;
  }

  async start(path) {
    this.core.startStartingVideo();
    this.uiUpdater.updateTrackInfo("Видео", "");
    this.uiUpdater.updateFullscreenButtonVisibility("video");
    this.onShow?.();
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
    setTimeout(() => this._forceRefresh?.(), 100);
  }

  async stop() {
    await this.api.closeVideo();
  }

  async togglePlayPause() {
    if (!this.core.hasActiveFile()) {
      Utils.showNotification("Нет активного видео", "info");
      return;
    }
    const status = await this.api.getVideoStatus();
    if (!status.success || status.reason === "process_dead") {
      Utils.showNotification(
        "Видео не загружено или процесс завершён",
        "error",
      );
      return;
    }
    const command = this.core.isPlaying ? "pause" : "play";
    const response = await this.api.controlVideo(command);
    if (response.success) {
      this.core.setPlaying(!this.core.isPlaying, true);
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
    } else {
      Utils.showNotification("Ошибка управления видео", "error");
    }
  }

  async seek(time) {
    const response = await this.api.seekVideo(time);
    if (response.success) {
      this.progress.update(response.time, this.progress.duration);
    } else {
      Utils.showNotification("Ошибка перемотки", "error");
    }
  }

  async previous() {
    await this._seekRelative(-10);
  }

  async next() {
    await this._seekRelative(10);
  }

  async _seekRelative(seconds) {
    if (!this.core.hasActiveFile()) {
      Utils.showNotification("Нет активного медиа", "info");
      return;
    }
    const status = await this.api.getVideoStatus();
    let currentTime = status?.data?.currentTime || status?.currentTime || 0;
    let duration = status?.data?.duration || status?.duration || 0;
    let newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    const response = await this.api.seekVideo(newTime);
    if (response.success) {
      this.progress.update(newTime, duration);
    } else {
      Utils.showNotification("Ошибка перемотки", "error");
    }
  }

  async getStatus() {
    return this.api.getVideoStatus();
  }

  async getCurrentTime() {
    const status = await this.api.getVideoStatus();
    return {
      currentTime: status?.currentTime || 0,
      duration: status?.duration || 0,
    };
  }

  updateUI() {
    this.uiUpdater.updateFullscreenButtonVisibility("video");
  }
}
