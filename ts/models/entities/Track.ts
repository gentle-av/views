import { FilePath } from "../value-objects/FilePath.js";
import { Duration } from "../value-objects/Duration.js";
import { TrackNumber } from "../value-objects/TrackNumber.js";
import { ArtistName } from "../value-objects/ArtistName.js";

export class Track {
  private readonly path: FilePath;
  private title: string;
  private artist: ArtistName;
  private album: string;
  private duration: Duration;
  private trackNumber: TrackNumber;
  private year: string;
  private coverUrl: string | null;

  constructor(data: {
    path: string;
    title?: string;
    artist?: string;
    album?: string;
    duration?: number;
    trackNumber?: number;
    year?: string;
    coverUrl?: string;
  }) {
    this.path = new FilePath(data.path);
    this.title = data.title || this.path.getFileNameWithoutExtension();
    this.artist = data.artist
      ? new ArtistName(data.artist)
      : ArtistName.unknown();
    this.album = data.album || "";
    this.duration = data.duration
      ? new Duration(data.duration)
      : Duration.zero();
    this.trackNumber = data.trackNumber
      ? new TrackNumber(data.trackNumber)
      : new TrackNumber(1);
    this.year = data.year || "";
    this.coverUrl = data.coverUrl || null;
  }

  getPath(): FilePath {
    return this.path;
  }

  getPathString(): string {
    return this.path.getValue();
  }

  getTitle(): string {
    return this.title;
  }

  getArtist(): ArtistName {
    return this.artist;
  }

  getArtistString(): string {
    return this.artist.getValue();
  }

  getAlbum(): string {
    return this.album;
  }

  getDuration(): Duration {
    return this.duration;
  }

  getDurationSeconds(): number {
    return this.duration.getSeconds();
  }

  getDurationFormatted(): string {
    return this.duration.formatShort();
  }

  getTrackNumber(): TrackNumber {
    return this.trackNumber;
  }

  getTrackNumberValue(): number {
    return this.trackNumber.getValue();
  }

  getTrackNumberFormatted(): string {
    return this.trackNumber.format();
  }

  getYear(): string {
    return this.year;
  }

  getCoverUrl(): string | null {
    return this.coverUrl;
  }

  getDisplayName(): string {
    return `${this.trackNumber.format()}. ${this.title}`;
  }

  // Setters (return new instance for immutability)
  withTitle(title: string): Track {
    return new Track({ ...this.toJSON(), title });
  }

  withArtist(artist: string): Track {
    return new Track({ ...this.toJSON(), artist });
  }

  withAlbum(album: string): Track {
    return new Track({ ...this.toJSON(), album });
  }

  withTrackNumber(trackNumber: number): Track {
    return new Track({ ...this.toJSON(), trackNumber });
  }

  withYear(year: string): Track {
    return new Track({ ...this.toJSON(), year });
  }

  withCoverUrl(coverUrl: string): Track {
    return new Track({ ...this.toJSON(), coverUrl });
  }

  isValid(): boolean {
    return this.path.getValue().length > 0 && this.title.length > 0;
  }

  toJSON() {
    return {
      path: this.path.getValue(),
      title: this.title,
      artist: this.artist.getValue(),
      album: this.album,
      duration: this.duration.getSeconds(),
      trackNumber: this.trackNumber.getValue(),
      year: this.year,
      coverUrl: this.coverUrl,
    };
  }

  equals(other: Track): boolean {
    return this.path.equals(other.getPath());
  }

  static fromJSON(data: any): Track {
    return new Track(data);
  }

  static createEmpty(path: string): Track {
    return new Track({ path });
  }
}
