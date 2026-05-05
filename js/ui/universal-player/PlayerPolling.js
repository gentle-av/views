export class PlayerPolling {
  constructor(api, core, progress, uiUpdater, onStateChange) {
    this.api = api;
    this.core = core;
    this.progress = progress;
    this.uiUpdater = uiUpdater;
    this.onStateChange = onStateChange;
    this._progressInterval = null;
    this._isPollingStarted = false;
  }

  start() {
    if (this._progressInterval || this._isPollingStarted) return;
    this._isPollingStarted = true;
    this._progressInterval = setInterval(async () => {
      if (this.core.isDestroyed()) return;
      if (this.core.shouldIgnorePolling()) return;
      try {
        if (this.core.isAudio() && this.api.playerApi) {
          await this._pollAudio();
        } else if (this.core.isVideo()) {
          await this._pollVideo();
        }
      } catch (error) {}
    }, 500);
  }

  async _pollAudio() {
    console.log(
      "[DEBUG] _pollAudio called, core.isAudio():",
      this.core.isAudio(),
      "playerApi exists:",
      !!this.api.playerApi,
    );
    const timeInfo = await this.api.getAudioCurrentTime();
    console.log("[DEBUG] timeInfo:", timeInfo);
    if (timeInfo && timeInfo.success) {
      this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
    }
    const state = await this.api.getAudioPlaybackState();
    console.log("[DEBUG] playback state:", state);
    if (state && state.success) {
      console.log(
        "[DEBUG] state.currentTrack:",
        state.currentTrack,
        "core.currentFile:",
        this.core.currentFile,
      );
      const trackChanged =
        state.currentTrack && state.currentTrack !== this.core.currentFile;
      if (trackChanged) {
        console.log("[DEBUG] track changed detected");
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
      console.log(
        "[DEBUG] wasPlaying:",
        wasPlaying,
        "isPlaying:",
        this.core.isPlaying,
      );
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
    if (status.success && status.currentFile) {
      if (status.currentFile !== this.core.currentFile) {
        this.core.currentFile = status.currentFile;
        this.uiUpdater.updateFileInfo(this.core.currentFile);
      }
      const wasPlaying = this.core.isPlaying;
      const isCurrentlyPlaying = status.playing && !status.paused;
      if (wasPlaying !== isCurrentlyPlaying) {
        this.core.setPlaying(isCurrentlyPlaying);
        this.uiUpdater.updatePlayPauseButton(isCurrentlyPlaying);
      }
      this.progress.update(status.currentTime || 0, status.duration || 0);
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
