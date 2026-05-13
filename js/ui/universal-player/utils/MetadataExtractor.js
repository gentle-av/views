export class MetadataExtractor {
  static async extractTrackInfo(api, path) {
    const metadata = await api.getFileMetadata(path);
    let artist = "",
      title = "",
      coverUrl = null;
    if (metadata?.data) {
      if (metadata.data.file) {
        artist = metadata.data.file.artist || "";
        title = metadata.data.file.title || "";
        coverUrl = metadata.data.file.cover || null;
      }
      if (!title && metadata.data.database) {
        title = metadata.data.database.title || "";
        artist = metadata.data.database.artist || "";
      }
      if (!coverUrl && title) {
        coverUrl = await api.getAlbumCover(path, title, artist);
      }
    }
    if (!title) {
      title = this._extractTitleFromPath(path);
    }
    return { title, artist, coverUrl };
  }

  static _extractTitleFromPath(path) {
    let fileName = path.split("/").pop();
    fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
    const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
    return match ? match[1] : fileName;
  }
}
