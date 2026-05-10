import { PlayerCore } from "./PlayerCore.js";
import { PlayerProgress } from "./PlayerProgress.js";
import { PlayerUIUpdater } from "./PlayerUIUpdater.js";
import { PlayerPolling } from "./PlayerPolling.js";
import { PlayerDOM } from "./PlayerDOM.js";
import { PlayerEvents } from "./PlayerEvents.js";
import { PlayerMediaHandler } from "./PlayerMediaHandler.js";
import { PlayerVolume } from "./PlayerVolume.js";
import { PlayerOutput } from "./PlayerOutput.js";
import { PlayerEventSubscriber } from "./PlayerEventSubscriber.js";
import { PreviewTooltip } from "./PreviewTooltip.js";
import { PlayerEventHandler } from "./PlayerEventHandler.js";
import { PlayerLifecycle } from "./PlayerLifeCycle.js";

export class UniversalPlayer {
  constructor(api, events, musicApi, playerApi, apiClient, tvApi = null) {
    this.api = api;
    this.events = events;
    this.musicApi = musicApi;
    this.playerApi = playerApi;
    this.apiClient = apiClient;
    this.tvApi = tvApi;
    this.dom = null;
    this.core = null;
    this.progress = null;
    this.uiUpdater = null;
    this.polling = null;
    this.mediaHandler = null;
    this.volume = null;
    this.output = null;
    this.lifecycle = null;
    this.eventSubscriber = null;
    this.previewTooltip = null;
    this.videoCloseModal = null;
    this.isVisible = false;
    this.initialize();
  }

  async initialize() {
    this.dom = new PlayerDOM();
    const domReady = this.dom.init();
    if (!domReady) {
      setTimeout(() => this.initialize(), 100);
      return;
    }
    this.core = new PlayerCore();
    this.progress = new PlayerProgress(this.dom);
    this.uiUpdater = new PlayerUIUpdater(this.dom, this.progress);
    this.polling = new PlayerPolling(
      this.api,
      this.core,
      this.progress,
      this.uiUpdater,
      (state) => this.events.emit("playbackStateChange", state),
    );
    this.volume = new PlayerVolume(this.apiClient, this.dom, this.core);
    this.output = new PlayerOutput(this.apiClient, this.dom, this.core);
    this.lifecycle = new PlayerLifecycle(
      this.core,
      this.uiUpdater,
      this.progress,
      this.polling,
      this.api,
      this.apiClient,
      this.events,
      this.mediaHandler,
    );
    this.lifecycle.onRestore = () => {
      this.show();
    };
    const onStopHandler = async () => {
      if (
        this.core.isVideo() &&
        this.core.hasActiveFile() &&
        this.videoCloseModal
      ) {
        const result = await this.videoCloseModal.show(this.core.currentFile);
        if (result && result.action === "delete") {
          await this.lifecycle.deleteCurrentVideo();
          this.hide();
        } else if (result && result.action === "close") {
          await this.mediaHandler.stop(true);
          this.hide();
        }
      } else {
        await this.mediaHandler.stop(true);
        this.hide();
      }
    };
    this.mediaHandler = new PlayerMediaHandler(
      this.api,
      this.core,
      this.uiUpdater,
      this.progress,
      () => this.show(),
      onStopHandler,
    );
    this.mediaHandler.setOnHide(() => this.hide());
    this.mediaHandler.setForceRefreshVideo(() => this.lifecycle.refreshVideo());
    if (this.videoCloseModal) {
      this.mediaHandler.setVideoCloseModal(this.videoCloseModal);
    }
    this.dom.ensureOutputButtons();
    this.eventHandler = new PlayerEventHandler(
      this.mediaHandler,
      this.volume,
      this.output,
      this.progress,
      this.videoCloseModal,
    );
    const playerEvents = new PlayerEvents(this.eventHandler.getHandlers());
    playerEvents.attach(this.dom);
    this.eventSubscriber = new PlayerEventSubscriber(
      this.events,
      this.api,
      this.mediaHandler,
      this.core,
      this.uiUpdater,
      () => this.show(),
      () => this.hide(),
    );
    this.eventSubscriber.subscribe();
    this.previewTooltip = new PreviewTooltip(this.dom, this.api);
    this.volume.loadInitial();
    this.output.loadInitial();
    this.volume.startPolling();
    this.output.startPolling();
    this.hide();
    this.checkAndRestorePlayback();
  }

  setVideoCloseModal(modal) {
    this.videoCloseModal = modal;
    if (this.mediaHandler) {
      this.mediaHandler.setVideoCloseModal(modal);
    }
    if (this.eventHandler) {
      this.eventHandler._videoCloseModal = modal;
    }
  }

  async checkAndRestorePlayback() {
    try {
      const videoStatus = await this.api.getVideoStatus();
      if (videoStatus && videoStatus.success && videoStatus.currentFile) {
        await this.lifecycle.checkExistingPlayback("video");
        setTimeout(() => this.show(), 100);
        return;
      }
      const audioState = await this.api.getAudioPlaybackState();
      if (audioState && audioState.success && audioState.currentTrack) {
        await this.lifecycle.checkExistingPlayback("audio");
        await this.restorePlaylistFromServer();
        setTimeout(() => this.show(), 100);
        return;
      }
    } catch (error) {
      console.error("[UniversalPlayer] checkAndRestorePlayback error:", error);
    }
  }

  async restorePlaylistFromServer() {
    try {
      const playlistData = await this.api.api.get("/api/audio/getPlaylist");
      const state = await this.api.getAudioPlaybackState();
      if (playlistData?.data?.length > 0 && state?.success) {
        const tracks = playlistData.data;
        const currentIndex = state.currentIndex || 0;
        this.core.currentFile = state.currentTrack;
        if (this.uiUpdater && tracks[currentIndex]) {
          this.uiUpdater.updateTrackCount(currentIndex, tracks.length);
        }
      }
    } catch (error) {
      console.error(
        "[UniversalPlayer] restorePlaylistFromServer error:",
        error,
      );
    }
  }

  show() {
    if (this.dom) {
      this.dom.show();
      this.isVisible = true;
    }
  }

  hide() {
    if (this.dom) {
      this.dom.hide();
      this.isVisible = false;
    }
  }

  toggleMinimize() {
    const isMinimized = this.dom.hasClass("minimized");
    this.uiUpdater.toggleMinimize(!isMinimized);
  }

  toggleSettings() {
    const settings = this.dom.get("universalBottomSettings");
    const isCollapsed = settings.classList.contains("collapsed");
    this.uiUpdater.toggleSettings(!isCollapsed);
  }

  clearState() {
    this.lifecycle?.clearState();
    this.hide();
  }

  destroy() {
    if (this.polling) this.polling.stop();
    if (this.volume) this.volume.stopPolling();
    if (this.output) this.output.stopPolling();
    if (this.eventSubscriber) this.eventSubscriber.unsubscribe();
    if (this.previewTooltip) this.previewTooltip.destroy();
    if (this.core) this.core.destroy();
  }

  getVideoStatus() {
    return this.api.getVideoStatus();
  }

  getAudioPlaybackState() {
    return this.api.getAudioPlaybackState();
  }

  getAudioCurrentTime() {
    return this.api.getAudioCurrentTime();
  }

  getFileMetadata(path) {
    return this.api.getFileMetadata(path);
  }

  getAlbumCover(path, title, artist) {
    return this.api.getAlbumCover(path, title, artist);
  }

  closeVideo() {
    return this.api.closeVideo();
  }

  openFile(path) {
    return this.api.openFile(path);
  }

  controlVideo(command) {
    return this.api.controlVideo(command);
  }

  seekVideo(time) {
    return this.api.seekVideo(time);
  }

  audioPlay() {
    return this.api.audioPlay();
  }

  audioPause() {
    return this.api.audioPause();
  }

  audioStop() {
    return this.api.audioStop();
  }

  audioNext() {
    return this.api.audioNext();
  }

  audioPrevious() {
    return this.api.audioPrevious();
  }

  audioSeek(time) {
    return this.api.audioSeek(time);
  }

  getVideoThumbnail(path) {
    return this.api.getVideoThumbnail(path);
  }
}
