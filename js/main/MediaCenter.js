import { MediaCenterCore } from "./core/MediaCenterCore.js";
import { PlaybackManager } from "./managers/PlaybackManager.js";
import { UIManager } from "./managers/UIManager.js";
import { NavigationManager } from "./managers/NavigationManager.js";
import { VideoPageManager } from "./pages/VideoPageManager.js";
import { AudioPageManager } from "./pages/AudioPageManager.js";
import { PowerPageManager } from "./pages/PowerPageManager.js";
import { AlbumEventHandlers } from "./handlers/AlbumEventHandlers.js";
import { VideoEventHandlers } from "./handlers/VideoEventHandlers.js";

export class MediaCenter {
  constructor() {
    this.core = null;
    this.playbackManager = null;
    this.uiManager = null;
    this.videoPageManager = null;
    this.audioPageManager = null;
    this.powerPageManager = null;
    this.albumEventHandlers = null;
    this.videoEventHandlers = null;
  }

  async init() {
    this.core = new MediaCenterCore();
    await this.core.init();
    this.playbackManager = new PlaybackManager(this.core);
    await this.playbackManager.init();
    this.uiManager = new UIManager(this.core);
    this._injectUIMethods();
    this.videoPageManager = new VideoPageManager(
      this.core,
      this.playbackManager,
      NavigationManager,
    );
    this.audioPageManager = new AudioPageManager(
      this.core,
      this.playbackManager,
    );
    this.powerPageManager = new PowerPageManager(this.core);
    this.albumEventHandlers = new AlbumEventHandlers(
      this.core,
      this.playbackManager,
      this.audioPageManager,
    );
    this.videoEventHandlers = new VideoEventHandlers(
      this.core,
      this.videoPageManager,
    );
    this._setupEventHandlers();
    this._exposeGlobal();
    await NavigationManager.switchTo("video");
  }

  _injectUIMethods() {
    this.core._updateUIForPage = (page) => this.uiManager.updateUIForPage(page);
    this.core._showOverlay = () => this.uiManager.showOverlay();
    this.core._hideOverlay = () => this.uiManager.hideOverlay();
    this.core._setupSearchUI = (onSearch, onClear) =>
      this.uiManager.setupSearchUI(onSearch, onClear);
  }

  _setupEventHandlers() {
    this.core.events.on("page:videoLoaded", () => {
      this.videoPageManager.onPageLoaded();
    });
    this.core.events.on("page:audioLoaded", () => {
      this.audioPageManager.onPageLoaded();
    });
    this.core.events.on("page:powerLoaded", () => {
      this.powerPageManager.onPageLoaded();
    });
    this.core.events.on("player:show", () => {
      if (this.playbackManager.universalPlayer) {
        this.playbackManager.universalPlayer.show();
      }
    });
    this.albumEventHandlers.setup();
    this.videoEventHandlers.setup();
  }

  _exposeGlobal() {
    window.MediaCenter = this;
    window.universalPlayerInstance = this.playbackManager.universalPlayer;
  }

  destroy() {
    this.albumEventHandlers?.destroy();
    this.videoEventHandlers?.destroy();
    this.videoPageManager?.destroy();
    this.audioPageManager?.destroy();
    this.powerPageManager?.destroy();
    this.playbackManager?.destroy();
    this.core?.destroy();
  }
}

export default MediaCenter;
