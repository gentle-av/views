export class PlaybackController {
    constructor(apiClient, playlistManager, stateManager, trackNavigator, volumeController) {
        this.apiClient = apiClient;
        this.playlistManager = playlistManager;
        this.stateManager = stateManager;
        this.trackNavigator = trackNavigator;
        this.volumeController = volumeController;
        this.pollInterval = null;
    }
    async init() {
        await this.volumeController.init();
        this.startPolling();
    }
    async play() {
        let currentTrack = this.playlistManager.getCurrentTrack();
        if (!currentTrack) {
            if (!this.playlistManager.isEmpty()) {
                currentTrack = this.trackNavigator.playFirst();
            }
        }
        if (currentTrack) {
            this.stateManager.setPlaying(true);
            await this.apiClient.post("/api/audio/play");
        }
    }
    async pause() {
        this.stateManager.setPlaying(false);
        await this.apiClient.post("/api/audio/pause");
    }
    async togglePlayPause() {
        if (this.stateManager.isPlaying()) {
            await this.pause();
        }
        else {
            await this.play();
        }
    }
    async stop() {
        this.stateManager.setPlaying(false);
        this.stateManager.setCurrentTime(0);
        await this.apiClient.post("/api/audio/stop");
    }
    async next() {
        const nextTrack = this.trackNavigator.playNext();
        if (nextTrack) {
            await this.play();
        }
        return nextTrack;
    }
    async previous() {
        const prevTrack = this.trackNavigator.playPrevious();
        if (prevTrack) {
            await this.play();
        }
        return prevTrack;
    }
    async playTrack(track, index) {
        this.playlistManager.playIndex(index);
        this.stateManager.setCurrentTrack(track, index);
        this.stateManager.setPlaying(true);
        await this.apiClient.post("/api/audio/play");
    }
    async playAlbum(album) {
        const tracks = album.getTracks();
        this.playlistManager.setPlaylist(tracks);
        this.stateManager.setTotalTracks(tracks.length);
        await this.playFirst();
    }
    async playFirst() {
        const track = this.trackNavigator.playFirst();
        if (track) {
            await this.play();
        }
    }
    async seek(position) {
        this.stateManager.setCurrentTime(position);
        await this.apiClient.post("/api/audio/seek", { position });
    }
    async setVolume(volume) {
        const volumeObj = this.volumeController.getVolume();
        const newVolume = volumeObj.increase(volume - volumeObj.getValue());
        await this.volumeController.setVolume(newVolume);
        this.stateManager.setVolume(newVolume.getValue());
    }
    async toggleMute() {
        await this.volumeController.toggleMute();
        this.stateManager.setMuted(this.volumeController.isMutedState());
    }
    setRepeatMode(mode) {
        this.playlistManager.setRepeatMode(mode);
        this.stateManager.setRepeatMode(mode);
    }
    toggleShuffle() {
        const newShuffle = !this.stateManager.isShuffle();
        this.playlistManager.setShuffleMode(newShuffle);
        this.stateManager.setShuffle(newShuffle);
    }
    async clearPlaylist() {
        this.playlistManager.clear();
        this.stateManager.reset();
        await this.apiClient.post("/api/audio/clear");
    }
    getPlaylist() {
        return this.playlistManager.getTracks();
    }
    getCurrentTrack() {
        return this.stateManager.getCurrentTrack();
    }
    isPlaying() {
        return this.stateManager.isPlaying();
    }
    getProgress() {
        const current = this.stateManager.getCurrentTime();
        const duration = this.stateManager.getDuration();
        const percent = duration > 0 ? (current / duration) * 100 : 0;
        return { current, duration, percent };
    }
    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        this.pollInterval = window.setInterval(async () => {
            try {
                const state = await this.apiClient.get("/api/audio/playbackState");
                if (state.success && state.data) {
                    this.stateManager.setPlaying(state.data.isPlaying || false);
                    this.stateManager.setTotalTracks(state.data.totalTracks || 0);
                }
                const timeInfo = await this.apiClient.get("/api/audio/currentTime");
                if (timeInfo.success && timeInfo.data) {
                    this.stateManager.updateProgress(timeInfo.data.currentTime || 0, timeInfo.data.duration || 0);
                }
            }
            catch (error) {
                console.error("Polling error:", error);
            }
        }, 1000);
    }
    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
}
