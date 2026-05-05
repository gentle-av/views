import { Track } from "../../models/entities/Track.js";

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: Track | null;
  currentIndex: number;
  totalTracks: number;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: "none" | "one" | "all";
  isShuffle: boolean;
}

export class PlaybackStateManager {
  private state: PlaybackState;
  private listeners: Array<(state: PlaybackState) => void>;

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

  getState(): PlaybackState {
    return { ...this.state };
  }

  isPlaying(): boolean {
    return this.state.isPlaying;
  }

  getCurrentTrack(): Track | null {
    return this.state.currentTrack;
  }

  getCurrentIndex(): number {
    return this.state.currentIndex;
  }

  getTotalTracks(): number {
    return this.state.totalTracks;
  }

  getCurrentTime(): number {
    return this.state.currentTime;
  }

  getDuration(): number {
    return this.state.duration;
  }

  getVolume(): number {
    return this.state.volume;
  }

  isMuted(): boolean {
    return this.state.isMuted;
  }

  getRepeatMode(): "none" | "one" | "all" {
    return this.state.repeatMode;
  }

  isShuffle(): boolean {
    return this.state.isShuffle;
  }

  hasActivePlayback(): boolean {
    return this.state.currentTrack !== null && this.state.totalTracks > 0;
  }

  setPlaying(playing: boolean): void {
    this.state.isPlaying = playing;
    this.notifyListeners();
  }

  setCurrentTrack(track: Track | null, index: number): void {
    this.state.currentTrack = track;
    this.state.currentIndex = index;
    this.notifyListeners();
  }

  setTotalTracks(count: number): void {
    this.state.totalTracks = count;
    this.notifyListeners();
  }

  setCurrentTime(time: number): void {
    this.state.currentTime = time;
    this.notifyListeners();
  }

  setDuration(duration: number): void {
    this.state.duration = duration;
    this.notifyListeners();
  }

  setVolume(volume: number): void {
    this.state.volume = Math.min(100, Math.max(0, volume));
    this.notifyListeners();
  }

  setMuted(muted: boolean): void {
    this.state.isMuted = muted;
    this.notifyListeners();
  }

  setRepeatMode(mode: "none" | "one" | "all"): void {
    this.state.repeatMode = mode;
    this.notifyListeners();
  }

  setShuffle(shuffle: boolean): void {
    this.state.isShuffle = shuffle;
    this.notifyListeners();
  }

  updateProgress(currentTime: number, duration: number): void {
    this.state.currentTime = currentTime;
    this.state.duration = duration;
    this.notifyListeners();
  }

  reset(): void {
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

  subscribe(listener: (state: PlaybackState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const stateCopy = this.getState();
    this.listeners.forEach((listener) => listener(stateCopy));
  }
}
