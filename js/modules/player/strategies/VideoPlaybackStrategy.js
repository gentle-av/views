import { PlaybackStrategy } from './PlaybackStrategy.js';

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
    const fileName = this._getFileName(path);
    this.uiUpdater.updateTrackInfo(fileName, '');
    this.uiUpdater.updateFullscreenButtonVisibility('video');
    this.onShow?.();
    const thumbnail = await this.api.getVideoThumbnail(path);
    if (thumbnail) this.uiUpdater.showPreviewImage(thumbnail);
    await this.api.closeVideo();
    const response = await this.api.openFile(path);
    if (!response.success) {
      this.uiUpdater.showNotification(response.error || 'Ошибка воспроизведения', 'error');
      this.core.finishStartingVideo();
      return;
    }
    this.uiUpdater.updatePlayPauseButton(true);
    this.core.setCurrentFile(path);
    this.core.setMediaType('video');
    this.core.setPlaying(true);
    this.core.finishStartingVideo();
    this.progress.reset();
    setTimeout(() => this._forceRefresh?.(), 100);
    setTimeout(async () => {
      try {
        const status = await this.api.getVideoStatus();
        if (status?.success && status.currentTime && status.duration) {
          this.progress.update(status.currentTime, status.duration);
        }
      } catch (e) {
        console.warn('Failed to get initial video status', e);
      }
    }, 500);
  }

  _getFileName(path) {
    if (!path) return 'Видео';
    const parts = path.split('/');
    let fileName = parts[parts.length - 1];
    fileName = fileName.replace(/\.[^/.]+$/, '');
    const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
    return match ? match[1] : fileName;
  }

  async stop() {
    await this.api.closeVideo();
  }

  async togglePlayPause() {
    if (!this.core.hasActiveFile()) {
      this.uiUpdater.showNotification('Нет активного видео', 'info');
      return;
    }
    const status = await this.api.getVideoStatus();
    if (!status.success || status.reason === 'process_dead') {
      this.uiUpdater.showNotification('Видео не загружено или процесс завершён', 'error');
      return;
    }
    const command = this.core.isPlaying ? 'pause' : 'play';
    const response = await this.api.controlVideo(command);
    if (response.success) {
      this.core.setPlaying(!this.core.isPlaying, true);
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
    } else {
      this.uiUpdater.showNotification('Ошибка управления видео', 'error');
    }
  }

  async seek(time) {
    const response = await this.api.seekVideo(time);
    if (response.success) {
      this.progress.update(response.time, this.progress.duration);
    } else {
      this.uiUpdater.showNotification('Ошибка перемотки', 'error');
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
      this.uiUpdater.showNotification('Нет активного медиа', 'info');
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
      this.uiUpdater.showNotification('Ошибка перемотки', 'error');
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
    this.uiUpdater.updateFullscreenButtonVisibility('video');
  }
}
