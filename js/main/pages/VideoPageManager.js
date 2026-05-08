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
    this._showVideoContainer();
    this._updateUI();
    this._destroyExistingLibrary();
    setTimeout(() => {
      this._createVideoLibrary();
      this._setupVideoEvents();
      this._postInitTasks();
    }, 50);
  }

  _showVideoContainer() {
    const videoContainer = document.getElementById("videoPageContainer");
    const pageContainer = document.getElementById("pageContainer");
    if (videoContainer) videoContainer.style.display = "flex";
    if (pageContainer) pageContainer.style.display = "none";
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
    await this.playbackManager.checkExistingPlaybacks();
    if (this.videoLibrary && this.videoLibrary._adjustBottomPadding) {
      setTimeout(() => this.videoLibrary._adjustBottomPadding(), 200);
    }
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
