import { AlbumLibrary } from "../../ui/album-library/AlbumLibrary.js";
import { AlbumModal } from "../../ui/album-modal/AlbumModal.js";
import { TrackList } from "../../ui/track-list.js";
import { PlaylistPopup } from "../../ui/playlist-popup/PlaylistPopup.js";

export class AudioPageManager {
  constructor(core, playbackManager) {
    this.core = core;
    this.playbackManager = playbackManager;
    this.albumLibrary = null;
    this.albumModal = null;
    this.playlistPopup = null;
    this._isInitialized = false;
    this._boundHandlers = new Map();
    this._htmlLoaded = false;
  }

  async onPageLoaded() {
    await this._showPageContainer();
    this._updateUI();
    await this.playbackManager.checkExistingPlaybacks("audio");
    await this._initAlbumModal();
    await this._initAlbumLibrary();
    this._initPlaylistPopup();
    this._setupSearchUI();
    this._setupAlbumEvents();
    this._cacheTrackNames();
    setTimeout(() => this._checkExistingPlayback(), 500);
    this._isInitialized = true;
  }

  async _showPageContainer() {
    const audioContainer = document.getElementById("audioPageContainer");
    if (!audioContainer) return;
    if (!this._htmlLoaded) {
      const response = await fetch("/pages/audio.html");
      const html = await response.text();
      audioContainer.innerHTML = html;
      this._htmlLoaded = true;
    }
  }

  _updateUI() {
    if (this.core._updateUIForPage) {
      this.core._updateUIForPage("audio");
    }
  }

  async _initAlbumModal() {
    if (this.albumModal) {
      this.albumModal.hide();
      this.albumModal = null;
    }
    const modalElement = document.getElementById("albumModal");
    if (!modalElement) {
      console.error("[AudioPageManager] albumModal element not found");
      return;
    }
    this.albumModal = new AlbumModal(this.core.events, this.core.musicApi);
    const trackList = new TrackList(this.core.events);
    this.albumModal.setTrackList(trackList);
    this.core.albumModal = this.albumModal;
  }

  async _initAlbumLibrary() {
    if (this.albumLibrary) {
      this.albumLibrary.destroy();
      this.albumLibrary = null;
    }
    const container = document.getElementById("albumsGrid");
    if (!container) {
      console.error("[AudioPageManager] albumsGrid not found");
      return;
    }
    this.albumLibrary = new AlbumLibrary(this.core.musicApi, this.core.events);
    await this.albumLibrary.init();
    this.core.albumLibrary = this.albumLibrary;
  }

  _initPlaylistPopup() {
    if (typeof PlaylistPopup !== "undefined" && !this.playlistPopup) {
      const universalPlayer = this.playbackManager?.universalPlayer;
      if (!universalPlayer) {
        console.warn(
          "[AudioPageManager] universalPlayer not ready yet, will retry",
        );
        setTimeout(() => this._initPlaylistPopup(), 500);
        return;
      }
      this.playlistPopup = new PlaylistPopup(
        universalPlayer,
        this.core.events,
        this.albumLibrary,
      );
      this.core.playlistPopup = this.playlistPopup;
    }
  }

  _setupSearchUI() {
    const refreshBtn = document.getElementById("headerRefreshBtn");
    if (refreshBtn) {
      refreshBtn.style.display = "none";
      refreshBtn.onclick = null;
    }
    if (this.core._setupSearchUI) {
      this.core._setupSearchUI(
        (term) => {
          if (this.albumLibrary && this.albumLibrary.isReady) {
            this.albumLibrary.searchAlbums(term);
          }
        },
        () => {
          if (this.albumLibrary && this.albumLibrary.isReady) {
            this.albumLibrary.searchAlbums("");
          }
        },
      );
    }
  }

  _setupAlbumEvents() {
    for (const [event, handler] of this._boundHandlers) {
      this.core.events.off(event, handler);
    }
    this._boundHandlers.clear();
    this._registerEvent("album:play", this._handlePlayAlbum.bind(this));
    this._registerEvent(
      "album:addToPlaylist",
      this._handleAddToPlaylist.bind(this),
    );
    this._registerEvent("album:playMusium", this._handlePlayMusium.bind(this));
    this._registerEvent(
      "album:replacePlaylist",
      this._handleReplacePlaylist.bind(this),
    );
    this._registerEvent("album:playTrack", this._handlePlayTrack.bind(this));
  }

  _registerEvent(event, handler) {
    this.core.events.on(event, handler);
    this._boundHandlers.set(event, handler);
  }

  _handlePlayAlbum(album) {
    if (!album?.tracks?.length) return;
    const trackPaths = album.tracks.map((track) => track.path);
    if (this.core.musicApi?.playTracks) {
      this.core.musicApi
        .playTracks(trackPaths)
        .then(() => {
          setTimeout(() => {
            if (this.playbackManager.universalPlayer?.startPlaybackExternal) {
              this.playbackManager.universalPlayer.startPlaybackExternal();
            }
          }, 500);
        })
        .catch((err) => console.error("[DEBUG] playTracks error:", err));
    } else if (this.playbackManager.universalPlayer?.startPlayback) {
      this.playbackManager.universalPlayer.startPlayback(
        album.tracks[0].path,
        "audio",
      );
    }
  }

  async _handleAddToPlaylist(album) {
    await this.playbackManager.addAlbumToPlaylist(album);
  }

  async _handlePlayMusium(album) {
    const tracks = [...(album.tracks || [])];
    if (tracks.length === 0 && this.core.musicApi?.getTracks) {
      try {
        const tracksData = await this.core.musicApi.getTracks(
          album.title,
          album.artist,
          true,
        );
        tracks.push(...tracksData);
      } catch (error) {}
    }
    const trackPaths = tracks.map((track) => track.path);
    if (this.core.musicApi?.openMusium) {
      await this.core.musicApi.openMusium(trackPaths);
    }
  }

  async _handleReplacePlaylist(album) {
    await this.playbackManager.clearPlaylist();
    await this.playbackManager.addAlbumToPlaylist(album);
    this.core.events.emit("playlistCleared");
    this.core.events.emit("playlistChanged");
  }

  _handlePlayTrack({ album, trackIndex }) {
    this.playbackManager.playTrack(album, trackIndex);
  }

  _cacheTrackNames() {
    if (!this.playbackManager.playback?._trackNameCache) return;
    if (!this.albumLibrary?.albums) return;
    for (const album of this.albumLibrary.albums) {
      for (const track of album.tracks) {
        if (track.path && track.title) {
          this.playbackManager.playback._trackNameCache.set(
            track.path,
            track.title,
          );
        }
      }
    }
    if (this.playbackManager.universalPlayer) {
      this.playbackManager.universalPlayer.syncWithPlayback();
    }
  }

  async _checkExistingPlayback() {
    if (this.playbackManager.universalPlayer?.checkExistingPlayback) {
      await this.playbackManager.universalPlayer.checkExistingPlayback("audio");
    }
    if (this.playbackManager.universalPlayer?.core?.currentFile) {
      if (this.playbackManager.universalPlayer.show) {
        this.playbackManager.universalPlayer.show();
      }
    }
  }

  getAlbumLibrary() {
    return this.albumLibrary;
  }

  getAlbumModal() {
    return this.albumModal;
  }

  destroy() {
    for (const [event, handler] of this._boundHandlers) {
      this.core.events.off(event, handler);
    }
    this._boundHandlers.clear();
    if (this.albumLibrary) {
      this.albumLibrary.destroy();
      this.albumLibrary = null;
    }
    if (this.albumModal) {
      this.albumModal.hide();
      this.albumModal = null;
    }
    this._isInitialized = false;
  }
}
