export class PlayerLifecycle {
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
          hasActivePlayback = true;
        }
      } else {
        const state = await this.api.getAudioPlaybackState();
        if (state && state.success && state.currentTrack) {
          this.core.setCurrentFile(state.currentTrack);
          this.core.setMediaType("audio");
          this.core.setPlaying(state.isPlaying || false);
          this.uiUpdater.updateFileInfo(state.currentTrack);
          this.uiUpdater.updatePlayPauseButton(state.isPlaying || false);
          this.uiUpdater.updateFullscreenButtonVisibility("audio");
          if (
            state.currentIndex !== undefined &&
            state.totalTracks !== undefined
          ) {
            this.uiUpdater.updateTrackCount(
              state.currentIndex,
              state.totalTracks,
            );
          }
          const metadata = await this.api.getFileMetadata(state.currentTrack);
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
              coverUrl = await this.api.getAlbumCover(
                state.currentTrack,
                title,
                artist,
              );
            }
          }
          if (!title) {
            let fileName = state.currentTrack.split("/").pop();
            fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
            const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
            title = match ? match[1] : fileName;
          }
          this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
          hasActivePlayback = true;
        }
      }
      if (hasActivePlayback) {
        if (this.polling) this.polling.start();
        if (this.onRestore) {
          this.onRestore();
        }
      }
      return hasActivePlayback;
    } catch (error) {
      console.error("[PlayerLifecycle] checkExistingPlayback error:", error);
      return false;
    }
  }

  clearState() {
    this.core.reset();
    this.uiUpdater.reset();
    this.progress.reset();
    if (this.polling) this.polling.stop();
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
      console.error("Error deleting video:", error);
      Utils.showNotification(
        "Ошибка удаления видео: " + error.message,
        "error",
      );
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
