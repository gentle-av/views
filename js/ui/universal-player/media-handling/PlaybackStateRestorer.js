import { MetadataExtractor } from "../utils/MetadataExtractor.js";

export class PlaybackStateRestorer {
  constructor(
    api,
    core,
    uiUpdater,
    polling,
    lifecycle,
    onRestoreComplete,
    progress,
  ) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.polling = polling;
    this.lifecycle = lifecycle;
    this.onRestoreComplete = onRestoreComplete;
    this.progress = progress;
    this._restored = false;
  }

  async checkAndRestore() {
    if (this._restored) return;
    this._restored = true;
    try {
      const videoStatus = await this.api.getVideoStatus();
      if (videoStatus?.success && videoStatus.currentFile) {
        await this.lifecycle.checkExistingPlayback("video");
        if (this.onRestoreComplete) this.onRestoreComplete();
        return;
      }
      const playlistData = await this.api.api.get("/api/audio/getPlaylist");
      if (playlistData?.data?.length > 0) {
        await this._restoreFromPlaylist(playlistData.data);
        if (this.onRestoreComplete) this.onRestoreComplete();
        return;
      }
    } catch (error) {
      console.error("Failed to restore playback state:", error);
    }
  }

  async _restoreFromPlaylist(tracks) {
    const firstTrack = tracks[0];
    const trackPath =
      typeof firstTrack === "string" ? firstTrack : firstTrack.path;
    if (!trackPath) return;
    this.core.setCurrentFile(trackPath);
    this.core.setMediaType("audio");
    this.core.setPlaying(true);
    this.uiUpdater.updateFileInfo(trackPath);
    this.uiUpdater.updateTrackCount(0, tracks.length);
    this.uiUpdater.updatePlayPauseButton(true);
    this.uiUpdater.updateFullscreenButtonVisibility("audio");
    const { title, artist, coverUrl } =
      await MetadataExtractor.extractTrackInfo(this.api, trackPath);
    this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
    if (this.polling) {
      this.polling.stop();
      this.polling.start();
    }
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (timeInfo?.success && this.progress?.update) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 500);
  }
}
