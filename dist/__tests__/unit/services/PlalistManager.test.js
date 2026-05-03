import { describe, it, expect, beforeEach } from "vitest";
import { PlaylistManager } from "../../../services/playback/PlaylistManager.js";
import { Track } from "../../../models/entities/Track.js";
import { Album } from "../../../models/entities/Album.js";
describe("PlaylistManager", () => {
    let manager;
    let track1;
    let track2;
    let track3;
    beforeEach(() => {
        manager = new PlaylistManager();
        track1 = new Track({
            path: "/music/01-song1.mp3",
            title: "Song 1",
            trackNumber: 1,
        });
        track2 = new Track({
            path: "/music/02-song2.mp3",
            title: "Song 2",
            trackNumber: 2,
        });
        track3 = new Track({
            path: "/music/03-song3.mp3",
            title: "Song 3",
            trackNumber: 3,
        });
    });
    it("should start empty", () => {
        expect(manager.isEmpty()).toBe(true);
        expect(manager.getSize()).toBe(0);
        expect(manager.getCurrentTrack()).toBeNull();
    });
    it("should add track", () => {
        manager.addTrack(track1);
        expect(manager.isEmpty()).toBe(false);
        expect(manager.getSize()).toBe(1);
        expect(manager.getCurrentTrack()).toEqual(track1);
    });
    it("should add multiple tracks", () => {
        manager.addTracks([track1, track2, track3]);
        expect(manager.getSize()).toBe(3);
        expect(manager.getTracks()).toHaveLength(3);
    });
    it("should add album", () => {
        const album = new Album({
            title: "Album",
            tracks: [track1, track2, track3],
        });
        manager.addAlbum(album);
        expect(manager.getSize()).toBe(3);
    });
    it("should remove track", () => {
        manager.addTracks([track1, track2, track3]);
        const result = manager.removeTrack(1);
        expect(result).toBe(true);
        expect(manager.getSize()).toBe(2);
        expect(manager.getTracks()[0]).toEqual(track1);
        expect(manager.getTracks()[1]).toEqual(track3);
    });
    it("should not remove invalid index", () => {
        manager.addTrack(track1);
        const result = manager.removeTrack(5);
        expect(result).toBe(false);
        expect(manager.getSize()).toBe(1);
    });
    it("should clear playlist", () => {
        manager.addTracks([track1, track2, track3]);
        manager.clear();
        expect(manager.isEmpty()).toBe(true);
        expect(manager.getSize()).toBe(0);
    });
    it("should set playlist", () => {
        manager.setPlaylist([track1, track2, track3]);
        expect(manager.getSize()).toBe(3);
        expect(manager.getCurrentIndex()).toBe(0);
        expect(manager.getCurrentTrack()).toEqual(track1);
    });
    it("should navigate next", () => {
        manager.setPlaylist([track1, track2, track3]);
        const next = manager.next();
        expect(next).toEqual(track2);
        expect(manager.getCurrentIndex()).toBe(1);
    });
    it("should not go next at end without repeat", () => {
        manager.setPlaylist([track1]);
        manager.next(); // дошел до конца
        const next = manager.next();
        expect(next).toBeNull();
        expect(manager.getCurrentIndex()).toBe(0);
    });
    it("should repeat all when at end", () => {
        manager.setPlaylist([track1, track2]);
        manager.setRepeatMode("all");
        manager.next(); // track2
        const next = manager.next(); // должно вернуться к track1
        expect(next).toEqual(track1);
        expect(manager.getCurrentIndex()).toBe(0);
    });
    it("should navigate previous", () => {
        manager.setPlaylist([track1, track2, track3]);
        manager.next(); // track2
        manager.next(); // track3
        const prev = manager.previous();
        expect(prev).toEqual(track2);
        expect(manager.getCurrentIndex()).toBe(1);
    });
    it("should play by index", () => {
        manager.setPlaylist([track1, track2, track3]);
        const track = manager.playIndex(2);
        expect(track).toEqual(track3);
        expect(manager.getCurrentIndex()).toBe(2);
    });
    it("should return null for invalid index", () => {
        manager.setPlaylist([track1, track2]);
        const track = manager.playIndex(5);
        expect(track).toBeNull();
        expect(manager.getCurrentIndex()).toBe(0);
    });
    it("should set repeat mode", () => {
        expect(manager.getRepeatMode()).toBe("none");
        manager.setRepeatMode("one");
        expect(manager.getRepeatMode()).toBe("one");
        manager.setRepeatMode("all");
        expect(manager.getRepeatMode()).toBe("all");
    });
    it("should set shuffle mode", () => {
        manager.setPlaylist([track1, track2, track3]);
        expect(manager.isShuffleMode()).toBe(false);
        manager.setShuffleMode(true);
        expect(manager.isShuffleMode()).toBe(true);
    });
    it("should preserve current track after shuffle", () => {
        manager.setPlaylist([track1, track2, track3]);
        manager.playIndex(1); // track2
        manager.setShuffleMode(true);
        expect(manager.getCurrentTrack()).toEqual(track2);
    });
});
