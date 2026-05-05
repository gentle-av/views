class Track {
  constructor(data) {
    this.path = data.path;
    this.name = data.name || data.title || this._extractNameFromPath(data.path);
    this.title = data.title || this.name;
    this.artist = data.artist || "";
    this.album = data.album || "";
    this.duration = data.duration || 0;
    this.trackNumber = data.trackNumber || data.track || 0;
    this.year = data.year || "";
  }

  _extractNameFromPath(path) {
    if (!path) return "Без названия";
    return decodeURIComponent(path.split("/").pop()).replace(
      /\.(flac|mp3|m4a|wav)$/i,
      "",
    );
  }

  get displayName() {
    return this.title || this.name;
  }

  get displayDuration() {
    if (!this.duration) return "";
    const mins = Math.floor(this.duration / 60);
    const secs = Math.floor(this.duration % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}
