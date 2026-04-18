const MediaCenter = {
  api: null,
  musicApi: null,
  playerApi: null,
  events: null,
  playback: null,
  library: null,
  bottomPanel: null,
  playlistPopup: null,

  async init() {
    this.api = new ApiClient();
    this.musicApi = new MusicApiClient();
    this.playerApi = new PlayerApiClient();
    this.events = new EventBus();

    await this.playerApi.checkAvailability();

    this.playback = new PlaybackController(this.playerApi, this.events);
    await this.playback.init();

    this.library = new AlbumLibrary(this.musicApi, this.events);
    await this.library.init();

    this.bottomPanel = new BottomPlayerPanel(this.playback, this.events);
    this.playlistPopup = new PlaylistPopup(this.playback, this.events);

    this._setupGlobalSearch();
    console.log("MediaCenter initialized");
  },

  _setupGlobalSearch() {
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        if (NavigationManager?.getCurrentPage() === "audio") {
          this.library.search(e.target.value);
        }
      });
    }
  },
};

document.addEventListener("DOMContentLoaded", () => MediaCenter.init());
