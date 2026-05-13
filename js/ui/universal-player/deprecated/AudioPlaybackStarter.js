import { MetadataExtractor } from "./utils/MetadataExtractor.js";

export class AudioPlaybackStarter {
  constructor(api, core, uiUpdater, progress) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.progress = progress;
  }

  async start(path) {
    await this.api.closeVideo();
    this.uiUpdater.updateFullscreenButtonVisibility("audio");
    const { title, artist, coverUrl } =
      await MetadataExtractor.extractTrackInfo(this.api, path);
    this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
    this.uiUpdater.updatePlayPauseButton(true);
    this.core.setPlaying(true);
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (timeInfo && timeInfo.success) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 500);
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (timeInfo && timeInfo.success) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 1500);
  }
}
