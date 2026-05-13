export class PlayerInitializer {
  constructor(api, events, musicApi, playerApi, apiClient, tvApi) {
    this.api = api;
    this.events = events;
    this.musicApi = musicApi;
    this.playerApi = playerApi;
    this.apiClient = apiClient;
    this.tvApi = tvApi;
    this.videoCloseModal = null;
    this.components = {};
  }

  async initialize() {
    const dom = new PlayerDOM();
    const domReady = dom.init();
    if (!domReady) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.initialize();
    }
    const core = new PlayerCore();
    const progress = new PlayerProgress(dom);
    const uiUpdater = new PlayerUIUpdater(dom, progress);
    const polling = new PlayerPolling(
      this.api,
      core,
      progress,
      uiUpdater,
      (state) => this.events.emit("playbackStateChange", state),
    );
    const volume = new PlayerVolume(this.apiClient, dom, core);
    const output = new PlayerOutput(this.apiClient, dom, core);
    const lifecycle = new PlayerLifecycle(
      core,
      uiUpdater,
      progress,
      polling,
      this.api,
      this.apiClient,
      this.events,
      null,
    );
    let mediaHandler = null;
    const onStopHandler = async () => {
      if (core.isVideo() && core.hasActiveFile() && this.videoCloseModal) {
        const result = await this.videoCloseModal.show(core.currentFile);
        if (result && result.action === "delete") {
          await lifecycle.deleteCurrentVideo();
        } else if (result && result.action === "close") {
          if (mediaHandler) await mediaHandler.stop(true);
        }
      } else {
        if (mediaHandler) await mediaHandler.stop(true);
      }
    };
    mediaHandler = new PlayerMediaHandler(
      this.api,
      core,
      uiUpdater,
      progress,
      () => {},
      onStopHandler,
    );
    lifecycle.mediaHandler = mediaHandler;
    const eventHandler = new PlayerEventHandler(
      mediaHandler,
      volume,
      output,
      progress,
      this.videoCloseModal,
    );
    const playerEvents = new PlayerEvents(eventHandler.getHandlers());
    playerEvents.attach(dom);
    const eventSubscriber = new PlayerEventSubscriber(
      this.events,
      this.api,
      mediaHandler,
      core,
      uiUpdater,
      () => {},
      () => {},
    );
    eventSubscriber.subscribe();
    const previewTooltip = new PreviewTooltip(dom, this.api);
    this.components = {
      dom,
      core,
      progress,
      uiUpdater,
      polling,
      volume,
      output,
      lifecycle,
      mediaHandler,
      eventHandler,
      eventSubscriber,
      previewTooltip,
    };
    return this.components;
  }

  setVideoCloseModal(modal) {
    this.videoCloseModal = modal;
    if (this.components.mediaHandler) {
      this.components.mediaHandler.setVideoCloseModal(modal);
    }
    if (this.components.eventHandler) {
      this.components.eventHandler._videoCloseModal = modal;
    }
  }
}
