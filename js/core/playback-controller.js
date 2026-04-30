class PlaybackController {
  constructor(playerApi, eventBus) {
    this.api = playerApi;
    this.events = eventBus;
    this._currentAlbum = null;
    this._currentTrackIndex = -1;
    this._isPlaying = false;
    this._isSwitching = false;
    this._playlist = [];
    this._pollingInterval = null;
    this._trackNameCache = new Map();
  }

  async init() {
    await this.api.checkAvailability();
    this._startPolling();
  }

  getTrackNameByPath(path) {
    if (!path) return "";
    const cached = this._trackNameCache.get(path);
    if (cached) return cached;
    let filename = path.split("/").pop();
    filename = filename.replace(/\.(flac|mp3|m4a|wav)$/i, "");
    return filename;
  }

  async _updateCurrentTrackName() {
    const state = await this.api.getPlaybackState();
    if (!state?.success) return;
    const currentPath = state.data.currentTrack;
    if (!currentPath) return;
    let trackName = this._trackNameCache.get(currentPath);
    if (!trackName && this._currentAlbum) {
      const track = this._currentAlbum.tracks.find(
        (t) => t.path === currentPath,
      );
      if (track && track.title) {
        trackName = track.title;
        this._trackNameCache.set(currentPath, trackName);
      }
    }
    if (!trackName) {
      let filename = currentPath.split("/").pop();
      trackName = filename.replace(/\.(flac|mp3|m4a|wav)$/i, "");
    }
    this.events.emit("stateChange", {
      ...state.data,
      currentTrackName: trackName,
    });
    return trackName;
  }

  _startPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
    }
    this._pollingInterval = setInterval(async () => {
      if (!this._isSwitching) {
        const state = await this.api.getPlaybackState();
        if (state?.success) {
          this._isPlaying = state.data.isPlaying;
          const trackName = state.data.track || "";
          this.events.emit("stateChange", {
            ...state.data,
            currentTrackName: trackName,
          });
        }
      }
    }, 500);
  }

  _stopPolling() {
    if (this._pollingInterval) {
      clearInterval(this._pollingInterval);
      this._pollingInterval = null;
    }
  }

  async playAlbum(album) {
    if (this._isSwitching) return;
    this._isSwitching = true;
    this._currentAlbum = album;
    album.fillTrackCache(this._trackNameCache);
    this._playlist = [...album.tracks];
    await this.api.stop();
    await this.api.setPlaylist(album.getTrackPaths());
    this._currentTrackIndex = 0;
    await this.api.play();
    this._isSwitching = false;
    this.events.emit("albumChanged", album);
    setTimeout(() => this._updateCurrentTrackName(), 50);
  }

  async playTrack(album, trackIndex) {
    if (this._isSwitching) return;
    this._isSwitching = true;
    this._currentAlbum = album;
    album.fillTrackCache(this._trackNameCache);
    this._playlist = [...album.tracks];
    this._currentTrackIndex = trackIndex;
    await this.api.stop();
    await this.api.setPlaylist([album.tracks[trackIndex].path]);
    await this.api.play();
    this._isSwitching = false;
    this.events.emit("trackChanged", { album, trackIndex });
    setTimeout(() => this._updateCurrentTrackName(), 50);
  }

  async addAlbumToPlaylist(album) {
    album.fillTrackCache(this._trackNameCache);
    for (const trackPath of album.getTrackPaths()) {
      await this.api.addToPlaylist(trackPath);
    }
    this.events.emit("playlistChanged");
  }

  async addTrackAfterCurrent(album, trackIndex) {
    album.fillTrackCache(this._trackNameCache);
    const state = await this.api.getPlaybackState();
    const currentIndex = state?.data?.currentIndex ?? -1;
    const currentPlaylist = await this.api.getPlaylist();
    let existingTracks =
      currentPlaylist?.data?.tracks || currentPlaylist?.data || [];
    const newPlaylist = [...existingTracks];
    newPlaylist.splice(currentIndex + 1, 0, album.tracks[trackIndex].path);
    await this.api.setPlaylist(newPlaylist);
    this.events.emit("playlistChanged");
  }

  async togglePlayPause() {
    const state = await this.api.getPlaybackState();
    if (state?.data?.isPlaying) {
      await this.api.pause();
    } else {
      await this.api.play();
    }
  }

  async next() {
    await this.api.next();
    setTimeout(() => this._updateCurrentTrackName(), 50);
  }

  async previous() {
    await this.api.previous();
    setTimeout(() => this._updateCurrentTrackName(), 50);
  }

  async stop() {
    await this.api.stop();
  }

  async seek(percent, progressBar) {
    const rect = progressBar.getBoundingClientRect();
    const timeInfo = await this.api.getCurrentTime();
    if (timeInfo?.data?.duration) {
      const seekTime = timeInfo.data.duration * percent;
      await this.api.seek(seekTime);
    }
  }
}
