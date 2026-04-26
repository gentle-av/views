const MediaCenter = {
  async init() {
    console.log("MediaCenter v2.0 initializing...");
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
    this.videoLibrary = null;
    this.albumLibrary = null;
    this.albumModal = null;
    if (typeof BottomPlayerPanel !== "undefined") {
      this.bottomPanel = new BottomPlayerPanel(this.playback, this.events);
    } else {
      this.bottomPanel = null;
    }
    this.playlistPopup = null;
    this.videoPlayer = null;
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
    console.log("Video page loaded, initializing VideoLibrary...");
    this._updateUIForPage("video");
    if (this.videoPlayer) {
      this.videoPlayer.hide();
      this.videoPlayer = null;
    }
    this.videoPlayer = new VideoPlayerController(this.api, this.events);
    if (this.videoLibrary) {
      this.videoLibrary.destroy();
      this.videoLibrary = null;
    }
    this.videoLibrary = new VideoLibrary(
      this.api,
      this.events,
      NavigationManager,
    );
    this.events.on("video:refresh", () => this.videoLibrary.refresh());
    this.events.on("playTrack", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    this.events.on("track:play", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    this.events.on("track:addAfterCurrent", ({ album, trackIndex }) => {
      this.playback.addTrackAfterCurrent(album, trackIndex);
    });
    this.events.on("track:editMetadata", ({ album, track, trackIndex }) => {
      if (window.TagEditor) {
        window.TagEditor.showTrackTagEditor(track, album);
      } else {
      }
    });
  },

  _onAudioPageLoaded() {
    console.log("Audio page loaded, initializing AlbumLibrary...");
    this._updateUIForPage("audio");
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
        if (this.bottomPanel) this.bottomPanel.forceUpdate();
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
    this.events.on("album:play", (album) => this.playback.playAlbum(album));
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
    if (this.bottomPanel && this.bottomPanel.element) {
      this.bottomPanel.element.style.display = "flex";
      this.bottomPanel.forceUpdate();
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => MediaCenter.init());
} else {
  MediaCenter.init();
}
