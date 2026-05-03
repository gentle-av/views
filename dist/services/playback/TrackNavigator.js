export class TrackNavigator {
    constructor(playlistManager, stateManager) {
        this.playlistManager = playlistManager;
        this.stateManager = stateManager;
    }
    playNext() {
        const nextTrack = this.playlistManager.next();
        if (nextTrack) {
            const newIndex = this.playlistManager.getCurrentIndex();
            this.stateManager.setCurrentTrack(nextTrack, newIndex);
            this.stateManager.setPlaying(true);
        }
        return nextTrack;
    }
    playPrevious() {
        const prevTrack = this.playlistManager.previous();
        if (prevTrack) {
            const newIndex = this.playlistManager.getCurrentIndex();
            this.stateManager.setCurrentTrack(prevTrack, newIndex);
            this.stateManager.setPlaying(true);
        }
        return prevTrack;
    }
    playTrackByIndex(index) {
        const track = this.playlistManager.playIndex(index);
        if (track) {
            this.stateManager.setCurrentTrack(track, index);
            this.stateManager.setPlaying(true);
        }
        return track;
    }
    playFirst() {
        if (this.playlistManager.isEmpty()) {
            return null;
        }
        return this.playTrackByIndex(0);
    }
    playLast() {
        if (this.playlistManager.isEmpty()) {
            return null;
        }
        return this.playTrackByIndex(this.playlistManager.getSize() - 1);
    }
    restartCurrent() {
        const currentTrack = this.playlistManager.getCurrentTrack();
        if (currentTrack) {
            this.stateManager.setCurrentTime(0);
            this.stateManager.setPlaying(true);
            return currentTrack;
        }
        return null;
    }
    hasNext() {
        const currentIndex = this.playlistManager.getCurrentIndex();
        const size = this.playlistManager.getSize();
        const repeatMode = this.stateManager.getRepeatMode();
        if (repeatMode === "all") {
            return size > 0;
        }
        if (repeatMode === "one") {
            return true;
        }
        return currentIndex < size - 1;
    }
    hasPrevious() {
        const currentIndex = this.playlistManager.getCurrentIndex();
        const repeatMode = this.stateManager.getRepeatMode();
        if (repeatMode === "all") {
            return true;
        }
        if (repeatMode === "one") {
            return true;
        }
        return currentIndex > 0;
    }
    getNextTrack() {
        const currentIndex = this.playlistManager.getCurrentIndex();
        const tracks = this.playlistManager.getTracks();
        const repeatMode = this.stateManager.getRepeatMode();
        if (tracks.length === 0)
            return null;
        let nextIndex = currentIndex + 1;
        if (nextIndex >= tracks.length) {
            if (repeatMode === "all") {
                nextIndex = 0;
            }
            else {
                return null;
            }
        }
        return tracks[nextIndex] || null;
    }
    getPreviousTrack() {
        const currentIndex = this.playlistManager.getCurrentIndex();
        const tracks = this.playlistManager.getTracks();
        const repeatMode = this.stateManager.getRepeatMode();
        if (tracks.length === 0)
            return null;
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) {
            if (repeatMode === "all") {
                prevIndex = tracks.length - 1;
            }
            else {
                return null;
            }
        }
        return tracks[prevIndex] || null;
    }
}
