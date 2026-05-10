export class TrackMetadataHelper {
  constructor(albumLibrary, musicApi = null) {
    this.albumLibrary = albumLibrary;
    this.musicApi = musicApi;
    this.tracksCache = new Map();
    this._rebuildIndex();
  }

  _rebuildIndex() {
    this._trackIndex = new Map();
    if (!this.albumLibrary?.albums) return;
    for (const album of this.albumLibrary.albums) {
      for (const track of album.tracks) {
        this._trackIndex.set(track.path, {
          title: track.title || track.name,
          artist: album.artist,
          album: album.title,
          duration: track.duration || 0,
        });
      }
    }
  }

  async fetchMetadata(filePath) {
    if (this.tracksCache.has(filePath)) return this.tracksCache.get(filePath);
    const libraryData = this._trackIndex.get(filePath);
    if (libraryData) {
      this.tracksCache.set(filePath, libraryData);
      return libraryData;
    }
    if (!this.musicApi) {
      return this._fallbackMetadata(filePath);
    }
    try {
      const response = await this.musicApi.getFileMetadata(filePath);
      const metadata = this._parseApiResponse(response, filePath);
      this.tracksCache.set(filePath, metadata);
      return metadata;
    } catch (error) {
      return this._fallbackMetadata(filePath);
    }
  }

  _parseApiResponse(response, filePath) {
    if (response?.data?.file) {
      const fileData = response.data.file;
      return {
        title: fileData.title || this._getFileName(filePath),
        artist:
          fileData.artist ||
          this._extractArtistFromPath(filePath) ||
          "Неизвестный исполнитель",
        album: fileData.album || "",
        duration: fileData.duration || 0,
      };
    }
    if (
      response?.data?.database?.title &&
      response.data.database.title !== "Unknown"
    ) {
      const dbData = response.data.database;
      return {
        title: dbData.title,
        artist:
          dbData.artist ||
          this._extractArtistFromPath(filePath) ||
          "Неизвестный исполнитель",
        album: dbData.album || "",
        duration: dbData.duration || 0,
      };
    }
    return this._fallbackMetadata(filePath);
  }

  _fallbackMetadata(filePath) {
    return {
      title: this._getFileName(filePath),
      artist:
        this._extractArtistFromPath(filePath) || "Неизвестный исполнитель",
      album: "",
      duration: 0,
    };
  }

  _extractArtistFromPath(filePath) {
    const parts = filePath.split("/");
    const musicIndex = parts.findIndex((part) => part === "music");
    if (musicIndex !== -1 && parts.length > musicIndex + 1) {
      return parts[musicIndex + 1];
    }
    return null;
  }

  _getFileName(filePath) {
    const parts = filePath.split("/");
    let fileName = parts.pop() || "Unknown";
    const lastDot = fileName.lastIndexOf(".");
    if (lastDot > 0) fileName = fileName.substring(0, lastDot);
    return decodeURIComponent(fileName);
  }

  clearCache() {
    this.tracksCache.clear();
  }
}
