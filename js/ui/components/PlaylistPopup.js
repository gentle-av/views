import { TrackMetadataHelper } from "../../services/TrackMetadataHelper.js";
import { PlaylistPopupUI } from "./PlaylistPopupUI.js";
import { PlaylistRenderer } from "./PlaylistRenderer.js";

export class PlaylistPopup {
  constructor(universalPlayer, events, albumLibrary) {
    this.universalPlayer = universalPlayer;
    this.events = events;
    this.musicApi = window.musicApi || null;
    this.metadataHelper = new TrackMetadataHelper(albumLibrary, this.musicApi);
    this.ui = new PlaylistPopupUI(
      "headerPlaylistBtn",
      "playlistPopup",
      "playlistPopupClose",
    );
    this.renderer = null;
    this._init();
  }

  async _init() {
    const onTrackClick = async (index) => {
      if (!this.universalPlayer) return;
      try {
        await this.universalPlayer.audioPlayIndex(index);
        const state = await this.universalPlayer.getAudioPlaybackState();
        if (state?.success && state.currentTrack) {
          this.universalPlayer.core.setCurrentFile(state.currentTrack);
          this.universalPlayer.core.setMediaType("audio");
          this.universalPlayer.core.setPlaying(true);
          this.universalPlayer.uiUpdater.updateFileInfo(state.currentTrack);
          this.universalPlayer.uiUpdater.updatePlayPauseButton(true);
          this.universalPlayer.show();
          this.events.emit("playback:audioStart", state.currentTrack);
        }
        this.ui.hide();
      } catch (error) {}
    };
    this.renderer = new PlaylistRenderer(
      "playlistContainer",
      onTrackClick,
      async (index) => {
        if (!this.universalPlayer) return;
        await this.universalPlayer.playerApi.post("/api/removeFromPlaylist", {
          index,
        });
        this.metadataHelper.clearCache();
        await this.refresh();
        this.events.emit("playlistChanged");
      },
    );
    this.ui.onOpen = () => this.refresh();
    this.ui.onClose = () => this.events.emit("playlistHidden");
    this._attachClearButton();
    this._attachEvents();
    await this.refresh();
    setInterval(() => this.refresh(), 5000);
  }

  _attachClearButton() {
    document.addEventListener("click", async (e) => {
      const clearBtn = e.target.closest("#playlistClearBtn");
      if (!clearBtn) return;
      if (!this.universalPlayer) return;
      try {
        const apiClient = this.universalPlayer.apiClient;
        if (!apiClient) {
          return;
        }
        await apiClient.post("/api/audio/clear");
        await apiClient.post("/api/audio/stop");
        this.metadataHelper.clearCache();
        await this.refresh();
        this.events.emit("playlistCleared");
        this.ui.hide();
        this.universalPlayer.core.reset();
        this.universalPlayer.uiUpdater.reset();
        this.universalPlayer.hide();
        if (this.universalPlayer.polling) {
          this.universalPlayer.polling.stop();
          setTimeout(() => {
            if (
              this.universalPlayer.polling &&
              !this.universalPlayer.core.hasActiveFile()
            ) {
              this.universalPlayer.polling.start();
            }
          }, 500);
        }
      } catch (error) {}
    });
  }

  _attachEvents() {
    this.events.on("playlistChanged", () => this.refresh());
    this.events.on("playlistCleared", () => this.refresh());
  }

  async refresh() {
    if (!this.universalPlayer) {
      return;
    }
    try {
      const playlistData = await this.universalPlayer.apiClient.get(
        "/api/audio/getPlaylist",
      );
      const state = await this.universalPlayer.getAudioPlaybackState();
      const currentPath = state?.currentTrack;
      const currentIndex = state?.currentIndex ?? -1;
      let tracks = playlistData?.data || [];
      if (!Array.isArray(tracks)) tracks = [];
      const tracksWithMetadata = await Promise.all(
        tracks.map(async (track, idx) => {
          const path = typeof track === "string" ? track : track.path;
          const metadata = await this.metadataHelper.fetchMetadata(path);
          return { path, ...metadata, index: idx };
        }),
      );
      this.renderer.render(tracksWithMetadata, currentPath, currentIndex);
      this._updateCount(tracksWithMetadata.length);
      setTimeout(() => this.renderer.scrollToCurrentTrack(), 100);
    } catch (error) {}
  }

  _updateCount(count) {
    const countElement = document.getElementById("playlistTrackCount");
    if (countElement) {
      countElement.textContent = `${count} ${this._getTracksWord(count)}`;
    }
  }

  _getTracksWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) return "трек";
    if (
      count % 10 >= 2 &&
      count % 10 <= 4 &&
      (count % 100 < 10 || count % 100 >= 20)
    )
      return "трека";
    return "треков";
  }
}
