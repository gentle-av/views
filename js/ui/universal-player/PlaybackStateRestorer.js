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
      if (videoStatus && videoStatus.success && videoStatus.currentFile) {
        await this.lifecycle.checkExistingPlayback("video");
        if (this.onRestoreComplete) {
          this.onRestoreComplete();
        }
        return;
      }
      const playlistData = await this.api.api.get("/api/audio/getPlaylist");
      if (playlistData && playlistData.data && playlistData.data.length > 0) {
        await this._restoreFromPlaylist(playlistData.data);
        if (this.onRestoreComplete) {
          this.onRestoreComplete();
        }
        return;
      }
    } catch (error) {}
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
    const metadata = await this.api.getFileMetadata(trackPath);
    let artist = "";
    let title = "";
    let coverUrl = null;
    if (metadata && metadata.data) {
      if (metadata.data.file) {
        artist = metadata.data.file.artist || "";
        title = metadata.data.file.title || "";
        coverUrl = metadata.data.file.cover || null;
      }
      if (!title && metadata.data.database) {
        title = metadata.data.database.title || "";
        artist = metadata.data.database.artist || "";
      }
    }
    if (!title) {
      let fileName = trackPath.split("/").pop();
      fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
      const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
      title = match ? match[1] : fileName;
    }
    if (!coverUrl && title) {
      coverUrl = await this.api.getAlbumCover(trackPath, title, artist);
    }
    this.uiUpdater.updateTrackFullInfo(title, artist, coverUrl);
    if (this.polling) {
      this.polling.stop();
      this.polling.start();
    }
    setTimeout(async () => {
      const timeInfo = await this.api.getAudioCurrentTime();
      if (
        timeInfo &&
        timeInfo.success &&
        this.progress &&
        this.progress.update
      ) {
        this.progress.update(timeInfo.currentTime || 0, timeInfo.duration || 0);
      }
    }, 500);
  }
}
