const MediaCenter = {
  async init() {
    console.log("MediaCenter v2.0 initializing...");
    this._lastPlayPath = null;
    this._lastPlayTime = 0;
    window.addEventListener("beforeunload", () => {
      if (this.videoLibrary) {
        this.videoLibrary.destroy();
      }
      if (this.universalPlayer) {
        this.universalPlayer.destroy();
      }
    });
    this.events = new EventBus();
    this.api = new ApiClient();
    this.playerApi = new PlayerApiClient();
    this.musicApi = new MusicApiClient();
    NavigationManager.init(this.events);
    this.events.on("page:videoLoaded", () => this._onVideoPageLoaded());
    this.events.on("page:audioLoaded", () => this._onAudioPageLoaded());
    await this.playerApi.checkAvailability();
    this.playback = new PlaybackController(this.playerApi, this.events);
    await this.playback.init();
    this.universalPlayer = new UniversalPlayer(
      this.api,
      this.events,
      this.musicApi,
      this.playerApi,
    );
    this.videoLibrary = null;
    this.albumLibrary = null;
    this.albumModal = null;
    this.playlistPopup = null;
    this._updateUIForPage("video");
    await NavigationManager.switchTo("video");
    window.MediaCenter = this;
    console.log("MediaCenter v2.0 ready");
  },

  _updateUIForPage(page) {
    const mainContent = document.querySelector(".main-content");
    const headerPlaylistBtn = document.getElementById("headerPlaylistBtn");
    const headerRefreshMetadataBtn = document.getElementById(
      "headerRefreshMetadataBtn",
    );
    const globalSearchBox = document.getElementById("globalSearchBox");
    if (page === "audio") {
      mainContent.classList.add("audio-page");
      mainContent.classList.remove("video-page");
      if (headerPlaylistBtn) headerPlaylistBtn.style.display = "flex";
      if (headerRefreshMetadataBtn)
        headerRefreshMetadataBtn.style.display = "flex";
      if (globalSearchBox) globalSearchBox.style.display = "flex";
    } else {
      mainContent.classList.add("video-page");
      mainContent.classList.remove("audio-page");
      if (headerPlaylistBtn) headerPlaylistBtn.style.display = "none";
      if (headerRefreshMetadataBtn)
        headerRefreshMetadataBtn.style.display = "none";
      if (globalSearchBox) globalSearchBox.style.display = "none";
    }
  },

  _onVideoPageLoaded() {
    console.log(
      "[MediaCenter] Video page loaded, initializing VideoLibrary...",
    );
    this._updateUIForPage("video");
    if (this.videoLibrary) {
      this.videoLibrary.destroy();
      this.videoLibrary = null;
    }
    this.videoLibrary = new VideoLibrary(
      this.api,
      this.events,
      NavigationManager,
    );
    this.universalPlayer.setMediaType("video");
    this.events.on("video:refresh", () => {
      if (this.videoLibrary) this.videoLibrary.refresh();
    });
    this.events.on("video:play", (path) => {
      if (
        this._lastPlayPath === path &&
        Date.now() - this._lastPlayTime < 500
      ) {
        console.log("[MediaCenter] Ignoring duplicate video:play event");
        return;
      }
      this._lastPlayPath = path;
      this._lastPlayTime = Date.now();
      this.universalPlayer.startPlayback(path, "video");
      if (this.videoLibrary && this.videoLibrary._adjustBottomPadding) {
        setTimeout(() => this.videoLibrary._adjustBottomPadding(), 50);
      }
    });
    setTimeout(async () => {
      await this.universalPlayer.checkExistingPlayback("video");
      if (this.videoLibrary && this.videoLibrary._adjustBottomPadding) {
        setTimeout(() => this.videoLibrary._adjustBottomPadding(), 200);
      }
    }, 500);
  },

  _onAudioPageLoaded() {
    console.log("Audio page loaded, initializing AlbumLibrary...");
    this._updateUIForPage("audio");
    this.universalPlayer.setMediaType("audio");
    if (typeof AlbumModal !== "undefined") {
      if (this.albumModal) {
        this.albumModal.hide();
        this.albumModal = null;
      }
      this.albumModal = new AlbumModal(this.events, this.musicApi);
      const trackList = new TrackList(this.events);
      this.albumModal.setTrackList(trackList);
    }
    if (typeof AlbumLibrary !== "undefined") {
      if (this.albumLibrary) {
        this.albumLibrary.destroy();
        this.albumLibrary = null;
      }
      this.albumLibrary = new AlbumLibrary(this.musicApi, this.events);
      this.albumLibrary.init().then(() => {
        if (this.playback && this.albumLibrary.albums) {
          for (const album of this.albumLibrary.albums) {
            for (const track of album.tracks) {
              if (track.path && track.title) {
                this.playback._trackNameCache.set(track.path, track.title);
              }
            }
          }
        }
      });
    }
    if (typeof PlaylistPopup !== "undefined" && !this.playlistPopup) {
      this.playlistPopup = new PlaylistPopup(
        this.playback,
        this.events,
        this.albumLibrary,
      );
    } else if (this.playlistPopup) {
      this.playlistPopup.albumLibrary = this.albumLibrary;
      this.playlistPopup.tracksCache.clear();
      this.playlistPopup.refresh();
    }
    const searchInput = document.getElementById("globalSearchInput");
    const searchClearBtn = document.getElementById("searchClearBtn");
    if (searchInput) {
      searchInput.value = "";
      const updateClearButton = () => {
        if (searchClearBtn) {
          searchClearBtn.style.display =
            searchInput.value.length > 0 &&
            document.activeElement === searchInput
              ? "flex"
              : "none";
        }
      };
      searchInput.oninput = (e) => {
        if (this.albumLibrary) this.albumLibrary.search(e.target.value);
        updateClearButton();
      };
      searchInput.onfocus = updateClearButton;
      searchInput.onblur = () => {
        setTimeout(() => {
          if (searchClearBtn && document.activeElement !== searchInput) {
            searchClearBtn.style.display = "none";
          }
        }, 100);
      };
      if (searchClearBtn) {
        searchClearBtn.onclick = () => {
          searchInput.value = "";
          if (this.albumLibrary) this.albumLibrary.search("");
          updateClearButton();
          searchInput.focus();
        };
      }
    }
    this.events.on("album:play", (album) => {
      if (album.tracks && album.tracks.length > 0) {
        this.universalPlayer.startPlayback(album.tracks[0].path, "audio");
      }
      this.playback.playAlbum(album);
    });
    this.events.on("album:addToPlaylist", async (album) => {
      await this.playback.addAlbumToPlaylist(album);
    });
    this.events.on("album:replacePlaylist", async (album) => {
      await this.playback.api.clearPlaylist();
      await this.playback.addAlbumToPlaylist(album);
      this.events.emit("playlistCleared");
      this.events.emit("playlistChanged");
    });
    this.events.on("album:playTrack", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    setTimeout(async () => {
      await this.universalPlayer.checkExistingPlayback("audio");
    }, 500);
  },

  _showOverlay() {
    let overlay = document.querySelector(".overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "overlay";
      document.body.insertBefore(overlay, document.body.firstChild);
    }
    overlay.classList.add("active");
    overlay.style.display = "block";
  },

  _hideOverlay() {
    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.classList.remove("active");
      overlay.style.display = "none";
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => MediaCenter.init());
} else {
  MediaCenter.init();
}
