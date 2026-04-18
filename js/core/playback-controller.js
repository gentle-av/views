class PlaybackController {
  constructor(playerApi, eventBus) {
    this.api = playerApi;
    this.events = eventBus;
    this._currentAlbum = null;
    this._currentTrackIndex = -1;
    this._isPlaying = false;
    this._isSwitching = false;
    this._playlist = [];
  }

  get currentAlbum() {
    return this._currentAlbum;
  }
  get currentTrack() {
    return this._playlist[this._currentTrackIndex];
  }
  get isPlaying() {
    return this._isPlaying;
  }
  get playlist() {
    return [...this._playlist];
  }

  async init() {
    await this.api.checkAvailability();
    this._startPolling();
  }

  _startPolling() {
    setInterval(async () => {
      if (!this._isSwitching) {
        const state = await this.api.getPlaybackState();
        if (state?.success) {
          this._isPlaying = state.data.isPlaying;
          this.events.emit("stateChange", state.data);
        }
      }
    }, 1000);
  }

  async playAlbum(album) {
    if (this._isSwitching) return;
    this._isSwitching = true;
    this._currentAlbum = album;
    this._playlist = [...album.tracks];
    await this.api.stop();
    await this.api.setPlaylist(album.getTrackPaths());
    this._currentTrackIndex = 0;
    await this.api.play();
    this._isSwitching = false;
    this.events.emit("albumChanged", album);
  }

  async playTrack(album, trackIndex) {
    if (this._isSwitching) return;
    this._isSwitching = true;
    this._currentAlbum = album;
    this._playlist = [...album.tracks];
    this._currentTrackIndex = trackIndex;
    await this.api.stop();
    await this.api.setPlaylist([album.tracks[trackIndex].path]);
    await this.api.play();
    this._isSwitching = false;
    this.events.emit("trackChanged", { album, trackIndex });
  }

  async addAlbumToPlaylist(album) {
    const currentPlaylist = await this.api.getPlaylist();
    let existingTracks =
      currentPlaylist?.data?.tracks || currentPlaylist?.data || [];
    const newPlaylist = [...existingTracks, ...album.getTrackPaths()];
    await this.api.setPlaylist(newPlaylist);
    this.events.emit("playlistChanged");
  }

  async addTrackAfterCurrent(album, trackIndex) {
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
  }
  async previous() {
    await this.api.previous();
  }
  async stop() {
    await this.api.stop();
  }
  async seek(percent, progressBar) {
    const rect = progressBar.getBoundingClientRect();
    const timeInfo = await this.api.getCurrentTime();
    if (timeInfo?.success?.data?.duration) {
      const seekTime = timeInfo.data.duration * percent;
      await this.api.seek(seekTime);
    }
  }
}
