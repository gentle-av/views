import { AlbumLibrary } from "../modules/albums/AlbumLibrary.js";
import { AlbumModal } from "../modules/albums/AlbumModal.js";
import { TrackList } from "../modules/albums/TrackList.js";
import { PlaylistPopup } from "../ui/components/PlaylistPopup.js";
import { SearchPopup } from "../modules/albums/SearchPopup.js";

export class AudioPageManager {
  constructor(core, playbackManager) {
    this.core = core;
    this.playbackManager = playbackManager;
    this.albumLibrary = null;
    this.albumModal = null;
    this.playlistPopup = null;
    this.searchPopup = null;
    this._isInitialized = false;
    this._boundHandlers = new Map();
    this._htmlLoaded = false;
    this._isPopupActive = false;
    this._lastClickTime = 0;
  }

  async onPageLoaded() {
    if (this._isInitialized) {
      this._showPageContainer();
      this._updateUI();
      return;
    }
    await this._fullInit();
  }

  async _fullInit() {
    await this._showPageContainer();
    this._updateUI();
    await this._initAlbumModal();
    await this._initAlbumLibrary();
    this._initPlaylistPopup();
    this._setupSearchButton();
    this._setupAlbumEvents();
    this._cacheTrackNames();
    this._isInitialized = true;
  }

  async _showPageContainer() {
    const audioContainer = document.getElementById("audioPageContainer");
    if (!audioContainer) return;
    audioContainer.style.display = "block";
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
    if (this.albumModal) return;
    const modalElement = document.getElementById("albumModal");
    if (!modalElement) return;
    const universalPlayer = this.playbackManager?.universalPlayer;
    this.albumModal = new AlbumModal(
      this.core.events,
      this.core.musicApi,
      universalPlayer,
    );
    const trackList = new TrackList(this.core.events);
    this.albumModal.setTrackList(trackList);
    this.core.albumModal = this.albumModal;
  }

  async _initAlbumLibrary() {
    if (this.albumLibrary) return;
    const container = document.getElementById("albumsGrid");
    if (!container) return;
    this.albumLibrary = new AlbumLibrary(this.core.musicApi, this.core.events);
    await this.albumLibrary.init();
    this.core.albumLibrary = this.albumLibrary;
  }

  _initPlaylistPopup() {
    if (this.playlistPopup) return;
    const universalPlayer = this.playbackManager?.universalPlayer;
    if (!universalPlayer) {
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

  _setupSearchButton() {
    const refreshBtn = document.getElementById("headerRefreshBtn");
    if (refreshBtn) {
      refreshBtn.style.display = "none";
      refreshBtn.onclick = null;
    }
    const searchButton = document.getElementById("searchButton");
    if (searchButton && this.albumLibrary) {
      if (this._searchClickListener) {
        searchButton.removeEventListener("click", this._searchClickListener);
      }
      this._searchClickListener = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const now = Date.now();
        if (now - this._lastClickTime < 500) {
          console.log("[AudioPageManager] click ignored, too fast");
          return;
        }
        if (this._isPopupActive) {
          console.log("[AudioPageManager] popup is active, ignoring click");
          return;
        }
        this._lastClickTime = now;
        this._showSearchPopup();
      };
      searchButton.addEventListener("click", this._searchClickListener);
    }
  }

  _showSearchPopup() {
    if (this._isPopupActive) {
      console.log("[AudioPageManager] popup already active");
      return;
    }
    this._isPopupActive = true;
    this.searchPopup = new SearchPopup(
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
      () => {
        return this.albumLibrary && this.albumLibrary.search
          ? this.albumLibrary.search.getCurrentTerm()
          : "";
      },
    );
    this.searchPopup.setOnClose(() => {
      setTimeout(() => {
        this._isPopupActive = false;
        this.searchPopup = null;
      }, 200);
    });
    this.searchPopup.show();
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
    const universalPlayer = this.playbackManager?.universalPlayer;
    if (universalPlayer && universalPlayer.apiClient) {
      universalPlayer.apiClient.post("/api/audio/setPlaylist", {
        tracks: trackPaths,
      });
      universalPlayer.apiClient.post("/api/audio/play");
      this.core.events.emit("playback:audioStart", trackPaths[0]);
    } else if (this.core.musicApi?.playTracks) {
      this.core.musicApi
        .playTracks(trackPaths)
        .catch((err) => console.error("[DEBUG] playTracks error:", err));
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

  hide() {
    const audioContainer = document.getElementById("audioPageContainer");
    if (audioContainer) {
      audioContainer.style.display = "none";
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
    if (this.searchPopup) {
      this.searchPopup.hide();
      this.searchPopup = null;
    }
    if (this.albumLibrary) {
      this.albumLibrary.destroy();
      this.albumLibrary = null;
    }
    if (this.albumModal) {
      this.albumModal.hide();
      this.albumModal = null;
    }
    this._isInitialized = false;
    this._isPopupActive = false;
  }
}
