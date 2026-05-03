import { describe, it, expect, beforeEach } from "vitest";
import { PlaybackStateManager } from "../../../services/playback/PlaybackStateManager.js";
import { Track } from "../../../models/entities/Track.js";
describe("PlaybackStateManager", () => {
    let manager;
    let track;
    beforeEach(() => {
        manager = new PlaybackStateManager();
        track = new Track({ path: "/music/song.mp3", title: "Test Song" });
    });
    it("should have initial state", () => {
        const state = manager.getState();
        expect(state.isPlaying).toBe(false);
        expect(state.currentTrack).toBeNull();
        expect(state.currentIndex).toBe(-1);
        expect(state.totalTracks).toBe(0);
        expect(state.volume).toBe(50);
        expect(state.isMuted).toBe(false);
    });
    it("should set playing state", () => {
        manager.setPlaying(true);
        expect(manager.isPlaying()).toBe(true);
        manager.setPlaying(false);
        expect(manager.isPlaying()).toBe(false);
    });
    it("should set current track", () => {
        manager.setCurrentTrack(track, 2);
        expect(manager.getCurrentTrack()).toEqual(track);
        expect(manager.getCurrentIndex()).toBe(2);
    });
    it("should set total tracks", () => {
        manager.setTotalTracks(10);
        expect(manager.getTotalTracks()).toBe(10);
    });
    it("should update progress", () => {
        manager.updateProgress(30, 120);
        expect(manager.getCurrentTime()).toBe(30);
        expect(manager.getDuration()).toBe(120);
    });
    it("should set volume", () => {
        manager.setVolume(75);
        expect(manager.getVolume()).toBe(75);
    });
    it("should clamp volume to 0-100", () => {
        manager.setVolume(-10);
        expect(manager.getVolume()).toBe(0);
        manager.setVolume(150);
        expect(manager.getVolume()).toBe(100);
    });
    it("should set muted", () => {
        manager.setMuted(true);
        expect(manager.isMuted()).toBe(true);
        manager.setMuted(false);
        expect(manager.isMuted()).toBe(false);
    });
    it("should set repeat mode", () => {
        manager.setRepeatMode("one");
        expect(manager.getRepeatMode()).toBe("one");
        manager.setRepeatMode("all");
        expect(manager.getRepeatMode()).toBe("all");
        manager.setRepeatMode("none");
        expect(manager.getRepeatMode()).toBe("none");
    });
    it("should set shuffle", () => {
        manager.setShuffle(true);
        expect(manager.isShuffle()).toBe(true);
        manager.setShuffle(false);
        expect(manager.isShuffle()).toBe(false);
    });
    it("should detect active playback", () => {
        expect(manager.hasActivePlayback()).toBe(false);
        manager.setCurrentTrack(track, 0);
        manager.setTotalTracks(5);
        expect(manager.hasActivePlayback()).toBe(true);
    });
    it("should reset state", () => {
        manager.setPlaying(true);
        manager.setCurrentTrack(track, 2);
        manager.setTotalTracks(10);
        manager.setVolume(80);
        manager.reset();
        expect(manager.isPlaying()).toBe(false);
        expect(manager.getCurrentTrack()).toBeNull();
        expect(manager.getCurrentIndex()).toBe(-1);
        expect(manager.getTotalTracks()).toBe(0);
        expect(manager.getVolume()).toBe(50);
    });
    it("should notify subscribers on state change", () => {
        let callCount = 0;
        let lastState = null;
        const unsubscribe = manager.subscribe((state) => {
            callCount++;
            lastState = state;
        });
        manager.setPlaying(true);
        expect(callCount).toBe(1);
        expect(lastState?.isPlaying).toBe(true);
        manager.setVolume(75);
        expect(callCount).toBe(2);
        unsubscribe();
        manager.setMuted(true);
        expect(callCount).toBe(2);
    });
});
