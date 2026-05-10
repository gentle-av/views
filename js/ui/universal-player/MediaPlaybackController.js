export class MediaPlaybackController {
  constructor(api, core, uiUpdater, onShow, onStop) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.onShow = onShow;
    this.onStop = onStop;
    this.onHide = null;
  }

  setOnHide(callback) {
    this.onHide = callback;
  }

  async stop(keepState = false) {
    if (this.core.isVideo()) {
      await this.api.closeVideo();
    } else {
      await this.api.audioStop();
    }
    if (!keepState) {
      this.core.reset();
      this.uiUpdater.reset();
      this.uiUpdater.updateFullscreenButtonVisibility(null);
      if (this.onHide) {
        this.onHide();
      }
      if (this.onStop) {
        this.onStop();
      }
    }
  }

  stopAudio() {
    this.stop(true);
  }

  async togglePlayPause() {
    if (this.core.isVideo()) {
      await this._toggleVideoPlayPause();
    } else {
      await this._toggleAudioPlayPause();
    }
  }

  async _toggleVideoPlayPause() {
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

  async _toggleAudioPlayPause() {
    const state = await this.api.getAudioPlaybackState();
    if (state?.success && state.totalTracks > 0) {
      if (this.core.isPlaying) {
        await this.api.audioPause();
      } else {
        await this.api.audioPlay();
      }
      this.core.setPlaying(!this.core.isPlaying);
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
    } else {
      Utils.showNotification("Плейлист пуст", "info");
    }
  }

  async seek(time) {
    if (this.core.isVideo()) {
      const response = await this.api.seekVideo(time);
      if (response.success) {
        this.progress.update(response.time, this.progress.duration);
      } else {
        Utils.showNotification("Ошибка перемотки", "error");
      }
    } else {
      await this.api.audioSeek(time);
      this.progress.update(time, this.progress.duration);
    }
  }

  async previous() {
    if (this.core.isVideo()) {
      await this._seekRelative(-10);
    } else {
      await this.api.audioPrevious();
    }
  }

  async next() {
    if (this.core.isVideo()) {
      await this._seekRelative(10);
    } else {
      await this.api.audioNext();
    }
  }

  async _seekRelative(seconds) {
    if (!this.core.hasActiveFile()) {
      Utils.showNotification("Нет активного медиа", "info");
      return;
    }
    const status = await this.api.getVideoStatus();
    let currentTime = 0;
    let duration = 0;
    if (status?.data) {
      currentTime = status.data.currentTime || 0;
      duration = status.data.duration || 0;
    } else if (status?.currentTime !== undefined) {
      currentTime = status.currentTime || 0;
      duration = status.duration || 0;
    }
    let newTime = currentTime + seconds;
    newTime = Math.max(0, Math.min(newTime, duration));
    const response = await this.api.seekVideo(newTime);
    if (response.success) {
      this.progress.update(newTime, duration);
    } else {
      Utils.showNotification("Ошибка перемотки", "error");
    }
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

  setProgress(progress) {
    this.progress = progress;
  }

  setVideoCloseModal(modal) {
    this.videoCloseModal = modal;
  }

  forceRefreshPlayback(path) {
    this.core.setCurrentFile(path);
    this.core.setMediaType("audio");
    this.core.setPlaying(true);
    this.uiUpdater.updateFileInfo(path);
    this.uiUpdater.updatePlayPauseButton(true);
    this.onShow?.();
    if (this._forceRefresh) {
      this._forceRefresh();
    }
  }

  setForceRefresh(fn) {
    this._forceRefresh = fn;
  }
}
