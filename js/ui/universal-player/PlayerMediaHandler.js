import { MediaPlaybackController } from "./MediaPlaybackController.js";
import { VideoPlaybackStarter } from "./VideoPlaybackStarter.js";
import { AudioPlaybackStarter } from "./AudioPlaybackStarter.js";
import { PlaybackCoordinator } from "./PlaybackCoordinator.js";

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
    this.videoStarter = new VideoPlaybackStarter(
      api,
      core,
      uiUpdater,
      progress,
      onShow,
    );
    this.audioStarter = new AudioPlaybackStarter(
      api,
      core,
      uiUpdater,
      progress,
    );
    this.coordinator = new PlaybackCoordinator(
      api,
      core,
      uiUpdater,
      progress,
      onShow,
      onStop,
    );
    this.coordinator.setVideoStarter(this.videoStarter);
    this.coordinator.setAudioStarter(this.audioStarter);
    this.coordinator.setController(this.controller);
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

  setVideoCloseModal(modal) {
    this.controller.setVideoCloseModal(modal);
  }

  setForceRefreshVideo(fn) {
    this.videoStarter.setForceRefreshVideo(fn);
  }

  setForceRefresh(fn) {
    this.controller.setForceRefresh(fn);
  }

  forceRefreshPlayback(path) {
    this.controller.forceRefreshPlayback(path);
  }
}
