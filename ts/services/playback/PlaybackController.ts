import { Track } from "../../models/entities/Track.js";
import { Album } from "../../models/entities/Album.js";
import { ApiClient } from "../../api/base/ApiClient.js";
import { PlaylistManager } from "./PlaylistManager.js";
import { PlaybackStateManager } from "./PlaybackStateManager.js";
import { TrackNavigator } from "./TrackNavigator.js";
import { VolumeController } from "./VolumeController.js";

export class PlaybackController {
  private pollInterval: number | null = null;

  constructor(
    private apiClient: ApiClient,
    private playlistManager: PlaylistManager,
    private stateManager: PlaybackStateManager,
    private trackNavigator: TrackNavigator,
    private volumeController: VolumeController,
  ) {}

  async init(): Promise<void> {
    await this.volumeController.init();
    this.startPolling();
  }

  async play(): Promise<void> {
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

  async pause(): Promise<void> {
    this.stateManager.setPlaying(false);
    await this.apiClient.post("/api/audio/pause");
  }

  async togglePlayPause(): Promise<void> {
    if (this.stateManager.isPlaying()) {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async stop(): Promise<void> {
    this.stateManager.setPlaying(false);
    this.stateManager.setCurrentTime(0);
    await this.apiClient.post("/api/audio/stop");
  }

  async next(): Promise<Track | null> {
    const nextTrack = this.trackNavigator.playNext();
    if (nextTrack) {
      await this.play();
    }
    return nextTrack;
  }

  async previous(): Promise<Track | null> {
    const prevTrack = this.trackNavigator.playPrevious();
    if (prevTrack) {
      await this.play();
    }
    return prevTrack;
  }

  async playTrack(track: Track, index: number): Promise<void> {
    this.playlistManager.playIndex(index);
    this.stateManager.setCurrentTrack(track, index);
    this.stateManager.setPlaying(true);
    await this.apiClient.post("/api/audio/play");
  }

  async playAlbum(album: Album): Promise<void> {
    const tracks = album.getTracks();
    this.playlistManager.setPlaylist(tracks);
    this.stateManager.setTotalTracks(tracks.length);
    await this.playFirst();
  }

  async playFirst(): Promise<void> {
    const track = this.trackNavigator.playFirst();
    if (track) {
      await this.play();
    }
  }

  async seek(position: number): Promise<void> {
    this.stateManager.setCurrentTime(position);
    await this.apiClient.post("/api/audio/seek", { position });
  }

  async setVolume(volume: number): Promise<void> {
    const volumeObj = this.volumeController.getVolume();
    const newVolume = volumeObj.increase(volume - volumeObj.getValue());
    await this.volumeController.setVolume(newVolume);
    this.stateManager.setVolume(newVolume.getValue());
  }

  async toggleMute(): Promise<void> {
    await this.volumeController.toggleMute();
    this.stateManager.setMuted(this.volumeController.isMutedState());
  }

  setRepeatMode(mode: "none" | "one" | "all"): void {
    this.playlistManager.setRepeatMode(mode);
    this.stateManager.setRepeatMode(mode);
  }

  toggleShuffle(): void {
    const newShuffle = !this.stateManager.isShuffle();
    this.playlistManager.setShuffleMode(newShuffle);
    this.stateManager.setShuffle(newShuffle);
  }

  async clearPlaylist(): Promise<void> {
    this.playlistManager.clear();
    this.stateManager.reset();
    await this.apiClient.post("/api/audio/clear");
  }

  getPlaylist(): Track[] {
    return this.playlistManager.getTracks();
  }

  getCurrentTrack(): Track | null {
    return this.stateManager.getCurrentTrack();
  }

  isPlaying(): boolean {
    return this.stateManager.isPlaying();
  }

  getProgress(): { current: number; duration: number; percent: number } {
    const current = this.stateManager.getCurrentTime();
    const duration = this.stateManager.getDuration();
    const percent = duration > 0 ? (current / duration) * 100 : 0;
    return { current, duration, percent };
  }

  private startPolling(): void {
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
          this.stateManager.updateProgress(
            timeInfo.data.currentTime || 0,
            timeInfo.data.duration || 0,
          );
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 1000);
  }

  destroy(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
