import { PlayerDOM } from "./PlayerDOM.js";
import { PlayerCore } from "./PlayerCore.js";
import { PlayerEvents } from "./PlayerEvents.js";
import { PlayerVolume } from "./PlayerVolume.js";
import { PlayerOutput } from "./PlayerOutput.js";
import { PlayerProgress } from "./PlayerProgress.js";
import { PlayerUIUpdater } from "./PlayerUIUpdater.js";
import { PlayerMediaHandler } from "./PlayerMediaHandler.js";
import { PlayerPolling } from "./PlayerPolling.js";
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
      this.api,
      this.mediaHandler,
      this.core,
      this.uiUpdater,
      () => this.show(),
      () => this.stop(),
    );
    this._isMinimized = false;
    this._settingsCollapsed = true;
    this._init();
  }

  async startPlaybackExternal() {
    console.log("[UniversalPlayer] startPlaybackExternal STARTED");
    if (this.polling) {
      this.polling.start();
      console.log("[DEBUG] polling.start() called");
    }
    this.show();
    await this.syncWithPlayback();
    console.log("[DEBUG] startPlaybackExternal FINISHED");
  }

  async _init() {
    console.log("[UniversalPlayer] _init started");
    this.dom.init();
    console.log(
      "[UniversalPlayer] DOM initialized, element exists:",
      !!this.dom.element,
    );
    this._attachEvents();
    this.eventSubscriber.subscribe();
    await this.volume.loadInitial();
    await this.output.loadInitial();
    this.volume.startPolling();
    this.output.startPolling();
    await this._checkExistingPlayback();
    console.log("[UniversalPlayer] _init finished");
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
    console.log("[DEBUG] _checkExistingPlayback called");
    const audioState = await this.api.getAudioPlaybackState();
    console.log(
      "[DEBUG] _checkExistingPlayback audioState:",
      JSON.stringify(audioState, null, 2),
    );
    if (
      audioState?.success &&
      audioState.currentTrack &&
      audioState.currentTrack !== ""
    ) {
      console.log(
        "[DEBUG] Found audio in _checkExistingPlayback:",
        audioState.currentTrack,
      );
      const timeInfo = await this.api.getAudioCurrentTime();
      console.log("[DEBUG] Time info:", timeInfo);
      this.core.setMediaType("audio");
      this.core.setCurrentFile(audioState.currentTrack);
      this.core.setPlaying(audioState.isPlaying || false);
      console.log(
        "[DEBUG] Audio set - mediaType:",
        this.core.mediaType,
        "currentFile:",
        this.core.currentFile,
      );
      this.uiUpdater.updateFileInfo(this.core.currentFile);
      this.uiUpdater.updateMediaIcon("audio");
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
      if (timeInfo?.success) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
      if (
        audioState.currentIndex !== undefined &&
        audioState.totalTracks !== undefined
      ) {
        this.uiUpdater.updateTrackCount(
          audioState.currentIndex,
          audioState.totalTracks,
        );
      }
      const metadata = await this.api.getFileMetadata(audioState.currentTrack);
      let artist = "";
      let title = "";
      let coverUrl = null;
      if (metadata?.data) {
        if (metadata.data.file) {
          artist = metadata.data.file.artist || "";
          title = metadata.data.file.title || "";
          coverUrl = metadata.data.file.cover || null;
        }
        if (!title && metadata.data.database) {
          title = metadata.data.database.title || "";
          artist = metadata.data.database.artist || "";
        }
        if (!coverUrl && title) {
          coverUrl = await this.api.getAlbumCover(
            audioState.currentTrack,
            title,
            artist,
          );
        }
      }
      if (!title) {
        let fileName = audioState.currentTrack.split("/").pop();
        fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
        const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
        title = match ? match[1] : fileName;
      }
      this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
      this.show();
      this.polling.start();
      console.log("[DEBUG] Audio playback restored successfully");
      return true;
    }
    const videoStatus = await this.api.getVideoStatus();
    console.log(
      "[DEBUG] _checkExistingPlayback videoStatus:",
      JSON.stringify(videoStatus, null, 2),
    );
    if (videoStatus?.success && videoStatus.currentFile) {
      console.log(
        "[DEBUG] Found video in _checkExistingPlayback:",
        videoStatus.currentFile,
      );
      this.core.setMediaType("video");
      this.core.setCurrentFile(videoStatus.currentFile);
      const isPlaying = videoStatus.playing && !videoStatus.paused;
      this.core.setPlaying(isPlaying);
      this.progress.update(
        videoStatus.currentTime || 0,
        videoStatus.duration || 0,
      );
      this.uiUpdater.updateFileInfo(this.core.currentFile);
      this.uiUpdater.updateMediaIcon("video");
      this.uiUpdater.updatePlayPauseButton(isPlaying);
      this.show();
      this.polling.start();
      console.log(
        "[DEBUG] Video playback restored successfully, isPlaying:",
        isPlaying,
      );
      return true;
    }
    console.log("[DEBUG] No active playback found");
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
    console.log("[UniversalPlayer] show called");
    if (!this.dom.element) {
      console.log("[UniversalPlayer] DOM element not found, initializing...");
      this.dom.init();
    }
    console.log("[UniversalPlayer] DOM element:", this.dom.element);
    console.log(
      "[UniversalPlayer] Current display style:",
      this.dom.element?.style.display,
    );
    this.dom.show();
    console.log(
      "[UniversalPlayer] After show, display style:",
      this.dom.element?.style.display,
    );
    console.log(
      "[UniversalPlayer] Active class:",
      this.dom.element?.classList.contains("active"),
    );
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

  async syncWithPlayback() {
    console.log("[DEBUG] syncWithPlayback called");
    console.log("[DEBUG] core.isVideo():", this.core.isVideo());
    console.log("[DEBUG] core.hasActiveFile():", this.core.hasActiveFile());
    console.log("[DEBUG] core.currentFile:", this.core.currentFile);
    console.log("[DEBUG] core.mediaType:", this.core.mediaType);
    if (!this.api.playerApi) {
      console.log("[DEBUG] playerApi is null, exiting");
      return;
    }
    if (this.core.isVideo() && this.core.hasActiveFile()) {
      console.log("[DEBUG] Video is playing, skipping audio sync");
      return;
    }
    const state = await this.api.getAudioPlaybackState();
    console.log(
      "[DEBUG] syncWithPlayback state FULL:",
      JSON.stringify(state, null, 2),
    );
    console.log("[DEBUG] state?.success:", state?.success);
    console.log("[DEBUG] state?.currentTrack:", state?.currentTrack);
    console.log(
      "[DEBUG] state?.currentTrack === '':",
      state?.currentTrack === "",
    );
    if (
      state &&
      state.success &&
      state.currentTrack &&
      state.currentTrack !== ""
    ) {
      console.log("[DEBUG] === ENTERING audio sync block ===");
      const currentTrack = state.currentTrack;
      console.log("[DEBUG] Current track:", currentTrack);
      this.core.setCurrentFile(currentTrack);
      this.core.setMediaType("audio");
      this.core.setPlaying(state.isPlaying || false);
      console.log("[DEBUG] After set - core.mediaType:", this.core.mediaType);
      console.log(
        "[DEBUG] After set - core.currentFile:",
        this.core.currentFile,
      );
      this.uiUpdater.updateFileInfo(this.core.currentFile);
      this.uiUpdater.updateMediaIcon("audio");
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
      const metadata = await this.api.getFileMetadata(currentTrack);
      console.log("[DEBUG] metadata received:", metadata);
      let artist = "";
      let title = "";
      let coverUrl = null;
      if (metadata?.data) {
        if (metadata.data.file) {
          artist = metadata.data.file.artist || "";
          title = metadata.data.file.title || "";
          coverUrl = metadata.data.file.cover || null;
          console.log("[DEBUG] from file - title:", title, "artist:", artist);
        }
        if (!title && metadata.data.database) {
          title = metadata.data.database.title || "";
          artist = metadata.data.database.artist || "";
          console.log(
            "[DEBUG] from database - title:",
            title,
            "artist:",
            artist,
          );
        }
        if (!coverUrl && title) {
          coverUrl = await this.api.getAlbumCover(currentTrack, title, artist);
        }
      }
      if (!title) {
        let fileName = currentTrack.split("/").pop();
        fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
        const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
        title = match ? match[1] : fileName;
        console.log("[DEBUG] title from filename:", title);
      }
      console.log(
        "[DEBUG] calling updateTrackFullInfo with title:",
        title,
        "artist:",
        artist,
      );
      this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
      this.show();
      this.polling.start();
      console.log("[DEBUG] === FINISHED audio sync block ===");
    } else {
      console.log("[DEBUG] === SKIPPING audio sync, conditions not met ===");
      console.log("[DEBUG] state?.success:", state?.success);
      console.log("[DEBUG] state?.currentTrack:", state?.currentTrack);
      console.log(
        "[DEBUG] state?.currentTrack !== '':",
        state?.currentTrack !== "",
      );
      if (this.core.isAudio() && !this.core.isVideo()) {
        console.log("[DEBUG] Stopping audio because no active playback found");
        this.stop();
      }
    }
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
