import { EventBus } from "./EventBus.js";
import { ApiClient } from "./api/ApiClient.js";
import { MusicApiClient } from "./api/MusicApiClient.js";
import { MediaCenterState } from "./state/AppState.js";
import { MediaCenterEvents } from "./MediaCenterEvents.js";

export class MediaCenterCore {
  constructor() {
    this.events = null;
    this.api = null;
    this.musicApi = null;
    this.playerApi = null;
    this.universalPlayer = null;
    this.videoLibrary = null;
    this.albumLibrary = null;
    this.albumModal = null;
    this.playlistPopup = null;
    this.powerManagement = null;
    this.state = new MediaCenterState();
    this.eventsManager = null;
  }

  async init() {
    this._setupBeforeUnload();
    this._initApis();
    this.eventsManager = new MediaCenterEvents(this.events);
    this.state.isInitialized = true;
    return this;
  }

  _setupBeforeUnload() {
    window.addEventListener("beforeunload", () => {
      if (this.videoLibrary) this.videoLibrary.destroy();
      if (this.universalPlayer) this.universalPlayer.destroy();
    });
  }

  _initApis() {
    this.events = new EventBus();
    this.api = new ApiClient();
    this.musicApi = new MusicApiClient();
    this.playerApi = null;
    this._fixMusicApi();
  }

  _fixMusicApi() {
    if (this.musicApi && !this.musicApi.openMusium) {
      this.musicApi.openMusium = async (tracks) => {
        try {
          const response = await fetch("/api/music/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tracks }),
          });
          return await response.json();
        } catch (error) {}
      };
    }
  }

  destroy() {
    this.state.destroy();
    if (this.eventsManager) this.eventsManager.destroy();
    if (this.videoLibrary) this.videoLibrary.destroy();
    if (this.universalPlayer) this.universalPlayer.destroy();
    if (this.albumLibrary) this.albumLibrary.destroy();
  }
}
