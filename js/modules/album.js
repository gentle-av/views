class Album {
  constructor(data) {
    this.title = data.title || "";
    this.artist = data.artist || "";
    this.year = data.year || "";
    this.tracks = data.tracks || [];
    this.coverUrl = data.coverUrl || null;
    this.trackCount = this.tracks.length;
  }

  getTrackPaths() {
    return this.tracks.map((track) => track.path);
  }

  fillTrackCache(cache) {
    for (const track of this.tracks) {
      if (track.path && track.title) {
        cache.set(track.path, track.title);
      }
    }
  }
}
