class MusicApiClient extends ApiClient {
  constructor() {
    super();
    this._albumCache = new Map();
    this._trackCache = new Map();
    this._coverCache = new Map();
    this._artistCache = null;
    this._cacheTTL = 5 * 60 * 1000;
    this._cacheTimestamps = new Map();
  }

  async getFileMetadata(filePath) {
    try {
      const response = await fetch(
        `/api/music/file-metadata?path=${encodeURIComponent(filePath)}`,
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Failed to fetch file metadata:", error);
      return null;
    }
  }

  async openMusium(tracks) {
    console.log(
      "[MusicApiClient] openMusium called with",
      tracks.length,
      "tracks",
    );
    try {
      const response = await fetch("/api/music/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks }),
      });
      const data = await response.json();
      console.log("[MusicApiClient] openMusium response:", data);
      return data;
    } catch (error) {
      console.error("[MusicApiClient] openMusium error:", error);
      return { status: "error", message: error.message };
    }
  }

  _isCacheValid(key) {
    const timestamp = this._cacheTimestamps.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < this._cacheTTL;
  }

  _setCache(cache, key, value) {
    cache.set(key, value);
    this._cacheTimestamps.set(key, Date.now());
  }

  async getArtists(forceRefresh = false) {
    if (!forceRefresh && this._artistCache && this._isCacheValid("artists")) {
      return this._artistCache;
    }
    const data = await this.get("/api/music/artists");
    this._artistCache = data.artists;
    this._cacheTimestamps.set("artists", Date.now());
    return data.artists;
  }

  async getAlbums(artist, forceRefresh = false) {
    const cacheKey = `albums_${artist}`;
    if (
      !forceRefresh &&
      this._albumCache.has(cacheKey) &&
      this._isCacheValid(cacheKey)
    ) {
      return this._albumCache.get(cacheKey);
    }
    const data = await this.get(
      `/api/music/albums?artist=${encodeURIComponent(artist)}`,
    );
    this._setCache(this._albumCache, cacheKey, data.albums);
    return data.albums;
  }

  async getAlbumsPaginated(
    artist,
    page = 1,
    pageSize = 20,
    forceRefresh = false,
  ) {
    const cacheKey = `albums_paginated_${artist}_${page}_${pageSize}`;
    if (
      !forceRefresh &&
      this._albumCache.has(cacheKey) &&
      this._isCacheValid(cacheKey)
    ) {
      return this._albumCache.get(cacheKey);
    }
    let url = `/api/music/albums/paginated?page=${page}&pageSize=${pageSize}`;
    if (artist) {
      url += `&artist=${encodeURIComponent(artist)}`;
    }
    const data = await this.get(url);
    this._setCache(this._albumCache, cacheKey, data);
    return data;
  }

  async getTracks(album, artist, forceRefresh = false) {
    const cacheKey = `tracks_${album}_${artist}`;
    if (
      !forceRefresh &&
      this._trackCache.has(cacheKey) &&
      this._isCacheValid(cacheKey)
    ) {
      return this._trackCache.get(cacheKey);
    }
    const data = await this.get(
      `/api/music/tracks/album/${encodeURIComponent(album)}?artist=${encodeURIComponent(artist)}`,
    );
    this._setCache(this._trackCache, cacheKey, data.tracks);
    return data.tracks;
  }

  async fetchAlbumCover(album, artist, forceRefresh = false) {
    const cacheKey = `${album}_${artist}`;
    if (!forceRefresh && this._coverCache.has(cacheKey)) {
      return this._coverCache.get(cacheKey);
    }
    try {
      const response = await fetch(
        `${this.baseUrl}/api/music/albumart/album/${encodeURIComponent(album)}?artist=${encodeURIComponent(artist)}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        this._coverCache.set(cacheKey, url);
        return url;
      }
      return null;
    } catch {
      return null;
    }
  }

  clearCache() {
    this._albumCache.clear();
    this._trackCache.clear();
    this._coverCache.clear();
    this._cacheTimestamps.clear();
    this._artistCache = null;
  }
}
