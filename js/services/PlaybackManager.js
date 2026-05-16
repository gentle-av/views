import { UniversalPlayer } from "../modules/player/UniversalPlayer.js";
import { PlayerAPI } from "../modules/player/api/PlayerApi.js";
import { VideoCloseModal } from "../modules/videos/VideoCloseModal.js";
import { CustomDeleteDialogInstance } from "../modules/dialogs/DeleteDialog.js";

export class PlaybackManager {
  constructor(core) {
    this.core = core;
    this.universalPlayer = null;
    this.videoCloseModal = null;
    this._isInitialized = false;
    this._restored = false;
  }

  async init() {
    const playerAPI = new PlayerAPI(this.core.api, this.core.musicApi, null);
    window.deleteDialog = CustomDeleteDialogInstance;
    this.videoCloseModal = new VideoCloseModal(
      this.core.events,
      this.core.api,
      this.core.notificationService || null,
    );
    this.universalPlayer = new UniversalPlayer(
      playerAPI,
      this.core.events,
      this.core.musicApi,
      null,
      this.core.api,
      null,
      this.videoCloseModal,
    );
    this.videoCloseModal.setUniversalPlayer(this.universalPlayer);
    window.universalPlayerInstance = this.universalPlayer;
    this.core.universalPlayer = this.universalPlayer;
    this._isInitialized = true;
    return this;
  }

  async checkExistingPlaybacks() {
    if (this._restored) {
      return;
    }
    if (!this.universalPlayer) {
      return;
    }
    this._restored = true;
    await this.universalPlayer.checkAndRestorePlayback();
  }

  setupVideoEvents() {
    this.core.events.on("player:clearState", () => {
      if (this.universalPlayer) {
        this.universalPlayer.clearState();
      }
    });
  }

  destroy() {
    if (this.videoCloseModal?.destroy) {
      this.videoCloseModal.destroy();
    }
    if (this.universalPlayer?.destroy) {
      this.universalPlayer.destroy();
    }
    this._isInitialized = false;
  }
}
