export class PlayerEventHandler {
  constructor(mediaHandler, volume, output, progress, channelManager) {
    this.mediaHandler = mediaHandler;
    this.volume = volume;
    this.output = output;
    this.progress = progress;
    this.channelManager = channelManager;
  }

  getHandlers() {
    return {
      onTogglePlayPause: () => this.mediaHandler.togglePlayPause(),
      onPrev: () => this.mediaHandler.previous(),
      onNext: () => this.mediaHandler.next(),
      onStop: () => this.mediaHandler.stop(),
      onFullscreen: () => this.mediaHandler.fullscreen(),
      onToggleMinimize: () => this.mediaHandler.toggleMinimize?.(),
      onToggleSettings: () => this.mediaHandler.toggleSettings?.(),
      onVolumeDown: () => this.volume.changeVolume(-5),
      onVolumeUp: () => this.volume.changeVolume(5),
      onToggleMute: () => this.volume.toggleMute(),
      onSpeakers: () => this.output.switchToSpeakers(),
      onHeadphones: () => this.output.switchToHeadphones(),
      onProgressClick: (e) => {
        const seekTime = this.progress.getSeekTimeFromClick(e);
        if (seekTime !== null) this.mediaHandler.seek(seekTime);
      },
      onChannelSet: (channel) =>
        this.channelManager?.channelControl?.set(channel),
      onChannelUp: () => this.channelManager?.channelControl?.up(),
      onChannelDown: () => this.channelManager?.channelControl?.down(),
      onChannelGo: () => {
        const input = document.getElementById("sysChannelInput");
        if (input && input.value)
          this.channelManager?.channelControl?.set(parseInt(input.value));
      },
      onChannelEnter: (e) => {
        if (e.key === "Enter") {
          const input = e.target;
          if (input.value)
            this.channelManager?.channelControl?.set(parseInt(input.value));
        }
      },
    };
  }
}
