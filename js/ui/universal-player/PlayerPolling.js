export class PlayerPolling {
  constructor(api, core, progress, uiUpdater, onStateChange) {
    this.api = api;
    this.core = core;
    this.progress = progress;
    this.uiUpdater = uiUpdater;
    this.onStateChange = onStateChange;
    this._progressInterval = null;
    this._isPollingStarted = false;
    this._lastCurrentTime = 0;
  }

  start() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
    this._isPollingStarted = true;
    this._progressInterval = setInterval(async () => {
      if (this.core.isDestroyed()) return;
      if (this.core.shouldIgnorePolling()) return;
      try {
        if (this.core.isAudio() && this.api.playerApi) {
          await this._pollAudio();
        } else if (this.core.isVideo()) {
          await this._pollVideo();
        } else {
        }
      } catch (error) {
        console.error("[Polling] error:", error);
      }
    }, 500);
  }

  async _pollAudio() {
    const timeInfo = await this.api.getAudioCurrentTime();
    if (timeInfo && timeInfo.success) {
      this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
    } else {
    }
    const state = await this.api.getAudioPlaybackState();
    if (state && state.success) {
      const trackChanged =
        state.currentTrack && state.currentTrack !== this.core.currentFile;
      if (trackChanged) {
        this.core.currentFile = state.currentTrack;
        this.uiUpdater.updateFileInfo(this.core.currentFile);
        const metadata = await this.api.getFileMetadata(this.core.currentFile);
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
              this.core.currentFile,
              title,
              artist,
            );
          }
        }
        if (!title) {
          let fileName = this.core.currentFile.split("/").pop();
          fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
          const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
          title = match ? match[1] : fileName;
        }
        this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
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
    if (!status) {
      return;
    }
    if (status.success && status.currentFile) {
      if (status.currentFile !== this.core.currentFile) {
        this.core.currentFile = status.currentFile;
        this.uiUpdater.updateFileInfo(this.core.currentFile);
      }
      const isPlaying = !status.paused;
      if (this.core.isPlaying !== isPlaying) {
        this.core.setPlaying(isPlaying);
        this.uiUpdater.updatePlayPauseButton(isPlaying);
      }
      const currentTime = status.currentTime || 0;
      const duration = status.duration || 0;
      this.progress.update(currentTime, duration);
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
