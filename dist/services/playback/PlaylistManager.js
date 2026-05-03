/**
 * Менеджер плейлиста
 */
export class PlaylistManager {
    constructor() {
        this.tracks = [];
        this.currentIndex = -1;
        this.repeatMode = "none";
        this.shuffleMode = false;
        this.originalOrder = [];
    }
    getTracks() {
        return [...this.tracks];
    }
    getCurrentTrack() {
        if (this.currentIndex < 0 || this.currentIndex >= this.tracks.length) {
            return null;
        }
        return this.tracks[this.currentIndex];
    }
    getCurrentIndex() {
        return this.currentIndex;
    }
    getSize() {
        return this.tracks.length;
    }
    isEmpty() {
        return this.tracks.length === 0;
    }
    addTrack(track) {
        this.tracks.push(track);
        this.originalOrder.push(track);
        if (this.currentIndex === -1 && this.tracks.length === 1) {
            this.currentIndex = 0;
        }
    }
    addTracks(tracks) {
        for (const track of tracks) {
            this.addTrack(track);
        }
    }
    addAlbum(album) {
        this.addTracks(album.getTracks());
    }
    removeTrack(index) {
        if (index < 0 || index >= this.tracks.length) {
            return false;
        }
        this.tracks.splice(index, 1);
        this.originalOrder.splice(index, 1);
        if (this.currentIndex >= index) {
            this.currentIndex--;
        }
        if (this.currentIndex < 0 && this.tracks.length > 0) {
            this.currentIndex = 0;
        }
        return true;
    }
    clear() {
        this.tracks = [];
        this.currentIndex = -1;
        this.originalOrder = [];
    }
    setPlaylist(tracks) {
        this.tracks = [...tracks];
        this.originalOrder = [...tracks];
        this.currentIndex = this.tracks.length > 0 ? 0 : -1;
        this.applyShuffle();
    }
    next() {
        if (this.isEmpty()) {
            return null;
        }
        let nextIndex = this.currentIndex + 1;
        if (nextIndex >= this.tracks.length) {
            if (this.repeatMode === "all") {
                nextIndex = 0;
            }
            else {
                return null;
            }
        }
        this.currentIndex = nextIndex;
        return this.getCurrentTrack();
    }
    previous() {
        if (this.isEmpty()) {
            return null;
        }
        let prevIndex = this.currentIndex - 1;
        if (prevIndex < 0) {
            if (this.repeatMode === "all") {
                prevIndex = this.tracks.length - 1;
            }
            else {
                return null;
            }
        }
        this.currentIndex = prevIndex;
        return this.getCurrentTrack();
    }
    playIndex(index) {
        if (index < 0 || index >= this.tracks.length) {
            return null;
        }
        this.currentIndex = index;
        return this.getCurrentTrack();
    }
    setRepeatMode(mode) {
        this.repeatMode = mode;
    }
    getRepeatMode() {
        return this.repeatMode;
    }
    setShuffleMode(enabled) {
        this.shuffleMode = enabled;
        this.applyShuffle();
    }
    isShuffleMode() {
        return this.shuffleMode;
    }
    applyShuffle() {
        if (!this.shuffleMode) {
            this.tracks = [...this.originalOrder];
            return;
        }
        const currentTrack = this.getCurrentTrack();
        const shuffled = [...this.originalOrder];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        this.tracks = shuffled;
        if (currentTrack) {
            const newIndex = this.tracks.findIndex((t) => t.equals(currentTrack));
            this.currentIndex = newIndex !== -1 ? newIndex : 0;
        }
    }
}
