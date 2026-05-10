export class AudioPlaybackStarter {
  constructor(api, core, uiUpdater, progress) {
    this.api = api;
    this.core = core;
    this.uiUpdater = uiUpdater;
    this.progress = progress;
  }

  async start(path) {
    await this.api.closeVideo();
    const metadata = await this.api.getFileMetadata(path);
    this.uiUpdater.updateFullscreenButtonVisibility("audio");
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
        coverUrl = await this.api.getAlbumCover(path, title, artist);
      }
    }
    if (!title) {
      let fileName = path.split("/").pop();
      fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
      const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
      title = match ? match[1] : fileName;
    }
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
