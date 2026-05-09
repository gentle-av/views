export class PlayerEventSubscriber {
  constructor(events, api, mediaHandler, core, uiUpdater, onShow, onStop) {
    this.events = events;
    this.api = api;
    this.mediaHandler = mediaHandler;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.onShow = onShow;
    this.onStop = onStop;
    this._isStartingVideo = false;
  }

  subscribe() {
    this.events.on("video:play", (path) => this._onVideoPlay(path));
    this.events.on("playback:audioStart", (path) => this._onAudioStart(path));
    this.events.on("playback:videoStopped", () => this._onVideoStopped());
    this.events.on("playback:audioStopped", () => this._onAudioStopped());
    this.events.on("stateChange", (state) => this._onStateChange(state));
    this.events.on("trackChanged", (data) => this._onTrackChanged(data));
    this.events.on("page:changed", (page) => this._onPageChanged(page));
    this.events.on("playlistChanged", () => this._onPlaylistChanged());
  }

  _onVideoPlay(path) {
    if (this.core.isStartingVideo()) return;
    if (this.core.isSameFile(path, "video")) {
      this.onShow?.();
      return;
    }
    if (this.core.isAudio() && this.core.hasActiveFile()) {
      this.mediaHandler.stop();
    }
    this.mediaHandler.startPlayback(path, "video");
  }

  _onAudioStart(path) {
    if (this.core.isVideo() && this.core.hasActiveFile()) {
      this.mediaHandler.stop();
    }
    this.mediaHandler.startPlayback(path, "audio");
  }

  _onVideoStopped() {
    if (this.core.isVideo()) {
      this.onStop?.();
    }
  }

  _onAudioStopped() {
    if (this.core.isAudio()) {
      this.onStop?.();
    }
  }

  _onStateChange(state) {
    if (!state || this.core.isVideo()) return;
    if (state.currentTrack && state.currentTrack !== this.core.currentFile) {
      this.core.currentFile = state.currentTrack;
      this._updateTrackInfoFromPath(this.core.currentFile);
    }
    const wasPlaying = this.core.isPlaying;
    this.core.isPlaying = state.isPlaying || false;
  }

  async _updateTrackInfoFromPath(path) {
    if (!this.api || !this.uiUpdater) return;

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
  }

  _onTrackChanged({ album, trackIndex }) {
    if (album?.tracks?.[trackIndex]) {
      const track = album.tracks[trackIndex];
      if (track.path) {
        this.core.currentFile = track.path;
        this._updateTrackInfoFromPath(track.path);
      }
    }
  }

  _onPageChanged(page) {
    const hasActive = this.core.hasActiveFile();
    if (hasActive) {
      this.onShow?.();
    } else {
      const dom = document.getElementById("universalBottomPlayer");
      if (dom) {
        dom.classList.remove("active");
        dom.style.setProperty("display", "none");
      }
    }
  }

  _onPlaylistChanged() {
    if (this.core.hasActiveFile()) {
      this.onShow?.();
    }
  }

  unsubscribe() {
    this.events.off("video:play", this._onVideoPlay);
    this.events.off("playback:audioStart", this._onAudioStart);
    this.events.off("playback:videoStopped", this._onVideoStopped);
    this.events.off("playback:audioStopped", this._onAudioStopped);
    this.events.off("stateChange", this._onStateChange);
    this.events.off("trackChanged", this._onTrackChanged);
    this.events.off("page:changed", this._onPageChanged);
    this.events.off("playlistChanged", this._onPlaylistChanged);
  }
}
