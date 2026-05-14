import { PlaybackStrategy } from "./PlaybackStrategy.js";
import { MetadataExtractor } from "../utils/MetadataExtractor.js";

export class AudioPlaybackStrategy extends PlaybackStrategy {
  constructor(api) {
    super();
    this.api = api;
    this.core = null;
    this.uiUpdater = null;
    this.progress = null;
  }

  setCore(core) {
    this.core = core;
  }

  setUIUpdater(uiUpdater) {
    this.uiUpdater = uiUpdater;
  }

  setProgress(progress) {
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
      if (timeInfo?.success) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 500);
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (timeInfo?.success) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 1500);
  }

  async stop() {
    await this.api.audioStop();
  }

  async togglePlayPause() {
    const state = await this.api.getAudioPlaybackState();
    if (state?.success && state.totalTracks > 0) {
      if (this.core.isPlaying) {
        await this.api.audioPause();
      } else {
        await this.api.audioPlay();
      }
      this.core.setPlaying(!this.core.isPlaying);
      this.uiUpdater.updatePlayPauseButton(this.core.isPlaying);
    } else {
      Utils.showNotification("Плейлист пуст", "info");
    }
  }

  async seek(time) {
    await this.api.audioSeek(time);
    this.progress.update(time, this.progress.duration);
  }

  async previous() {
    await this.api.audioPrevious();
  }

  async next() {
    await this.api.audioNext();
  }

  async getStatus() {
    return this.api.getAudioPlaybackState();
  }

  async getCurrentTime() {
    return this.api.getAudioCurrentTime();
  }

  updateUI() {
    this.uiUpdater.updateFullscreenButtonVisibility("audio");
  }
}
