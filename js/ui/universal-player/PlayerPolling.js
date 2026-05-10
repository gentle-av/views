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
        if (this.core.isAudio()) {
          await this._pollAudio();
        } else if (this.core.isVideo()) {
          await this._pollVideo();
        }
      } catch (error) {}
    }, 500);
  }

  async _pollAudio() {
    const timeInfo = await this.api.getAudioCurrentTime();
    const state = await this.api.getAudioPlaybackState();
    if (!state || !state.success) {
      return;
    }
    const totalTracks = state.totalTracks || 0;
    const currentIndex = state.currentIndex || 0;
    const isLastTrack = currentIndex >= totalTracks - 1;
    const now = Date.now();
    if (timeInfo && timeInfo.success) {
      const duration = timeInfo.duration || 0;
      const currentTime = timeInfo.currentTime || 0;
      this.progress.update(currentTime, duration);
      if (
        duration === 0 &&
        currentTime === 0 &&
        !isLastTrack &&
        !this._lastTrackEnded
      ) {
        this._stuckCounter++;
        if (this._stuckCounter >= 4 && now - this._lastSkipTime > 3000) {
          this._lastTrackEnded = true;
          this._lastSkipTime = now;
          this._stuckCounter = 0;
          await this.api.audioNext();
          setTimeout(() => {
            this._lastTrackEnded = false;
          }, 3000);
        }
      } else {
        if (this._stuckCounter > 0) {
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
        this._lastTrackEnded = true;
        this._lastSkipTime = now;
        await this.api.audioNext();
        setTimeout(() => {
          this._lastTrackEnded = false;
        }, 3000);
      } else if (
        duration > 0 &&
        currentTime > 0 &&
        duration - currentTime > 1
      ) {
        if (this._lastTrackEnded) {
          this._lastTrackEnded = false;
        }
      }
    }
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

  async _attachPlayButton(container, album) {
    const playBtn = container.querySelector(".modal-play-btn");
    if (!playBtn) return;
    playBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      let tracks = album.tracks || [];
      if (tracks.length === 0 && this.musicApi) {
        try {
          const tracksData = await this.musicApi.getTracks(
            album.title,
            album.artist,
            true,
          );
          tracks = tracksData;
          album.tracks = tracksData;
        } catch (error) {
          return;
        }
      }
      const trackPaths = tracks.map((track) => track.path);
      if (trackPaths.length === 0 || !this.universalPlayer) return;
      await this.universalPlayer.apiClient.post("/api/audio/setPlaylist", {
        tracks: trackPaths,
      });
      await this.universalPlayer.apiClient.post("/api/audio/play");
      if (this.universalPlayer.uiUpdater && tracks[0]) {
        const firstTrack = tracks[0];
        const title =
          firstTrack.title ||
          firstTrack.name ||
          this._extractNameFromPath(firstTrack.path);
        const artist = firstTrack.artist || album.artist;
        const coverUrl =
          album.coverUrl ||
          (await this.musicApi?.fetchAlbumCover(album.title, album.artist));
        this.universalPlayer.uiUpdater.updateTrackFullInfo(
          title,
          artist,
          coverUrl,
        );
        this.universalPlayer.uiUpdater.updateTrackCount(0, tracks.length);
        this.universalPlayer.core.setCurrentFile(firstTrack.path);
        this.universalPlayer.core.setMediaType("audio");
        this.universalPlayer.core.setPlaying(true);
        this.universalPlayer.uiUpdater.updatePlayPauseButton(true);
      }
      if (this.universalPlayer.polling) {
        this.universalPlayer.polling.stop();
        this.universalPlayer.polling.start();
      }
      this.events.emit("playback:audioStart", trackPaths[0]);
      this.onHide();
    });
  }
}
