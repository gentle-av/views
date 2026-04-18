class Album {
  constructor(data) {
    this.title = data.title || data.name || "";
    this.artist = data.artist || "";
    this.year = data.year || "";
    this.coverUrl = data.coverUrl || null;
    this.tracks = (data.tracks || []).map((t) => new Track(t));
    this._rawData = data;
  }

  get trackCount() {
    return this.tracks.length;
  }

  get displayTitle() {
    return `${this.artist} — ${this.title}`;
  }

  getTrackPaths() {
    return this.tracks.map((t) => t.path);
  }
}
