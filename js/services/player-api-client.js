class PlayerApiClient extends ApiClient {
  constructor() {
    super();
    this._available = false;
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/api/audio/playbackState`);
      this._available = response.ok;
      return this._available;
    } catch {
      this._available = false;
      return false;
    }
  }

  async addToPlaylist(track) {
    return this.post("/api/audio/add", { track });
  }

  get isAvailable() {
    return this._available;
  }

  async getPlaybackState() {
    const response = await this.get("/api/audio/playbackState");
    if (response.success && response.currentTrack !== undefined) {
      if (response.currentTrack && typeof response.currentTrack === "string") {
        try {
          const decodedPath = decodeURIComponent(response.currentTrack);
          const fileName = decodedPath
            .split("/")
            .pop()
            .replace(/\.(flac|mp3|m4a|wav)$/i, "");
          response.currentTrackName = fileName;
        } catch (e) {
          response.currentTrackName = "";
        }
      }
    }
    return response;
  }

  async getPlaylist() {
    return this.get("/api/audio/getPlaylist");
  }

  async getCurrentTime() {
    const response = await this.get("/api/audio/currentTime");
    if (response.success) {
      return {
        success: true,
        currentTime: response.currentTime || response.data?.currentTime || 0,
        duration: response.duration || response.data?.duration || 0,
      };
    }
    return { success: false, currentTime: 0, duration: 0 };
  }

  async play() {
    return this.post("/api/audio/play");
  }

  async pause() {
    return this.post("/api/audio/pause");
  }

  async stop() {
    return this.post("/api/audio/stop");
  }

  async next() {
    return this.post("/api/audio/next");
  }

  async previous() {
    return this.post("/api/audio/previous");
  }

  async seek(position) {
    return this.post("/api/audio/seek", { position });
  }

  async setPlaylist(tracks) {
    return this.post("/api/audio/setPlaylist", { tracks });
  }

  async clearPlaylist() {
    return this.post("/api/audio/clear");
  }

  async playIndex(index) {
    return this.post("/api/audio/playIndex", { index });
  }
}
