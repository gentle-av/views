import { describe, it, expect, beforeEach } from "vitest";
import { TrackNavigator } from "../../../services/playback/TrackNavigator.js";
import { PlaylistManager } from "../../../services/playback/PlaylistManager.js";
import { PlaybackStateManager } from "../../../services/playback/PlaybackStateManager.js";
import { Track } from "../../../models/entities/Track.js";
describe("TrackNavigator", () => {
    let playlistManager;
    let stateManager;
    let navigator;
    let tracks;
    beforeEach(() => {
        playlistManager = new PlaylistManager();
        stateManager = new PlaybackStateManager();
        navigator = new TrackNavigator(playlistManager, stateManager);
        tracks = [
            new Track({ path: "/music/01.mp3", title: "Song 1", trackNumber: 1 }),
            new Track({ path: "/music/02.mp3", title: "Song 2", trackNumber: 2 }),
            new Track({ path: "/music/03.mp3", title: "Song 3", trackNumber: 3 }),
        ];
        playlistManager.setPlaylist(tracks);
    });
    it("should play next track", () => {
        const next = navigator.playNext();
        expect(next).toEqual(tracks[1]);
        expect(stateManager.getCurrentIndex()).toBe(1);
        expect(stateManager.isPlaying()).toBe(true);
    });
    it("should play previous track", () => {
        playlistManager.next();
        const prev = navigator.playPrevious();
        expect(prev).toEqual(tracks[0]);
        expect(stateManager.getCurrentIndex()).toBe(0);
    });
    it("should play track by index", () => {
        const track = navigator.playTrackByIndex(2);
        expect(track).toEqual(tracks[2]);
        expect(stateManager.getCurrentIndex()).toBe(2);
    });
    it("should play first track", () => {
        const track = navigator.playFirst();
        expect(track).toEqual(tracks[0]);
        expect(stateManager.getCurrentIndex()).toBe(0);
    });
    it("should play last track", () => {
        const track = navigator.playLast();
        expect(track).toEqual(tracks[2]);
        expect(stateManager.getCurrentIndex()).toBe(2);
    });
    it("should restart current track", () => {
        playlistManager.playIndex(1);
        stateManager.setCurrentTime(45);
        const track = navigator.restartCurrent();
        expect(track).toEqual(tracks[1]);
        expect(stateManager.getCurrentTime()).toBe(0);
    });
    it("should check has next", () => {
        playlistManager.playIndex(1);
        expect(navigator.hasNext()).toBe(true);
        playlistManager.playIndex(2);
        expect(navigator.hasNext()).toBe(false);
    });
    it("should have next with repeat all", () => {
        stateManager.setRepeatMode("all");
        playlistManager.playIndex(2);
        expect(navigator.hasNext()).toBe(true);
    });
    it("should have next with repeat one", () => {
        stateManager.setRepeatMode("one");
        playlistManager.playIndex(2);
        expect(navigator.hasNext()).toBe(true);
    });
    it("should check has previous", () => {
        playlistManager.playIndex(1);
        expect(navigator.hasPrevious()).toBe(true);
        playlistManager.playIndex(0);
        expect(navigator.hasPrevious()).toBe(false);
    });
    it("should have previous with repeat all", () => {
        stateManager.setRepeatMode("all");
        playlistManager.playIndex(0);
        expect(navigator.hasPrevious()).toBe(true);
    });
    it("should get next track without playing", () => {
        navigator.playTrackByIndex(1);
        const next = navigator.getNextTrack();
        expect(next).toEqual(tracks[2]);
        expect(stateManager.getCurrentIndex()).toBe(1);
    });
    it("should get previous track without playing", () => {
        playlistManager.playIndex(1);
        const prev = navigator.getPreviousTrack();
        expect(prev).toEqual(tracks[0]);
    });
    it("should return null for next at end without repeat", () => {
        playlistManager.playIndex(2);
        const next = navigator.getNextTrack();
        expect(next).toBeNull();
    });
    it("should return null for previous at start without repeat", () => {
        playlistManager.playIndex(0);
        const prev = navigator.getPreviousTrack();
        expect(prev).toBeNull();
    });
    it("should return null when playlist is empty", () => {
        playlistManager.clear();
        expect(navigator.playNext()).toBeNull();
        expect(navigator.playPrevious()).toBeNull();
        expect(navigator.playFirst()).toBeNull();
        expect(navigator.playLast()).toBeNull();
    });
});
