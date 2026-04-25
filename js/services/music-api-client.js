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

  async fetchAlbumCover(album, artist) {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/music/albumart/album/${encodeURIComponent(album)}?artist=${encodeURIComponent(artist)}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    } catch {
      return null;
    }
  }

  async getFileMetadata(filePath) {
    return this.get(
      `/api/music/file-metadata?path=${encodeURIComponent(filePath)}`,
    );
  }
}
