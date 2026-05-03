export class PlayerAPI {
  constructor(apiClient, musicApi = null, playerApi = null) {
    this.api = apiClient;
    this.musicApi = musicApi;
    this.playerApi = playerApi;
  }

  async getVideoStatus() {
    return this.api.get("/api/video/status");
  }

  async controlVideo(command) {
    return this.api.post("/api/mpv/control", { command });
  }

  async seekVideo(time) {
    return this.api.post("/api/mpv/seek", { time });
  }

  async closeVideo() {
    return this.api.post("/api/video/close").catch(() => {});
  }

  async openFile(path) {
    return this.api.post("/api/open", { path });
  }

  async getAudioPlaybackState() {
    if (!this.playerApi) return null;
    return this.playerApi.getPlaybackState();
  }

  async getAudioCurrentTime() {
    if (!this.playerApi) return null;
    return this.playerApi.getCurrentTime();
  }

  async audioPlay() {
    if (!this.playerApi) return;
    return this.playerApi.play();
  }

  async audioPause() {
    if (!this.playerApi) return;
    return this.playerApi.pause();
  }

  async audioStop() {
    if (!this.playerApi) return;
    return this.playerApi.stop();
  }

  async audioNext() {
    if (!this.playerApi) return;
    return this.playerApi.next();
  }

  async audioPrevious() {
    if (!this.playerApi) return;
    return this.playerApi.previous();
  }

  async audioSeek(time) {
    if (!this.playerApi) return;
    return this.playerApi.seek(time);
  }

  async getFileMetadata(path) {
    if (!this.musicApi) return null;
    return this.musicApi.getFileMetadata(path);
  }

  async getVideoThumbnail(path) {
    const response = await fetch(
      `/api/thumbnail?path=${encodeURIComponent(path)}`,
    );
    const data = await response.json();
    return data.success && data.thumbnail ? data.thumbnail : null;
  }

  async getAlbumCover(filePath, title, artist) {
    let coverUrl = null;
    if (title) {
      let url = `/api/music/albumart/album/${encodeURIComponent(title)}`;
      if (artist) url += `?artist=${encodeURIComponent(artist)}`;
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        coverUrl = URL.createObjectURL(blob);
      }
    }
    if (!coverUrl) {
      const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, "/");
      const response = await fetch(`/api/music/albumart/${encodedPath}`);
      if (response.ok) {
        const blob = await response.blob();
        coverUrl = URL.createObjectURL(blob);
      }
    }
    return coverUrl;
  }
}
