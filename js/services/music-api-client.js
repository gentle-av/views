export class MusicApiClient {
  constructor() {
    this.baseUrl = "/api/music";
  }

  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("/")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return response.json();
  }

  async post(url, data) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return result;
  }

  async get(endpoint) {
    const url = endpoint.startsWith("/api/")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;
    const response = await fetch(url);
    return response.json();
  }

  async playTracks(tracks) {
    const setPlaylistResponse = await fetch("/api/audio/setPlaylist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracks }),
    });
    const playlistData = await setPlaylistResponse.json();
    if (!playlistData.success) {
      throw new Error(playlistData.message || "Failed to set playlist");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const playIndexResponse = await fetch("/api/audio/playIndex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: 0 }),
    });
    const playIndexData = await playIndexResponse.json();
    if (!playIndexData.success) {
      const playResponse = await fetch("/api/audio/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      await playResponse.json();
    }
    return { success: true };
  }

  async getArtists() {
    const response = await this.get("/api/music/artists");
    return response.artists || [];
  }

  async getAlbumsPaginated(artist, page, pageSize) {
    const url = `/api/music/albums/paginated?artist=${encodeURIComponent(artist)}&page=${page}&pageSize=${pageSize}`;
    const response = await this.get(url);
    return {
      albums: response.albums || [],
      pagination: response.pagination || { hasNext: false },
    };
  }

  async fetchAlbumCover(album, artist) {
    try {
      let url = `/api/music/albumart/album/${encodeURIComponent(album)}`;
      if (artist) {
        url += `?artist=${encodeURIComponent(artist)}`;
      }
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (error) {}
    return null;
  }

  async getTracks(album, artist, includePaths = true) {
    try {
      let url = `/api/music/tracks/album/${encodeURIComponent(album)}`;
      if (artist) {
        url += `?artist=${encodeURIComponent(artist)}`;
      }
      const response = await this.get(url);
      return response.tracks || [];
    } catch (error) {
      return [];
    }
  }

  async getFileMetadata(filePath) {
    try {
      const url = `/api/music/file-metadata?path=${encodeURIComponent(filePath)}`;
      return await this.get(url);
    } catch (error) {
      return null;
    }
  }

  async openMusium(tracks) {
    return this.playTracks(tracks);
  }
}

if (typeof window !== "undefined") {
  window.MusicApiClient = MusicApiClient;
}
