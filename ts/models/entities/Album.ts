import { Track } from "./Track.js";
import { ArtistName } from "../value-objects/ArtistName.js";

export class Album {
  private title: string;
  private artist: ArtistName;
  private year: string;
  private tracks: Track[];
  private coverUrl: string | null;

  constructor(data: {
    title: string;
    artist?: string;
    year?: string;
    tracks?: Track[];
    coverUrl?: string;
  }) {
    this.title = data.title;
    this.artist = data.artist
      ? new ArtistName(data.artist)
      : ArtistName.unknown();
    this.year = data.year || "";
    this.tracks = data.tracks || [];
    this.coverUrl = data.coverUrl || null;
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

  getYear(): string {
    return this.year;
  }

  getTracks(): Track[] {
    return [...this.tracks];
  }

  getTrackCount(): number {
    return this.tracks.length;
  }

  getCoverUrl(): string | null {
    return this.coverUrl;
  }

  getTrackByNumber(trackNumber: number): Track | undefined {
    return this.tracks.find((t) => t.getTrackNumberValue() === trackNumber);
  }

  getTrackByIndex(index: number): Track | undefined {
    return this.tracks[index];
  }

  getTrackPaths(): string[] {
    return this.tracks.map((t) => t.getPathString());
  }

  getDuration(): number {
    return this.tracks.reduce(
      (sum, track) => sum + track.getDurationSeconds(),
      0,
    );
  }

  getDurationFormatted(): string {
    const total = this.getDuration();
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  getDisplayName(): string {
    return `${this.artist.getValue()} - ${this.title}`;
  }

  withTitle(title: string): Album {
    return new Album({
      title,
      artist: this.artist.getValue(),
      year: this.year,
      tracks: this.tracks,
      coverUrl: this.coverUrl || undefined,
    });
  }

  withArtist(artist: string): Album {
    return new Album({
      title: this.title,
      artist,
      year: this.year,
      tracks: this.tracks,
      coverUrl: this.coverUrl || undefined,
    });
  }

  withYear(year: string): Album {
    return new Album({
      title: this.title,
      artist: this.artist.getValue(),
      year,
      tracks: this.tracks,
      coverUrl: this.coverUrl || undefined,
    });
  }

  withCoverUrl(coverUrl: string): Album {
    return new Album({
      title: this.title,
      artist: this.artist.getValue(),
      year: this.year,
      tracks: this.tracks,
      coverUrl,
    });
  }

  withTracks(tracks: Track[]): Album {
    return new Album({
      title: this.title,
      artist: this.artist.getValue(),
      year: this.year,
      tracks,
      coverUrl: this.coverUrl || undefined,
    });
  }

  addTrack(track: Track): Album {
    return new Album({
      title: this.title,
      artist: this.artist.getValue(),
      year: this.year,
      tracks: [...this.tracks, track],
      coverUrl: this.coverUrl || undefined,
    });
  }

  removeTrack(trackNumber: number): Album {
    return new Album({
      title: this.title,
      artist: this.artist.getValue(),
      year: this.year,
      tracks: this.tracks.filter(
        (t) => t.getTrackNumberValue() !== trackNumber,
      ),
      coverUrl: this.coverUrl || undefined,
    });
  }

  sortTracks(): Album {
    const sorted = [...this.tracks].sort(
      (a, b) => a.getTrackNumberValue() - b.getTrackNumberValue(),
    );
    return new Album({
      title: this.title,
      artist: this.artist.getValue(),
      year: this.year,
      tracks: sorted,
      coverUrl: this.coverUrl || undefined,
    });
  }

  isValid(): boolean {
    return this.title.length > 0 && this.tracks.length > 0;
  }

  searchTracks(query: string): Track[] {
    const lowerQuery = query.toLowerCase();
    return this.tracks.filter(
      (track) =>
        track.getTitle().toLowerCase().includes(lowerQuery) ||
        track.getArtistString().toLowerCase().includes(lowerQuery),
    );
  }

  toJSON() {
    return {
      title: this.title,
      artist: this.artist.getValue(),
      year: this.year,
      tracks: this.tracks.map((t) => t.toJSON()),
      coverUrl: this.coverUrl,
    };
  }

  equals(other: Album): boolean {
    return (
      this.title === other.getTitle() && this.artist.equals(other.getArtist())
    );
  }

  static fromJSON(data: any): Album {
    const tracks = (data.tracks || []).map((t: any) => Track.fromJSON(t));
    return new Album({ ...data, tracks });
  }

  static createEmpty(title: string, artist?: string): Album {
    return new Album({ title, artist });
  }
}
