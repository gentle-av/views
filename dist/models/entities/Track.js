import { FilePath } from "../value-objects/FilePath.js";
import { Duration } from "../value-objects/Duration.js";
import { TrackNumber } from "../value-objects/TrackNumber.js";
import { ArtistName } from "../value-objects/ArtistName.js";
export class Track {
    constructor(data) {
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
    getPath() {
        return this.path;
    }
    getPathString() {
        return this.path.getValue();
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
    getAlbum() {
        return this.album;
    }
    getDuration() {
        return this.duration;
    }
    getDurationSeconds() {
        return this.duration.getSeconds();
    }
    getDurationFormatted() {
        return this.duration.formatShort();
    }
    getTrackNumber() {
        return this.trackNumber;
    }
    getTrackNumberValue() {
        return this.trackNumber.getValue();
    }
    getTrackNumberFormatted() {
        return this.trackNumber.format();
    }
    getYear() {
        return this.year;
    }
    getCoverUrl() {
        return this.coverUrl;
    }
    getDisplayName() {
        return `${this.trackNumber.format()}. ${this.title}`;
    }
    // Setters (return new instance for immutability)
    withTitle(title) {
        return new Track({ ...this.toJSON(), title });
    }
    withArtist(artist) {
        return new Track({ ...this.toJSON(), artist });
    }
    withAlbum(album) {
        return new Track({ ...this.toJSON(), album });
    }
    withTrackNumber(trackNumber) {
        return new Track({ ...this.toJSON(), trackNumber });
    }
    withYear(year) {
        return new Track({ ...this.toJSON(), year });
    }
    withCoverUrl(coverUrl) {
        return new Track({ ...this.toJSON(), coverUrl });
    }
    isValid() {
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
    equals(other) {
        return this.path.equals(other.getPath());
    }
    static fromJSON(data) {
        return new Track(data);
    }
    static createEmpty(path) {
        return new Track({ path });
    }
}
