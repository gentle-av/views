export class PlayerLifeCycle {
  constructor(
    core,
    uiUpdater,
    progress,
    polling,
    api,
    apiClient,
    events,
    mediaHandler,
  ) {
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.progress = progress;
    this.polling = polling;
    this.api = api;
    this.apiClient = apiClient;
    this.events = events;
    this.mediaHandler = mediaHandler;
  }

  async checkExistingPlayback(type) {
    try {
      let hasActivePlayback = false;
      if (type === "video") {
        const status = await this.api.getVideoStatus();
        if (status && status.success && status.currentFile) {
          this.core.setCurrentFile(status.currentFile);
          this.core.setMediaType("video");
          this.core.setPlaying(!status.paused);
          this.uiUpdater.updateFileInfo(status.currentFile);
          this.uiUpdater.updatePlayPauseButton(!status.paused);
          this.uiUpdater.updateFullscreenButtonVisibility("video");
          const thumbnail = await this.api.getVideoThumbnail(
            status.currentFile,
          );
          if (thumbnail) {
            this.uiUpdater.showPreviewImage(thumbnail);
          } else {
            this.uiUpdater.updateMediaIcon("video");
          }
          hasActivePlayback = true;
        }
      } else {
        return false;
      }
      if (hasActivePlayback) {
        if (this.polling) {
          this.polling.stop();
          this.polling.start();
        }
        if (this.onRestore) {
          this.onRestore();
        }
      }
      return hasActivePlayback;
    } catch (error) {
      return false;
    }
  }

  clearState() {
    this.core.reset();
    this.uiUpdater.reset();
    this.progress.reset();
  }

  async deleteCurrentVideo() {
    const filePath = this.core.currentFile;
    const fileName = this._getFileName(filePath);
    try {
      await this.api.closeVideo();
      const response = await this.apiClient.post("/api/trash", {
        path: filePath,
      });
      if (response && response.success) {
        Utils.showNotification(`Видео "${fileName}" удалено`, "success");
        this.clearState();
        this.events.emit("video:refresh");
        return true;
      } else {
        Utils.showNotification(response?.error || "Ошибка удаления", "error");
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  _getFileName(filePath) {
    if (!filePath) return "файл";
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  }

  refreshVideo() {
    if (this.polling) {
      this.polling.stop();
      this.polling.start();
    }
  }
}
