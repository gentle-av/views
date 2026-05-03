class MusicApiClient {
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;
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
    console.log(`[API POST] ${url}`, data);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    console.log(`[API POST] Response for ${url}:`, result);
    return result;
  }

  async get(endpoint) {
    return this.request(endpoint, {
      method: "GET",
    });
  }

  async playTracks(trackPaths) {
    try {
      const response = await this.post("/api/audio/setPlaylist", {
        tracks: trackPaths,
      });
      if (response && response.success) {
        await this.post("/api/audio/play");
      }
      return response;
    } catch (error) {
      console.error("Failed to play tracks:", error);
      throw error;
    }
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
    } catch (error) {
      console.error("Failed to fetch album cover:", error);
    }
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
      console.error("Failed to get tracks:", error);
      return [];
    }
  }

  async getFileMetadata(filePath) {
    try {
      const url = `/api/music/file-metadata?path=${encodeURIComponent(filePath)}`;
      return await this.get(url);
    } catch (error) {
      console.error("Failed to get file metadata:", error);
      return null;
    }
  }

  async openMusium(trackPaths) {
    try {
      return await this.post("/api/music/open", { tracks: trackPaths });
    } catch (error) {
      console.error("Failed to open Musium:", error);
      throw error;
    }
  }
}

if (typeof window !== "undefined") {
  window.MusicApiClient = MusicApiClient;
}
