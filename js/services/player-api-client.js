class PlayerApiClient extends ApiClient {
  constructor() {
    super();
    this._available = false;
  }

  async checkAvailability() {
    try {
      const response = await fetch(`${this.baseUrl}/api/playbackState`);
      this._available = response.ok;
      return this._available;
    } catch {
      this._available = false;
      return false;
    }
  }

  get isAvailable() {
    return this._available;
  }

  async getPlaybackState() {
    const response = await this.get("/api/playbackState");
    if (response.success && response.data) {
      if (
        response.data.currentTrack &&
        typeof response.data.currentTrack === "string"
      ) {
        const fileName = decodeURIComponent(
          response.data.currentTrack.split("/").pop(),
        ).replace(/\.(flac|mp3|m4a|wav)$/i, "");
        response.data.currentTrackName = fileName;
      }
    }
    return response;
  }

  async getPlaylist() {
    return this.get("/api/getPlaylist");
  }

  async getCurrentTime() {
    return this.get("/api/currentTime");
  }

  async play() {
    return this.post("/api/play");
  }

  async pause() {
    return this.post("/api/pause");
  }

  async stop() {
    return this.post("/api/stop");
  }

  async next() {
    return this.post("/api/next");
  }

  async previous() {
    return this.post("/api/previous");
  }

  async seek(position) {
    console.log("Sending seek request for position:", position);
    return this.post("/api/seek", { position });
  }

  async setPlaylist(tracks) {
    return this.post("/api/setPlaylist", { tracks });
  }

  async clearPlaylist() {
    return this.post("/api/clear");
  }

  async playIndex(index) {
    return this.post("/api/playIndex", { index });
  }
}
