import { MediaPlaybackController } from "../playback/MediaPlaybackController.js";
import { PlaybackCoordinator } from "../playback/PlaybackCoordinator.js";

export class PlayerMediaHandler {
  constructor(api, core, uiUpdater, progress, onShow, onStop) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.progress = progress;
    this.onShow = onShow;
    this.onStop = onStop;
    this.controller = new MediaPlaybackController(
      api,
      core,
      uiUpdater,
      onShow,
      onStop,
    );
    this.coordinator = new PlaybackCoordinator(
      api,
      core,
      uiUpdater,
      progress,
      onShow,
      onStop,
    );
    this.coordinator.initStrategies();
    this.coordinator.setController(this.controller);
    this.controller.setProgress(progress);
  }

  stopAudio() {
    this.controller.stopAudio();
  }

  stop(keepState = false) {
    return this.controller.stop(keepState);
  }

  toggleSettings() {
    this.coordinator.toggleSettings();
  }

  toggleMinimize() {
    this.coordinator.toggleMinimize();
  }

  startPlayback(path, type) {
    return this.coordinator.startPlayback(path, type);
  }

  togglePlayPause() {
    return this.controller.togglePlayPause();
  }

  seek(time) {
    return this.controller.seek(time);
  }

  previous() {
    return this.controller.previous();
  }

  next() {
    return this.controller.next();
  }

  fullscreen() {
    return this.controller.fullscreen();
  }

  setOnHide(callback) {
    this.controller.setOnHide(callback);
  }

  setForceRefreshVideo(fn) {
    this.coordinator.setVideoForceRefresh(fn);
  }

  setForceRefresh(fn) {
    this.controller.setForceRefresh(fn);
  }

  forceRefreshPlayback(path) {
    this.controller.forceRefreshPlayback(path);
  }

  async restoreFromState() {
    return this.controller.restoreFromState();
  }

  getCurrentStrategy() {
    return this.coordinator.getCurrentStrategy();
  }
}
