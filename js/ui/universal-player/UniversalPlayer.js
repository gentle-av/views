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
import { PlaybackStateRestorer } from "./PlaybackStateRestorer.js";
import { PlayerVisibilityController } from "./PlayerVisibilityController.js";
import { PlayerAPIBridge } from "./PlayerAPIBridge.js";

export class UniversalPlayer {
  constructor(api, events, musicApi, playerApi, apiClient, tvApi = null) {
    this.api = api;
    this.events = events;
    this.musicApi = musicApi;
    this.playerApi = playerApi;
    this.apiClient = apiClient;
    this.tvApi = tvApi;
    this.videoCloseModal = null;
    this.dom = null;
    this.core = null;
    this.progress = null;
    this.uiUpdater = null;
    this.polling = null;
    this.volume = null;
    this.output = null;
    this.lifecycle = null;
    this.mediaHandler = null;
    this.eventSubscriber = null;
    this.previewTooltip = null;
    this.eventHandler = null;
    this.visibility = null;
    this.apiBridge = null;
    this.stateRestorer = null;
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
        if (result?.action === "delete") {
          await this.lifecycle.deleteCurrentVideo();
          this.hide();
        } else if (result?.action === "close") {
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
    if (this.videoCloseModal)
      this.mediaHandler.setVideoCloseModal(this.videoCloseModal);
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
    this.visibility = new PlayerVisibilityController(this.dom, this.core);
    this.visibility.setUIUpdater(this.uiUpdater);
    this.apiBridge = new PlayerAPIBridge(
      this.api,
      this.lifecycle,
      this.mediaHandler,
    );
    this.stateRestorer = new PlaybackStateRestorer(
      this.api,
      this.core,
      this.uiUpdater,
      this.polling,
      this.lifecycle,
      () => this.visibility.show(),
      this.progress,
    );
    this.hide();
    this.checkAndRestorePlayback();
  }

  async checkAndRestorePlayback() {
    if (this.stateRestorer) await this.stateRestorer.checkAndRestore();
  }

  show() {
    this.visibility?.show() ?? this.dom?.show();
  }

  hide() {
    this.visibility?.hide() ?? this.dom?.hide();
  }

  toggleMinimize() {
    this.visibility?.toggleMinimize();
  }

  toggleSettings() {
    this.visibility?.toggleSettings();
  }

  clearState() {
    if (this.apiBridge) this.apiBridge.clearState();
    else if (this.lifecycle) this.lifecycle.clearState();
    this.hide();
  }

  destroy() {
    this.polling?.stop();
    this.volume?.stopPolling();
    this.output?.stopPolling();
    this.eventSubscriber?.unsubscribe();
    this.previewTooltip?.destroy();
    this.core?.destroy();
  }

  getVideoStatus() {
    return this.apiBridge?.getVideoStatus() ?? this.api.getVideoStatus();
  }

  getAudioPlaybackState() {
    return (
      this.apiBridge?.getAudioPlaybackState() ??
      this.api.getAudioPlaybackState()
    );
  }

  getAudioCurrentTime() {
    return (
      this.apiBridge?.getAudioCurrentTime() ?? this.api.getAudioCurrentTime()
    );
  }

  getFileMetadata(path) {
    return (
      this.apiBridge?.getFileMetadata(path) ?? this.api.getFileMetadata(path)
    );
  }

  getAlbumCover(path, title, artist) {
    return (
      this.apiBridge?.getAlbumCover(path, title, artist) ??
      this.api.getAlbumCover(path, title, artist)
    );
  }

  closeVideo() {
    return this.apiBridge?.closeVideo() ?? this.api.closeVideo();
  }

  openFile(path) {
    return this.apiBridge?.openFile(path) ?? this.api.openFile(path);
  }

  controlVideo(command) {
    return (
      this.apiBridge?.controlVideo(command) ?? this.api.controlVideo(command)
    );
  }

  seekVideo(time) {
    return this.apiBridge?.seekVideo(time) ?? this.api.seekVideo(time);
  }

  audioPlay() {
    return this.apiBridge?.audioPlay() ?? this.api.audioPlay();
  }

  audioPause() {
    return this.apiBridge?.audioPause() ?? this.api.audioPause();
  }

  audioStop() {
    return this.apiBridge?.audioStop() ?? this.api.audioStop();
  }

  audioNext() {
    return this.apiBridge?.audioNext() ?? this.api.audioNext();
  }

  audioPrevious() {
    return this.apiBridge?.audioPrevious() ?? this.api.audioPrevious();
  }

  audioSeek(time) {
    return this.apiBridge?.audioSeek(time) ?? this.api.audioSeek(time);
  }

  getVideoThumbnail(path) {
    return (
      this.apiBridge?.getVideoThumbnail(path) ??
      this.api.getVideoThumbnail(path)
    );
  }
}
