import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { PlaybackController } from "../../../services/playback/PlaybackController.js";
import { PlaylistManager } from "../../../services/playback/PlaylistManager.js";
import { PlaybackStateManager } from "../../../services/playback/PlaybackStateManager.js";
import { TrackNavigator } from "../../../services/playback/TrackNavigator.js";
import { VolumeController } from "../../../services/playback/VolumeController.js";
import { Track } from "../../../models/entities/Track.js";
import { Album } from "../../../models/entities/Album.js";
// Мок для ApiClient
class MockApiClient {
    async post(endpoint, data) {
        return { success: true, data: {} };
    }
    async get(endpoint) {
        return { success: true, data: {} };
    }
}
describe("PlaybackController", () => {
    let apiClient;
    let playlistManager;
    let stateManager;
    let trackNavigator;
    let volumeController;
    let controller;
    let tracks;
    let album;
    beforeEach(() => {
        apiClient = new MockApiClient();
        playlistManager = new PlaylistManager();
        stateManager = new PlaybackStateManager();
        volumeController = new VolumeController(apiClient);
        trackNavigator = new TrackNavigator(playlistManager, stateManager);
        controller = new PlaybackController(apiClient, playlistManager, stateManager, trackNavigator, volumeController);
        tracks = [
            new Track({
                path: "/music/01.mp3",
                title: "Song 1",
                trackNumber: 1,
                duration: 180,
            }),
            new Track({
                path: "/music/02.mp3",
                title: "Song 2",
                trackNumber: 2,
                duration: 200,
            }),
            new Track({
                path: "/music/03.mp3",
                title: "Song 3",
                trackNumber: 3,
                duration: 220,
            }),
        ];
        album = new Album({ title: "Test Album", artist: "Test Artist", tracks });
    });
    afterEach(() => {
        controller.destroy();
    });
    it("should create controller", () => {
        expect(controller).toBeDefined();
        expect(controller.isPlaying()).toBe(false);
        expect(controller.getCurrentTrack()).toBeNull();
    });
    it("should play when playlist has current track", async () => {
        playlistManager.setPlaylist(tracks);
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.play();
        expect(postSpy).toHaveBeenCalledWith("/api/audio/play");
        expect(controller.isPlaying()).toBe(true);
    });
    it("should pause", async () => {
        playlistManager.setPlaylist(tracks);
        await controller.play();
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.pause();
        expect(postSpy).toHaveBeenCalledWith("/api/audio/pause");
        expect(controller.isPlaying()).toBe(false);
    });
    it("should toggle play/pause", async () => {
        playlistManager.setPlaylist(tracks);
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.togglePlayPause();
        expect(postSpy).toHaveBeenCalledWith("/api/audio/play");
        await controller.togglePlayPause();
        expect(postSpy).toHaveBeenCalledWith("/api/audio/pause");
    });
    it("should stop", async () => {
        playlistManager.setPlaylist(tracks);
        await controller.play();
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.stop();
        expect(postSpy).toHaveBeenCalledWith("/api/audio/stop");
        expect(controller.isPlaying()).toBe(false);
        expect(controller.getProgress().current).toBe(0);
    });
    it("should play next track", async () => {
        playlistManager.setPlaylist(tracks);
        await controller.play();
        const postSpy = vi.spyOn(apiClient, "post");
        const next = await controller.next();
        expect(next).toEqual(tracks[1]);
        expect(controller.getCurrentTrack()).toEqual(tracks[1]);
        expect(postSpy).toHaveBeenCalledWith("/api/audio/play");
    });
    it("should play previous track", async () => {
        playlistManager.setPlaylist(tracks);
        await controller.play();
        await controller.next();
        const postSpy = vi.spyOn(apiClient, "post");
        const prev = await controller.previous();
        expect(prev).toEqual(tracks[0]);
        expect(controller.getCurrentTrack()).toEqual(tracks[0]);
    });
    it("should play specific track", async () => {
        playlistManager.setPlaylist(tracks);
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.playTrack(tracks[2], 2);
        expect(controller.getCurrentTrack()).toEqual(tracks[2]);
        expect(controller.isPlaying()).toBe(true);
        expect(postSpy).toHaveBeenCalledWith("/api/audio/play");
    });
    it("should play album", async () => {
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.playAlbum(album);
        expect(controller.getPlaylist()).toHaveLength(3);
        expect(controller.getCurrentTrack()).toEqual(tracks[0]);
        expect(controller.isPlaying()).toBe(true);
        expect(postSpy).toHaveBeenCalledWith("/api/audio/play");
    });
    it("should play first track", async () => {
        playlistManager.setPlaylist(tracks);
        await controller.next();
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.playFirst();
        expect(controller.getCurrentTrack()).toEqual(tracks[0]);
        expect(postSpy).toHaveBeenCalledWith("/api/audio/play");
    });
    it("should seek to position", async () => {
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.seek(45);
        expect(postSpy).toHaveBeenCalledWith("/api/audio/seek", { position: 45 });
    });
    it("should set volume", async () => {
        const setVolumeSpy = vi.spyOn(volumeController, "setVolume");
        await controller.setVolume(75);
        expect(setVolumeSpy).toHaveBeenCalled();
        expect(stateManager.getVolume()).toBe(75);
    });
    it("should toggle mute", async () => {
        const toggleMuteSpy = vi.spyOn(volumeController, "toggleMute");
        await controller.toggleMute();
        expect(toggleMuteSpy).toHaveBeenCalled();
    });
    it("should set repeat mode", () => {
        controller.setRepeatMode("one");
        expect(stateManager.getRepeatMode()).toBe("one");
        expect(playlistManager.getRepeatMode()).toBe("one");
        controller.setRepeatMode("all");
        expect(stateManager.getRepeatMode()).toBe("all");
        controller.setRepeatMode("none");
        expect(stateManager.getRepeatMode()).toBe("none");
    });
    it("should toggle shuffle", () => {
        expect(stateManager.isShuffle()).toBe(false);
        controller.toggleShuffle();
        expect(stateManager.isShuffle()).toBe(true);
        expect(playlistManager.isShuffleMode()).toBe(true);
        controller.toggleShuffle();
        expect(stateManager.isShuffle()).toBe(false);
        expect(playlistManager.isShuffleMode()).toBe(false);
    });
    it("should clear playlist", async () => {
        playlistManager.setPlaylist(tracks);
        const postSpy = vi.spyOn(apiClient, "post");
        await controller.clearPlaylist();
        expect(playlistManager.isEmpty()).toBe(true);
        expect(controller.getCurrentTrack()).toBeNull();
        expect(postSpy).toHaveBeenCalledWith("/api/audio/clear");
    });
    it("should get playlist", () => {
        playlistManager.setPlaylist(tracks);
        const playlist = controller.getPlaylist();
        expect(playlist).toHaveLength(3);
        expect(playlist).toEqual(tracks);
    });
    it("should get progress", async () => {
        stateManager.updateProgress(45, 180);
        const progress = controller.getProgress();
        expect(progress.current).toBe(45);
        expect(progress.duration).toBe(180);
        expect(progress.percent).toBe(25);
    });
    it("should return zero percent when duration is zero", () => {
        stateManager.updateProgress(45, 0);
        const progress = controller.getProgress();
        expect(progress.percent).toBe(0);
    });
});
