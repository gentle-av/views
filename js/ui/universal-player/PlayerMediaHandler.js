export class PlayerMediaHandler {
  constructor(api, core, uiUpdater, progress, onShow) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.progress = progress;
    this.onShow = onShow;
  }

  async startPlayback(path, type) {
    if (this.core.isStartingVideo()) return;
    if (this.core.isSameFile(path, type) && this.core.isPlaying) {
      this.onShow?.();
      return;
    }
    if (
      this.core.mediaType &&
      this.core.mediaType !== type &&
      this.core.hasActiveFile()
    ) {
      await this.stop();
    }
    this.core.setMediaType(type);
    this.core.setCurrentFile(path);
    this.uiUpdater.updateFileInfo(path);
    this.uiUpdater.updateMediaIcon(type);
    if (type === "video") {
      await this._startVideo(path);
    } else {
      await this._startAudio(path);
    }
  }

  async _startVideo(path) {
    this.core.startStartingVideo();
    this.uiUpdater.updateTrackInfo("Видео", "");
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
      this.onShow?.();
      this.uiUpdater.updatePlayPauseButton(true);
      this.core.setPlaying(true);
      this.core.finishStartingVideo();
    } catch (error) {
      console.error("Error starting video:", error);
      Utils.showNotification("Ошибка запуска видео", "error");
      this.core.finishStartingVideo();
    }
  }

  async _startAudio(path) {
    await this.api.closeVideo();
    await this._loadAlbumCover(path);
    this.onShow?.();
    this.uiUpdater.updatePlayPauseButton(true);
    this.core.setPlaying(true);
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (timeInfo && timeInfo.data && timeInfo.data.duration > 0) {
        this.progress.update(this.progress.currentTime, timeInfo.data.duration);
      }
    }, 500);
  }

  async _loadAlbumCover(filePath) {
    try {
      const metadata = await this.api.getFileMetadata(filePath);
      if (metadata?.data?.file?.cover) {
        this.uiUpdater.showPreviewImage(metadata.data.file.cover);
        return;
      }
      let artist = "",
        title = "";
      if (metadata?.data?.database) {
        artist = metadata.data.database.artist || "";
        title = metadata.data.database.album || "";
      }
      if (!title) {
        const pathParts = filePath.split("/");
        if (pathParts.length >= 2) title = pathParts[pathParts.length - 2];
      }
      if (title) {
        const coverUrl = await this.api.getAlbumCover(filePath, title, artist);
        if (coverUrl) {
          this.uiUpdater.showPreviewImage(coverUrl);
          return;
        }
      }
    } catch (error) {}
  }

  async stop() {
    if (this.core.isVideo()) {
      await this.api.closeVideo();
    } else if (this.core.isAudio() && this.api.playerApi) {
      await this.api.audioStop();
    }
    this.core.reset();
    this.uiUpdater.reset();
  }

  async togglePlayPause() {
    if (this.core.isVideo()) {
      return this._toggleVideoPlayPause();
    } else if (this.core.isAudio() && this.api.playerApi) {
      return this._toggleAudioPlayPause();
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
    if (state?.data?.totalTracks > 0) {
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
    } else if (this.core.isAudio() && this.api.playerApi) {
      await this.api.audioSeek(time);
      this.progress.update(time, this.progress.duration);
    }
  }

  async previous() {
    if (this.core.isAudio() && this.api.playerApi) {
      await this.api.audioPrevious();
    }
  }

  async next() {
    if (this.core.isAudio() && this.api.playerApi) {
      await this.api.audioNext();
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
}
