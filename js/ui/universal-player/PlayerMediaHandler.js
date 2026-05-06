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
    this.core.setMediaType(type);
  }

  async _startVideo(path) {
    this.core.startStartingVideo();
    this.uiUpdater.updateTrackInfo("Видео", "");
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
      console.error("Error starting video:", error);
      Utils.showNotification("Ошибка запуска видео", "error");
      this.core.finishStartingVideo();
    }
  }

  setForceRefreshVideo(fn) {
    this._forceRefreshVideo = fn;
  }

  setForceRefresh(fn) {
    this._forceRefresh = fn;
  }

  async _startAudio(path) {
    await this.api.closeVideo();
    const metadata = await this.api.getFileMetadata(path);
    let artist = "";
    let title = "";
    let coverUrl = null;
    if (metadata?.data) {
      if (metadata.data.file) {
        artist = metadata.data.file.artist || "";
        title = metadata.data.file.title || "";
        coverUrl = metadata.data.file.cover || null;
      }
      if (!title && metadata.data.database) {
        title = metadata.data.database.title || "";
        artist = metadata.data.database.artist || "";
      }
      if (!coverUrl && title) {
        coverUrl = await this.api.getAlbumCover(path, title, artist);
      }
    }
    if (!title) {
      let fileName = path.split("/").pop();
      fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
      const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
      title = match ? match[1] : fileName;
    }
    this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
    this.onShow?.();
    this.uiUpdater.updatePlayPauseButton(true);
    this.core.setPlaying(true);
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (timeInfo && timeInfo.success) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 500);
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (timeInfo && timeInfo.success) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 1500);
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
    } else if (this.core.isAudio() && this.api.playerApi) {
      await this.api.audioSeek(time);
      this.progress.update(time, this.progress.duration);
    }
  }

  async previous() {
    if (this.core.isVideo()) {
      await this._seekRelative(-10);
    } else if (this.core.isAudio() && this.api.playerApi) {
      await this.api.audioPrevious();
    }
  }

  async next() {
    if (this.core.isVideo()) {
      await this._seekRelative(10);
    } else if (this.core.isAudio() && this.api.playerApi) {
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
}
