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

export class UniversalPlayer {
  constructor(api, events, musicApi, playerApi, apiClient) {
    this.api = api;
    this.events = events;
    this.musicApi = musicApi;
    this.playerApi = playerApi;
    this.apiClient = apiClient;
    this.dom = null;
    this.core = null;
    this.progress = null;
    this.uiUpdater = null;
    this.polling = null;
    this.mediaHandler = null;
    this.volume = null;
    this.output = null;
    this.eventSubscriber = null;
    this.previewTooltip = null;
    this.isVisible = false;
    this.initialize();
  }

  initialize() {
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
      this,
      this.core,
      this.progress,
      this.uiUpdater,
      (state) => {
        this.events.emit("playbackStateChange", state);
      },
    );
    this.volume = new PlayerVolume(this.apiClient, this.dom, this.core);
    this.output = new PlayerOutput(this.apiClient, this.dom, this.core);
    this.mediaHandler = new PlayerMediaHandler(
      this,
      this.core,
      this.uiUpdater,
      this.progress,
      () => this.show(),
    );
    this.mediaHandler.setForceRefreshVideo(() => this.refreshVideo());
    const playerEvents = new PlayerEvents({
      onTogglePlayPause: () => this.mediaHandler.togglePlayPause(),
      onPrev: () => this.mediaHandler.previous(),
      onNext: () => this.mediaHandler.next(),
      onStop: () => {
        this.mediaHandler.stop();
        this.hide();
      },
      onFullscreen: () => this.mediaHandler.fullscreen(),
      onToggleMinimize: () => this.toggleMinimize(),
      onToggleSettings: () => this.toggleSettings(),
      onVolumeDown: () => this.volume.changeVolume(-10),
      onVolumeUp: () => this.volume.changeVolume(10),
      onToggleMute: () => this.volume.toggleMute(),
      onSpeakers: () => this.output.switchToSpeakers(),
      onHeadphones: () => this.output.switchToHeadphones(),
      onProgressClick: (e) => {
        const seekTime = this.progress.getSeekTimeFromClick(e);
        if (seekTime !== null) this.mediaHandler.seek(seekTime);
      },
    });
    playerEvents.attach(this.dom);
    this.eventSubscriber = new PlayerEventSubscriber(
      this.events,
      this,
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
    this.bindEvents();
    this.hide();
    this.checkExistingPlayback();
  }

  bindEvents() {
    this.events.on("video:play", (path) => {
      this.mediaHandler.startPlayback(path, "video");
    });
    this.events.on("track:play", (data) => {
      if (data.track && data.track.path) {
        this.mediaHandler.startPlayback(data.track.path, "audio");
      }
    });
    this.events.on("player:clearState", () => {
      this.hide();
    });
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

  refreshVideo() {
    if (this.polling) {
      this.polling.stop();
      this.polling.start();
    }
  }

  async checkExistingPlayback(type) {
    try {
      let hasActivePlayback = false;
      if (type === "video") {
        const status = await this.api.getVideoStatus();
        if (status && status.success && status.currentFile && !status.paused) {
          this.core.setCurrentFile(status.currentFile);
          this.core.setMediaType("video");
          this.core.setPlaying(true);
          this.uiUpdater.updateFileInfo(status.currentFile);
          this.uiUpdater.updatePlayPauseButton(true);
          hasActivePlayback = true;
        }
      } else {
        const state = await this.api.getAudioPlaybackState();
        if (state && state.success && state.currentTrack && state.isPlaying) {
          this.core.setCurrentFile(state.currentTrack);
          this.core.setMediaType("audio");
          this.core.setPlaying(true);
          this.uiUpdater.updateFileInfo(state.currentTrack);
          this.uiUpdater.updatePlayPauseButton(true);
          hasActivePlayback = true;
        }
      }
      if (this.dom) {
        this.dom.setHasActivePlayback(hasActivePlayback);
      }
      if (hasActivePlayback) {
        this.show();
        if (this.polling) this.polling.start();
      } else {
        this.hide();
      }
    } catch (error) {
      console.error("[UniversalPlayer] checkExistingPlayback error:", error);
      if (this.dom) {
        this.dom.setHasActivePlayback(false);
      }
      this.hide();
    }
  }

  clearState() {
    this.core.reset();
    this.uiUpdater.reset();
    this.progress.reset();
    if (this.polling) this.polling.stop();
    this.hide();
  }

  startPlaybackExternal() {
    if (this.polling) {
      this.polling.stop();
      this.polling.start();
    }
    this.show();
  }

  syncWithPlayback() {
    if (this.polling) {
      this.polling.stop();
      this.polling.start();
    }
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
