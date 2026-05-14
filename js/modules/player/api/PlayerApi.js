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
    try {
      const response = await this.api.get("/api/audio/playbackState");
      if (response && response.success) {
        const data = response.data;
        return {
          success: true,
          currentTrack: data.currentTrack,
          currentIndex: data.currentIndex,
          totalTracks: data.totalTracks,
          isPlaying: data.isPlaying,
          currentTime: data.currentTime,
          duration: data.duration,
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async getAudioCurrentTime() {
    try {
      const response = await this.api.get("/api/audio/currentTime");
      if (response && response.success) {
        return {
          success: true,
          currentTime: response.data.currentTime,
          duration: response.data.duration,
        };
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async audioPlay() {
    return this.api.post("/api/audio/play");
  }

  async audioPause() {
    return this.api.post("/api/audio/pause");
  }

  async audioStop() {
    return this.api.post("/api/audio/stop");
  }

  async audioNext() {
    return this.api.post("/api/audio/next");
  }

  async audioPrevious() {
    return this.api.post("/api/audio/previous");
  }

  async audioSeek(time) {
    return this.api.post("/api/audio/seek", { position: time });
  }

  async getFileMetadata(path) {
    if (!this.musicApi) {
      return null;
    }
    try {
      const result = await this.musicApi.getFileMetadata(path);
      return result;
    } catch (error) {
      return null;
    }
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
    const encodedPath = encodeURIComponent(filePath);
    const directUrl = `/api/music/albumart?path=${encodedPath}`;
    const directResponse = await fetch(directUrl);
    if (directResponse.ok) {
      const blob = await directResponse.blob();
      coverUrl = URL.createObjectURL(blob);
      return coverUrl;
    }
    if (title && title !== "Unknown") {
      let url = `/api/music/albumart/album/${encodeURIComponent(title)}`;
      if (artist && artist !== "Unknown") {
        url += `?artist=${encodeURIComponent(artist)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        coverUrl = URL.createObjectURL(blob);
        return coverUrl;
      }
    }
    return null;
  }

  async getPlaylist() {
    return this.api.get("/api/audio/getPlaylist");
  }
}
