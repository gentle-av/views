import { MetadataExtractor } from "./utils/MetadataExtractor.js";

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
    this._onVideoPlay = this._onVideoPlay.bind(this);
    this._onAudioStart = this._onAudioStart.bind(this);
    this._onVideoStopped = this._onVideoStopped.bind(this);
    this._onAudioStopped = this._onAudioStopped.bind(this);
    this._onStateChange = this._onStateChange.bind(this);
    this._onTrackChanged = this._onTrackChanged.bind(this);
    this._onPlaylistChanged = this._onPlaylistChanged.bind(this);
  }

  subscribe() {
    this.events.on("video:play", this._onVideoPlay);
    this.events.on("playback:audioStart", this._onAudioStart);
    this.events.on("playback:videoStopped", this._onVideoStopped);
    this.events.on("playback:audioStopped", this._onAudioStopped);
    this.events.on("stateChange", this._onStateChange);
    this.events.on("trackChanged", this._onTrackChanged);
    this.events.on("playlistChanged", this._onPlaylistChanged);
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
    if (this.core.isVideo() && !this.core.hasActiveFile()) {
      this.onStop?.();
    }
  }

  _onAudioStopped() {
    if (this.core.isAudio() && !this.core.hasActiveFile()) {
      this.onStop?.();
    }
  }

  _onStateChange(state) {
    if (!state || this.core.isVideo()) return;
    if (state.currentTrack && state.currentTrack !== this.core.currentFile) {
      this.core.currentFile = state.currentTrack;
      this._updateTrackInfoFromPath(this.core.currentFile);
    }
    this.core.isPlaying = state.isPlaying || false;
  }

  async _updateTrackInfoFromPath(path) {
    if (!this.api || !this.uiUpdater) return;
    const { title, artist, coverUrl } =
      await MetadataExtractor.extractTrackInfo(this.api, path);
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
    this.events.off("playlistChanged", this._onPlaylistChanged);
  }
}
