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
    this.bottomPanel = new BottomPlayerPanel(this.playback, this.events);
    this.playlistPopup = new PlaylistPopup(this.playback, this.events);
    this.videoPlayer = null;
    await NavigationManager.switchTo("video");
    console.log("MediaCenter v2.0 ready");
  },

  _onVideoPageLoaded() {
    if (this._videoPageInitialized) {
      console.log("Video page already initialized, skipping");
      return;
    }
    this._videoPageInitialized = true;
    console.log("Video page loaded, initializing VideoLibrary...");
    if (!this.videoPlayer) {
      console.log("Creating new VideoPlayerController");
      this.videoPlayer = new VideoPlayerController(this.api, this.events);
    }
    if (!this.videoLibrary) {
      console.log("Creating new VideoLibrary");
      this.videoLibrary = new VideoLibrary(
        this.api,
        this.events,
        NavigationManager,
      );
    }
    this.events.on("video:refresh", () => this.videoLibrary.refresh());
    this.events.on("playTrack", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
  },

  _onAudioPageLoaded() {
    if (this._audioPageInitialized) return;
    this._audioPageInitialized = true;
    console.log("Audio page loaded, initializing AlbumLibrary...");
    if (!this.albumModal) {
      this.albumModal = new AlbumModal(this.events);
    }
    if (!this.albumLibrary) {
      this.albumLibrary = new AlbumLibrary(this.musicApi, this.events);
      this.albumLibrary.init();
    }
    this.events.on("album:play", (album) => this.playback.playAlbum(album));
    this.events.on("album:addToPlaylist", async (album) => {
      await this.playback.addAlbumToPlaylist(album);
      Utils.showNotification(
        `Альбом "${album.title}" добавлен в плейлист`,
        "success",
      );
    });
    this.events.on("album:replacePlaylist", async (album) => {
      await this.playback.api.clearPlaylist();
      await this.playback.addAlbumToPlaylist(album);
      this.events.emit("playlistCleared");
      this.events.emit("playlistChanged");
      Utils.showNotification(`Плейлист заменен на "${album.title}"`, "success");
    });
    this.events.on("album:playTrack", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
      searchInput.value = "";
      searchInput.oninput = (e) => {
        if (this.albumLibrary) {
          this.albumLibrary.search(e.target.value);
        }
      };
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => MediaCenter.init());
} else {
  MediaCenter.init();
}
