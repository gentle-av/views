import { describe, it, expect } from "vitest";
import { Track } from "../../../models/entities/Track.js";

describe("Track", () => {
  it("should create track with minimal data", () => {
    const track = new Track({ path: "/music/song.mp3" });
    expect(track.getPathString()).toBe("/music/song.mp3");
    expect(track.getTitle()).toBe("song");
    expect(track.getArtistString()).toBe("Unknown Artist");
    expect(track.getDurationSeconds()).toBe(0);
    expect(track.getTrackNumberValue()).toBe(1);
  });

  it("should create track with full data", () => {
    const track = new Track({
      path: "/music/01-song.mp3",
      title: "My Song",
      artist: "The Artist",
      album: "Greatest Hits",
      duration: 215,
      trackNumber: 1,
      year: "2024",
      coverUrl: "/covers/cover.jpg",
    });

    expect(track.getPathString()).toBe("/music/01-song.mp3");
    expect(track.getTitle()).toBe("My Song");
    expect(track.getArtistString()).toBe("The Artist");
    expect(track.getAlbum()).toBe("Greatest Hits");
    expect(track.getDurationSeconds()).toBe(215);
    expect(track.getTrackNumberValue()).toBe(1);
    expect(track.getYear()).toBe("2024");
    expect(track.getCoverUrl()).toBe("/covers/cover.jpg");
  });

  it("should format duration", () => {
    const track = new Track({ path: "/song.mp3", duration: 125 });
    expect(track.getDurationFormatted()).toBe("2:05");
  });

  it("should format track number", () => {
    const track = new Track({ path: "/song.mp3", trackNumber: 5 });
    expect(track.getTrackNumberFormatted()).toBe("05");
  });

  it("should get display name", () => {
    const track = new Track({
      path: "/song.mp3",
      title: "My Song",
      trackNumber: 3,
    });
    expect(track.getDisplayName()).toBe("03. My Song");
  });

  it("should create immutable copies with with* methods", () => {
    const original = new Track({ path: "/song.mp3", title: "Original" });
    const updated = original.withTitle("Updated");

    expect(original.getTitle()).toBe("Original");
    expect(updated.getTitle()).toBe("Updated");
    expect(original).not.toBe(updated);
  });

  it("should chain with* methods", () => {
    const track = new Track({ path: "/song.mp3" });
    const updated = track
      .withTitle("New Title")
      .withArtist("New Artist")
      .withTrackNumber(10);

    expect(updated.getTitle()).toBe("New Title");
    expect(updated.getArtistString()).toBe("New Artist");
    expect(updated.getTrackNumberValue()).toBe(10);
  });

  it("should validate track", () => {
    const valid = new Track({ path: "/music/song.mp3", title: "Song" });
    expect(valid.isValid()).toBe(true);
    expect(() => new Track({ path: "", title: "" })).toThrow(
      "File path cannot be empty",
    );
  });

  it("should serialize to JSON", () => {
    const track = new Track({
      path: "/music/song.mp3",
      title: "My Song",
      artist: "Artist",
      album: "Album",
      duration: 180,
      trackNumber: 2,
      year: "2024",
    });

    const json = track.toJSON();
    expect(json.path).toBe("/music/song.mp3");
    expect(json.title).toBe("My Song");
    expect(json.artist).toBe("Artist");
    expect(json.duration).toBe(180);
  });

  it("should deserialize from JSON", () => {
    const json = {
      path: "/music/song.mp3",
      title: "My Song",
      artist: "Artist",
      duration: 180,
      trackNumber: 2,
    };

    const track = Track.fromJSON(json);
    expect(track.getTitle()).toBe("My Song");
    expect(track.getArtistString()).toBe("Artist");
    expect(track.getDurationSeconds()).toBe(180);
  });

  it("should compare equality by path", () => {
    const track1 = new Track({ path: "/music/same.mp3", title: "Title 1" });
    const track2 = new Track({ path: "/music/same.mp3", title: "Title 2" });
    const track3 = new Track({ path: "/music/different.mp3" });

    expect(track1.equals(track2)).toBe(true);
    expect(track1.equals(track3)).toBe(false);
  });

  it("should create empty track", () => {
    const track = Track.createEmpty("/music/empty.mp3");
    expect(track.getPathString()).toBe("/music/empty.mp3");
    expect(track.getTitle()).toBe("empty");
    expect(track.isValid()).toBe(true);
  });
});
