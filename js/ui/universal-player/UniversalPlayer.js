import { PlayerDOM } from "./PlayerDOM.js";
import { PlayerCore } from "./PlayerCore.js";
import { PlayerEvents } from "./PlayerEvents.js";
import { PlayerVolume } from "./PlayerVolume.js";
import { PlayerOutput } from "./PlayerOutput.js";
import { PlayerProgress } from "./PlayerProgress.js";
import { PlayerUIUpdater } from "./PlayerUIUpdater.js";
import { PlayerPolling } from "./PlayerPolling.js";
import { PlayerMediaHandler } from "./PlayerMediaHandler.js";
import { PlayerEventSubscriber } from "./PlayerEventSubscriber.js";
import { PlayerAPI } from "./PlayerApi.js";

export class UniversalPlayer {
  constructor(apiClient, events, musicApi = null, playerApi = null) {
    this.api = new PlayerAPI(apiClient, musicApi, playerApi);
    this.events = events;
    this.dom = new PlayerDOM();
    this.core = new PlayerCore();
    this.progress = new PlayerProgress(this.dom);
    this.uiUpdater = new PlayerUIUpdater(this.dom, this.progress);
    this.volume = new PlayerVolume(apiClient, this.dom, this.core);
    this.output = new PlayerOutput(apiClient, this.dom, this.core);
    this.mediaHandler = new PlayerMediaHandler(
      this.api,
      this.core,
      this.uiUpdater,
      this.progress,
      () => this.show(),
    );
    this.polling = new PlayerPolling(
      this.api,
      this.core,
      this.progress,
      this.uiUpdater,
      (state) => this._onStateChange(state),
    );
    this.eventSubscriber = new PlayerEventSubscriber(
      events,
      this.mediaHandler,
      this.core,
      () => this.show(),
      () => this.stop(),
    );
    this._isMinimized = false;
    this._settingsCollapsed = true;
    this._init();
  }

  async _init() {
    this.dom.init();
    this._attachEvents();
    this.eventSubscriber.subscribe();
    await this.volume.loadInitial();
    await this.output.loadInitial();
    this.volume.startPolling();
    this.output.startPolling();
    await this._checkExistingPlayback();
  }

  _attachEvents() {
    const handlers = {
      onTogglePlayPause: () => this.mediaHandler.togglePlayPause(),
      onPrev: () => this.mediaHandler.previous(),
      onNext: () => this.mediaHandler.next(),
      onStop: () => this.stop(),
      onFullscreen: () => this.mediaHandler.fullscreen(),
      onToggleMinimize: () => this._toggleMinimize(),
      onToggleSettings: () => this._toggleSettings(),
      onVolumeDown: () => this.volume.changeVolume(-5),
      onVolumeUp: () => this.volume.changeVolume(5),
      onToggleMute: () => this.volume.toggleMute(),
      onSpeakers: () => this.output.switchToSpeakers(),
      onHeadphones: () => this.output.switchToHeadphones(),
      onProgressClick: (e) => this._handleProgressClick(e),
    };
    const events = new PlayerEvents(handlers);
    events.attach(this.dom);
    this._eventHandlers = events;
  }

  async _checkExistingPlayback() {
    const audioState = await this.api.getAudioPlaybackState();
    if (audioState?.success && audioState.currentTrack) {
      this.core.setMediaType("audio");
      this.core.setCurrentFile(audioState.currentTrack);
      this.core.setPlaying(audioState.isPlaying || false);
      this.uiUpdater.updateFileInfo(this.core.currentFile);
      this.uiUpdater.updateMediaIcon("audio");
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
      this.show();
      this.polling.start();
      return true;
    }
    const videoStatus = await this.api.getVideoStatus();
    if (videoStatus?.success && videoStatus.currentFile) {
      this.core.setMediaType("video");
      this.core.setCurrentFile(videoStatus.currentFile);
      this.core.setPlaying(videoStatus.playing && !videoStatus.paused);
      this.progress.update(
        videoStatus.currentTime || 0,
        videoStatus.duration || 0,
      );
      this.uiUpdater.updateFileInfo(this.core.currentFile);
      this.uiUpdater.updateMediaIcon("video");
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
      this.show();
      this.polling.start();
      return true;
    }
    return false;
  }

  async _handleProgressClick(e) {
    const seekTime = this.progress.getSeekTimeFromClick(e);
    if (seekTime !== null) {
      await this.mediaHandler.seek(seekTime);
    }
  }

  _toggleMinimize() {
    this._isMinimized = !this._isMinimized;
    this.uiUpdater.toggleMinimize(this._isMinimized);
  }

  _toggleSettings() {
    this._settingsCollapsed = !this._settingsCollapsed;
    this.uiUpdater.toggleSettings(this._settingsCollapsed);
  }

  _onStateChange(state) {}

  async startPlayback(path, type) {
    await this.mediaHandler.startPlayback(path, type);
    this.polling.start();
  }

  async stop() {
    this.mediaHandler.stop();
    this.polling.stop();
    this.core.reset();
  }

  show() {
    this.dom.show();
    this._adjustBottomPadding();
  }

  hide() {
    this.dom.hide();
  }

  setMediaType(type) {
    this.core.setMediaType(type);
    this.uiUpdater.updateMediaIcon(type);
    if (this.polling) {
      this.polling.stop();
      this.polling.start();
    }
    if (this.core.currentFile) {
      this.show();
    }
  }

  async checkExistingPlayback(type) {
    if (type === "audio") {
      const audioState = await this.api.getAudioPlaybackState();
      if (audioState?.success && audioState.currentTrack) {
        this.core.setMediaType("audio");
        this.core.setCurrentFile(audioState.currentTrack);
        this.core.setPlaying(audioState.isPlaying || false);
        this.uiUpdater.updateFileInfo(this.core.currentFile);
        this.uiUpdater.updateMediaIcon("audio");
        this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
        this.show();
        this.polling.start();
        return true;
      }
    } else if (type === "video") {
      const videoStatus = await this.api.getVideoStatus();
      if (videoStatus?.success && videoStatus.currentFile) {
        this.core.setMediaType("video");
        this.core.setCurrentFile(videoStatus.currentFile);
        this.core.setPlaying(videoStatus.playing && !videoStatus.paused);
        this.progress.update(
          videoStatus.currentTime || 0,
          videoStatus.duration || 0,
        );
        this.uiUpdater.updateFileInfo(this.core.currentFile);
        this.uiUpdater.updateMediaIcon("video");
        this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
        this.show();
        this.polling.start();
        return true;
      }
    }
    return false;
  }

  syncWithPlayback() {
    if (!this.api.playerApi) return;
    Promise.all([
      this.api.getAudioPlaybackState(),
      this.api.getAudioCurrentTime(),
    ])
      .then(([state, timeInfo]) => {
        if (state && state.success && state.currentTrack) {
          this.core.setCurrentFile(state.currentTrack);
          this.core.setMediaType("audio");
          this.core.setPlaying(state.isPlaying || false);
          this.uiUpdater.updateFileInfo(this.core.currentFile);
          this.uiUpdater.updateMediaIcon("audio");
          this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
          if (timeInfo && timeInfo.success) {
            this.progress.update(
              timeInfo.currentTime || 0,
              timeInfo.duration || 0,
            );
          }
          this.show();
          this.polling.start();
        }
      })
      .catch(() => {});
  }

  _adjustBottomPadding() {
    const scrollable = document.querySelector(".scrollable-content");
    if (scrollable) {
      scrollable.style.paddingBottom = "80px";
    }
    if (window.innerWidth <= 768 && scrollable) {
      scrollable.style.paddingBottom = "100px";
    }
  }

  destroy() {
    this.core.destroy();
    this.polling.stop();
    this.volume.stopPolling();
    this.output.stopPolling();
    this._eventHandlers?.detach(this.dom);
    this.eventSubscriber.unsubscribe();
    this.dom.hide();
  }
}

export default UniversalPlayer;
