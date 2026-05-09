import { UniversalPlayer } from "../../ui/universal-player/UniversalPlayer.js";
import { PlayerAPI } from "../../ui/universal-player/PlayerApi.js";

export class PlaybackManager {
  constructor(core) {
    this.core = core;
    this.playback = null;
    this.universalPlayer = null;
    this._isInitialized = false;
  }

  async init() {
    const playerAPI = new PlayerAPI(
      this.core.api,
      this.core.musicApi,
      this.core.playerApi,
    );
    this.universalPlayer = new UniversalPlayer(
      playerAPI,
      this.core.events,
      this.core.musicApi,
      this.core.playerApi,
      this.core.api,
    );
    window.universalPlayerInstance = this.universalPlayer;
    this.core.universalPlayer = this.universalPlayer;
    this._isInitialized = true;
    return this;
  }

  async checkExistingPlaybacks(type = null) {
    if (!this.universalPlayer?.checkExistingPlayback) return;
    if (!type || type === "audio") {
      await this.universalPlayer.checkExistingPlayback("audio");
      await this.restorePlaylist();
    }
    if (!type || type === "video") {
      await this.universalPlayer.checkExistingPlayback("video");
    }
  }

  async restorePlaylist() {
    try {
      const playlistData = await this.core.playerApi.getPlaylist();
      const state = await this.core.playerApi.getPlaybackState();
      if (playlistData?.data?.length > 0) {
        const tracks = playlistData.data;
        const currentIndex = state?.data?.currentIndex ?? 0;
        if (this.playback?.playlistManager) {
          this.playback.playlistManager.setTrackList(tracks);
          this.playback.playlistManager.setCurrentIndex(currentIndex);
        }
        if (this.universalPlayer?.uiUpdater && tracks[currentIndex]) {
          const currentTrack = tracks[currentIndex];
          const path =
            typeof currentTrack === "string" ? currentTrack : currentTrack.path;
          this.universalPlayer.core.setCurrentFile(path);
          this.universalPlayer.core.setMediaType("audio");
          this.universalPlayer.uiUpdater.updateFileInfo(path);
          this.universalPlayer.uiUpdater.updateTrackCount(
            currentIndex,
            tracks.length,
          );
          const metadata = await this.universalPlayer.getFileMetadata(path);
          if (metadata?.data) {
            let title =
              metadata.data.file?.title || metadata.data.database?.title;
            let artist =
              metadata.data.file?.artist || metadata.data.database?.artist;
            if (title) {
              this.universalPlayer.uiUpdater.updateTrackFullInfo(
                title,
                artist,
                null,
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("[PlaybackManager] restorePlaylist error:", error);
    }
  }

  setupVideoEvents() {
    this.core.events.on("player:clearState", () => {
      if (this.universalPlayer) {
        this.universalPlayer.clearState();
      }
    });
  }

  syncWithPlayback() {
    if (this.universalPlayer?.syncWithPlayback) {
      this.universalPlayer.syncWithPlayback();
    }
  }

  async addAlbumToPlaylist(album) {
    if (this.playback?.addAlbumToPlaylist) {
      await this.playback.addAlbumToPlaylist(album);
    }
  }

  playTrack(album, trackIndex) {
    if (this.playback?.playTrack) {
      this.playback.playTrack(album, trackIndex);
    }
  }

  async clearPlaylist() {
    if (this.playback?.api?.clearPlaylist) {
      await this.playback.api.clearPlaylist();
    }
  }

  destroy() {
    if (this.universalPlayer?.destroy) {
      this.universalPlayer.destroy();
    }
    this._isInitialized = false;
  }
}
