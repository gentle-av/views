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
    return this.get("/api/playbackState");
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

// ==================== services/MusicApiClient.js ====================
class MusicApiClient extends ApiClient {
  async getArtists() {
    return this.get("/api/music/artists");
  }
  async getAlbums(artist) {
    return this.get(`/api/music/albums?artist=${encodeURIComponent(artist)}`);
  }
  async getTracks(album, artist) {
    return this.get(
      `/api/music/tracks/album/${encodeURIComponent(album)}?artist=${encodeURIComponent(artist)}`,
    );
  }
  async getAlbumArt(album, artist) {
    return this.get(
      `/api/music/albumart/album/${encodeURIComponent(album)}?artist=${encodeURIComponent(artist)}`,
    );
  }
  async getTrackMetadata(path) {
    return this.get(
      `/api/music/file-metadata?path=${encodeURIComponent(path)}`,
    );
  }
  async updateTags(path, tags) {
    return this.post("/api/music/update-tags", { path, ...tags });
  }
  async deleteAlbum(album, artist) {
    return this.post("/api/music/delete-album", { album, artist });
  }
  async forceRescan() {
    return this.post("/api/music/force-rescan");
  }

  async fetchAlbumCover(album, artist) {
    const response = await fetch(
      `${this.baseUrl}/api/music/albumart/album/${encodeURIComponent(album)}?artist=${encodeURIComponent(artist)}`,
    );
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  }
}
