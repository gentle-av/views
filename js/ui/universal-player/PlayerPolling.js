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
    this._lastTrackEnded = false;
    this._stuckCounter = 0;
    this._lastSkipTime = 0;
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
        }
      } catch (error) {
        console.error("[Polling] error:", error);
      }
    }, 500);
  }

  async _pollAudio() {
    const timeInfo = await this.api.getAudioCurrentTime();
    const state = await this.api.getAudioPlaybackState();
    console.log("[Polling] _pollAudio debug:", {
      hasTimeInfo: !!timeInfo,
      hasState: !!state,
      stateSuccess: state?.success,
      currentTrack: state?.currentTrack,
      currentIndex: state?.currentIndex,
      totalTracks: state?.totalTracks,
    });

    if (!state || !state.success) return;

    const totalTracks = state.totalTracks || 0;
    const currentIndex = state.currentIndex || 0;
    const isLastTrack = currentIndex >= totalTracks - 1;
    const now = Date.now();

    if (timeInfo && timeInfo.success) {
      const duration = timeInfo.duration || 0;
      const currentTime = timeInfo.currentTime || 0;
      this.progress.update(currentTime, duration);

      console.log("[Polling] timeInfo:", {
        duration,
        currentTime,
        isLastTrack,
        _lastTrackEnded: this._lastTrackEnded,
        _stuckCounter: this._stuckCounter,
      });

      if (
        duration === 0 &&
        currentTime === 0 &&
        !isLastTrack &&
        !this._lastTrackEnded
      ) {
        this._stuckCounter++;
        console.log("[Polling] stuck counter:", this._stuckCounter);
        if (this._stuckCounter >= 4 && now - this._lastSkipTime > 3000) {
          console.log("[Polling] Track stuck, skipping to next");
          this._lastTrackEnded = true;
          this._lastSkipTime = now;
          this._stuckCounter = 0;
          await this.api.audioNext();
          setTimeout(() => {
            console.log("[Polling] Reset _lastTrackEnded");
            this._lastTrackEnded = false;
          }, 3000);
        }
      } else {
        if (this._stuckCounter > 0) {
          console.log(
            "[Polling] Reset stuck counter, duration or time not zero",
          );
          this._stuckCounter = 0;
        }
      }

      if (
        duration > 0 &&
        currentTime > 0 &&
        duration - currentTime < 0.5 &&
        !this._lastTrackEnded &&
        !isLastTrack
      ) {
        console.log("[Polling] Track ended, calling audioNext");
        this._lastTrackEnded = true;
        this._lastSkipTime = now;
        await this.api.audioNext();
        setTimeout(() => {
          console.log("[Polling] Reset _lastTrackEnded after end");
          this._lastTrackEnded = false;
        }, 3000);
      } else if (
        duration > 0 &&
        currentTime > 0 &&
        duration - currentTime > 1
      ) {
        if (this._lastTrackEnded) {
          console.log(
            "[Polling] Reset _lastTrackEnded, track playing normally",
          );
          this._lastTrackEnded = false;
        }
      }
    }

    const trackChanged =
      state.currentTrack && state.currentTrack !== this.core.currentFile;
    if (trackChanged) {
      console.log("[Polling] Track changed to:", state.currentTrack);
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

  async _pollVideo() {
    const status = await this.api.getVideoStatus();
    if (!status) return;
    if (status.success && status.currentFile) {
      if (status.currentFile !== this.core.currentFile) {
        this.core.currentFile = status.currentFile;
        this.uiUpdater.updateFileInfo(this.core.currentFile);
        const thumbnail = await this.api.getVideoThumbnail(
          this.core.currentFile,
        );
        if (thumbnail) {
          this.uiUpdater.showPreviewImage(thumbnail);
        } else {
          this.uiUpdater.updateMediaIcon("video");
        }
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
