// js/main/pages/VideoPageManager.js
import { VideoLibrary } from "../../modules/video-library/VideoLibrary.js";

export class VideoPageManager {
  constructor(core, playbackManager, navigationManager) {
    this.core = core;
    this.playbackManager = playbackManager;
    this.navigationManager = navigationManager;
    this.videoLibrary = null;
    this._isInitialized = false;
  }

  async onPageLoaded() {
    this._updateUI();
    this._destroyExistingLibrary();
    setTimeout(() => {
      this._createVideoLibrary();
      this._setupVideoEvents();
      this._postInitTasks();
    }, 50);
  }

  _updateUI() {
    if (this.core._updateUIForPage) {
      this.core._updateUIForPage("video");
    }
  }

  _destroyExistingLibrary() {
    if (this.videoLibrary) {
      this.videoLibrary.destroy();
      this.videoLibrary = null;
    }
  }

  _createVideoLibrary() {
    this.videoLibrary = new VideoLibrary(
      this.core.api,
      this.core.events,
      this.navigationManager,
      this.playbackManager.universalPlayer,
    );
    this.core.videoLibrary = this.videoLibrary;
  }

  _setupVideoEvents() {
    this.core.events.on("video:refresh", () => {
      if (this.videoLibrary) this.videoLibrary.refresh();
    });
    this.playbackManager.setupVideoEvents();
  }

  async _postInitTasks() {
    this._isInitialized = true;
  }

  destroy() {
    if (this.videoLibrary) {
      this.videoLibrary.destroy();
      this.videoLibrary = null;
    }
    this._isInitialized = false;
  }
}
