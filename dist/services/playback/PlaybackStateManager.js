export class PlaybackStateManager {
    constructor() {
        this.listeners = [];
        this.state = {
            isPlaying: false,
            currentTrack: null,
            currentIndex: -1,
            totalTracks: 0,
            currentTime: 0,
            duration: 0,
            volume: 50,
            isMuted: false,
            repeatMode: "none",
            isShuffle: false,
        };
    }
    getState() {
        return { ...this.state };
    }
    isPlaying() {
        return this.state.isPlaying;
    }
    getCurrentTrack() {
        return this.state.currentTrack;
    }
    getCurrentIndex() {
        return this.state.currentIndex;
    }
    getTotalTracks() {
        return this.state.totalTracks;
    }
    getCurrentTime() {
        return this.state.currentTime;
    }
    getDuration() {
        return this.state.duration;
    }
    getVolume() {
        return this.state.volume;
    }
    isMuted() {
        return this.state.isMuted;
    }
    getRepeatMode() {
        return this.state.repeatMode;
    }
    isShuffle() {
        return this.state.isShuffle;
    }
    hasActivePlayback() {
        return this.state.currentTrack !== null && this.state.totalTracks > 0;
    }
    setPlaying(playing) {
        this.state.isPlaying = playing;
        this.notifyListeners();
    }
    setCurrentTrack(track, index) {
        this.state.currentTrack = track;
        this.state.currentIndex = index;
        this.notifyListeners();
    }
    setTotalTracks(count) {
        this.state.totalTracks = count;
        this.notifyListeners();
    }
    setCurrentTime(time) {
        this.state.currentTime = time;
        this.notifyListeners();
    }
    setDuration(duration) {
        this.state.duration = duration;
        this.notifyListeners();
    }
    setVolume(volume) {
        this.state.volume = Math.min(100, Math.max(0, volume));
        this.notifyListeners();
    }
    setMuted(muted) {
        this.state.isMuted = muted;
        this.notifyListeners();
    }
    setRepeatMode(mode) {
        this.state.repeatMode = mode;
        this.notifyListeners();
    }
    setShuffle(shuffle) {
        this.state.isShuffle = shuffle;
        this.notifyListeners();
    }
    updateProgress(currentTime, duration) {
        this.state.currentTime = currentTime;
        this.state.duration = duration;
        this.notifyListeners();
    }
    reset() {
        this.state = {
            isPlaying: false,
            currentTrack: null,
            currentIndex: -1,
            totalTracks: 0,
            currentTime: 0,
            duration: 0,
            volume: 50,
            isMuted: false,
            repeatMode: "none",
            isShuffle: false,
        };
        this.notifyListeners();
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index !== -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    notifyListeners() {
        const stateCopy = this.getState();
        this.listeners.forEach((listener) => listener(stateCopy));
    }
}
