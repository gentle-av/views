// PlaybackCoordinator.js
export class PlaybackCoordinator {
  constructor(api, core, uiUpdater, progress, onShow, onStop) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.progress = progress;
    this.onShow = onShow;
    this.onStop = onStop;
    this.videoStarter = null;
    this.audioStarter = null;
    this.controller = null;
  }

  setVideoStarter(videoStarter) {
    this.videoStarter = videoStarter;
  }

  setAudioStarter(audioStarter) {
    this.audioStarter = audioStarter;
  }

  setController(controller) {
    this.controller = controller;
  }

  async startPlayback(path, type) {
    if (this.core.isStartingVideo()) return;
    if (this.core.isSameFile(path, type) && this.core.isPlaying) {
      this.onShow?.();
      return;
    }
    if (
      this.core.mediaType &&
      this.core.mediaType !== type &&
      this.core.hasActiveFile()
    ) {
      await this.controller.stop();
    }
    this.core.setMediaType(type);
    this.core.setCurrentFile(path);
    this.uiUpdater.updateFileInfo(path);
    this.uiUpdater.updateMediaIcon(type);
    if (type === "video") {
      await this.videoStarter.start(path);
    } else {
      await this.audioStarter.start(path);
    }
    this.core.setMediaType(type);
  }

  toggleSettings() {
    const settings = document.getElementById("universalBottomSettings");
    if (settings) {
      settings.classList.toggle("collapsed");
      const toggle = document.getElementById("universalBottomSettingsToggle");
      if (toggle) {
        toggle.classList.toggle("collapsed");
      }
    }
  }

  toggleMinimize() {
    const player = document.getElementById("universalBottomPlayer");
    if (player) {
      player.classList.toggle("minimized");
      const minimizeBar = document.getElementById("universalMinimizeBar");
      if (minimizeBar) {
        minimizeBar.innerHTML = player.classList.contains("minimized")
          ? '<i class="fas fa-chevron-up"></i>'
          : '<i class="fas fa-chevron-down"></i>';
      }
    }
  }
}
