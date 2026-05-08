import { AlbumLibrary } from "../../ui/album-library/AlbumLibrary.js";
import { AlbumModal } from "../../ui/album-modal.js";
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
  }

  async onPageLoaded() {
    this._showPageContainer();
    this._updateUI();
    await this.playbackManager.checkExistingPlaybacks("audio");
    this._initAlbumModal();
    await this._initAlbumLibrary();
    this._initPlaylistPopup();
    this._setupSearchUI();
    this._setupAlbumEvents();
    this._cacheTrackNames();
    setTimeout(() => this._checkExistingPlayback(), 500);
    this._isInitialized = true;
  }

  _showPageContainer() {
    const videoContainer = document.getElementById("videoPageContainer");
    const pageContainer = document.getElementById("pageContainer");
    if (videoContainer) videoContainer.style.display = "none";
    if (pageContainer) {
      pageContainer.style.display = "block";
      pageContainer.innerHTML =
        '<div class="audio-library"><div class="albums-grid" id="albumsGrid"><div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка альбомов...</div></div></div>';
    }
  }

  _updateUI() {
    if (this.core._updateUIForPage) {
      this.core._updateUIForPage("audio");
    }
  }

  _initAlbumModal() {
    if (this.albumModal) {
      this.albumModal.hide();
      this.albumModal = null;
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
      this.playlistPopup = new PlaylistPopup(
        this.playbackManager.playback,
        this.core.events,
        this.albumLibrary,
      );
      this.core.playlistPopup = this.playlistPopup;
    } else if (this.playlistPopup) {
      this.playlistPopup.albumLibrary = this.albumLibrary;
      if (this.playlistPopup.tracksCache)
        this.playlistPopup.tracksCache.clear();
      if (this.playlistPopup.refresh) this.playlistPopup.refresh();
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
    this.core.events.on("album:play", (album) => {
      if (album.tracks && album.tracks.length > 0) {
        const trackPaths = album.tracks.map((track) => track.path);
        if (this.core.musicApi && this.core.musicApi.playTracks) {
          this.core.musicApi
            .playTracks(trackPaths)
            .then(() => {
              setTimeout(() => {
                if (this.playbackManager.universalPlayer) {
                  this.playbackManager.universalPlayer.startPlaybackExternal();
                }
              }, 500);
            })
            .catch((err) => console.error("[DEBUG] playTracks error:", err));
        } else {
          this.playbackManager.universalPlayer.startPlayback(
            album.tracks[0].path,
            "audio",
          );
        }
      }
    });
    this.core.events.on("album:addToPlaylist", async (album) => {
      await this.playbackManager.addAlbumToPlaylist(album);
    });
    this.core.events.on("album:open", async (album) => {
      if (this.albumModal) {
        await this.albumModal.show(album);
      }
    });
    this.core.events.on("album:playMusium", async (album) => {
      const tracks = album.tracks || [];
      if (tracks.length === 0 && this.core.musicApi) {
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
      if (this.core.musicApi && this.core.musicApi.openMusium) {
        await this.core.musicApi.openMusium(trackPaths);
      }
    });
    this.core.events.on("album:replacePlaylist", async (album) => {
      await this.playbackManager.clearPlaylist();
      await this.playbackManager.addAlbumToPlaylist(album);
      this.core.events.emit("playlistCleared");
      this.core.events.emit("playlistChanged");
    });
    this.core.events.on("album:playTrack", ({ album, trackIndex }) => {
      this.playbackManager.playTrack(album, trackIndex);
    });
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
