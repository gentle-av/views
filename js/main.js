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
    this.videoLibrary = null; // будет создан при загрузке страницы
    this.albumLibrary = null;
    this.bottomPanel = new BottomPlayerPanel(this.playback, this.events);
    this.playlistPopup = new PlaylistPopup(this.playback, this.events);
    this.videoPlayer = new VideoPlayerController(this.api, this.events);
    await NavigationManager.switchTo("video");
    console.log("MediaCenter v2.0 ready");
  },

  _onVideoPageLoaded() {
    console.log("Video page loaded, initializing VideoLibrary...");
    this.videoLibrary = new VideoLibrary(
      this.api,
      this.events,
      NavigationManager,
    );
    this.events.on("video:refresh", () => this.videoLibrary.refresh());
  },

  _onAudioPageLoaded() {
    console.log("Audio page loaded, initializing AlbumLibrary...");
    this.albumLibrary = new AlbumLibrary(this.musicApi, this.events);
    this.albumLibrary.init();
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
