import { Track } from "./Track.js";
import { ArtistName } from "../value-objects/ArtistName.js";
export class Album {
    constructor(data) {
        this.title = data.title;
        this.artist = data.artist
            ? new ArtistName(data.artist)
            : ArtistName.unknown();
        this.year = data.year || "";
        this.tracks = data.tracks || [];
        this.coverUrl = data.coverUrl || null;
    }
    getTitle() {
        return this.title;
    }
    getArtist() {
        return this.artist;
    }
    getArtistString() {
        return this.artist.getValue();
    }
    getYear() {
        return this.year;
    }
    getTracks() {
        return [...this.tracks];
    }
    getTrackCount() {
        return this.tracks.length;
    }
    getCoverUrl() {
        return this.coverUrl;
    }
    getTrackByNumber(trackNumber) {
        return this.tracks.find((t) => t.getTrackNumberValue() === trackNumber);
    }
    getTrackByIndex(index) {
        return this.tracks[index];
    }
    getTrackPaths() {
        return this.tracks.map((t) => t.getPathString());
    }
    getDuration() {
        return this.tracks.reduce((sum, track) => sum + track.getDurationSeconds(), 0);
    }
    getDurationFormatted() {
        const total = this.getDuration();
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
    getDisplayName() {
        return `${this.artist.getValue()} - ${this.title}`;
    }
    withTitle(title) {
        return new Album({
            title,
            artist: this.artist.getValue(),
            year: this.year,
            tracks: this.tracks,
            coverUrl: this.coverUrl || undefined,
        });
    }
    withArtist(artist) {
        return new Album({
            title: this.title,
            artist,
            year: this.year,
            tracks: this.tracks,
            coverUrl: this.coverUrl || undefined,
        });
    }
    withYear(year) {
        return new Album({
            title: this.title,
            artist: this.artist.getValue(),
            year,
            tracks: this.tracks,
            coverUrl: this.coverUrl || undefined,
        });
    }
    withCoverUrl(coverUrl) {
        return new Album({
            title: this.title,
            artist: this.artist.getValue(),
            year: this.year,
            tracks: this.tracks,
            coverUrl,
        });
    }
    withTracks(tracks) {
        return new Album({
            title: this.title,
            artist: this.artist.getValue(),
            year: this.year,
            tracks,
            coverUrl: this.coverUrl || undefined,
        });
    }
    addTrack(track) {
        return new Album({
            title: this.title,
            artist: this.artist.getValue(),
            year: this.year,
            tracks: [...this.tracks, track],
            coverUrl: this.coverUrl || undefined,
        });
    }
    removeTrack(trackNumber) {
        return new Album({
            title: this.title,
            artist: this.artist.getValue(),
            year: this.year,
            tracks: this.tracks.filter((t) => t.getTrackNumberValue() !== trackNumber),
            coverUrl: this.coverUrl || undefined,
        });
    }
    sortTracks() {
        const sorted = [...this.tracks].sort((a, b) => a.getTrackNumberValue() - b.getTrackNumberValue());
        return new Album({
            title: this.title,
            artist: this.artist.getValue(),
            year: this.year,
            tracks: sorted,
            coverUrl: this.coverUrl || undefined,
        });
    }
    isValid() {
        return this.title.length > 0 && this.tracks.length > 0;
    }
    searchTracks(query) {
        const lowerQuery = query.toLowerCase();
        return this.tracks.filter((track) => track.getTitle().toLowerCase().includes(lowerQuery) ||
            track.getArtistString().toLowerCase().includes(lowerQuery));
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
    equals(other) {
        return (this.title === other.getTitle() && this.artist.equals(other.getArtist()));
    }
    static fromJSON(data) {
        const tracks = (data.tracks || []).map((t) => Track.fromJSON(t));
        return new Album({ ...data, tracks });
    }
    static createEmpty(title, artist) {
        return new Album({ title, artist });
    }
}
