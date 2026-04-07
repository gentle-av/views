import { AlbumDataManager } from "./album-data-manager.js";
import { AlbumUIRenderer } from "./album-ui-renderer.js";
import { AlbumSearchEngine } from "./album-search-engine.js";
import { AlbumAPIHandler } from "./album-api-handler.js";

export const AlbumLibrary = {
  albums: [],
  filteredAlbums: [],
  artists: [],
  currentArtist: null,
  loading: false,
  loadedArtists: 0,
  totalArtists: 0,
  searchMode: "albums",
  allTracks: [],
  initialized: false,
  loadingTaskId: null,
  isInitialLoad: true,

  dataManager: null,
  uiRenderer: null,
  searchEngine: null,
  apiHandler: null,

  getServerUrl() {
    return `http://${window.location.hostname}:${window.location.port}`;
  },

  reset() {
    console.log("[RESET] Сброс состояния");
    if (this.loadingTaskId) {
      cancelIdleCallback(this.loadingTaskId);
      this.loadingTaskId = null;
    }
    this.albums = [];
    this.filteredAlbums = [];
    this.artists = [];
    this.allTracks = [];
    this.loadedArtists = 0;
    this.totalArtists = 0;
    this.currentArtist = null;
  },

  async init() {
    console.log("[AlbumLibrary] init called, initialized:", this.initialized);
    if (this.initialized) {
      console.log("[AlbumLibrary] Already initialized, reloading albums");
      await this.reloadAlbums();
      return;
    }
    this.initialized = true;
    this.dataManager = new AlbumDataManager(this);
    this.uiRenderer = new AlbumUIRenderer(this);
    this.searchEngine = new AlbumSearchEngine(this);
    this.apiHandler = new AlbumAPIHandler(this);
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    grid.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка артистов...</div>';
    this.loadArtistsInBackground();
    this.setupEventListeners();
  },

  async reloadAlbums() {
    console.log("[AlbumLibrary] reloadAlbums called");
    this.reset();
    const grid = document.getElementById("albumsGrid");
    if (grid) {
      grid.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка артистов...</div>';
    }
    await this.loadArtistsInBackground();
  },
  async loadArtistsInBackground() {
    try {
      const response = await fetch(`${this.getServerUrl()}/api/music/artists`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status === "success" && data.artists) {
        this.artists = data.artists;
        this.totalArtists = this.artists.length;
        await this.loadAlbumsSequentially();
      } else {
        const grid = document.getElementById("albumsGrid");
        if (grid)
          grid.innerHTML =
            '<div class="empty"><i class="fas fa-folder-open"></i> Не удалось загрузить артистов</div>';
      }
    } catch (error) {
      console.error("Error loading artists:", error);
      const grid = document.getElementById("albumsGrid");
      if (grid)
        grid.innerHTML =
          '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки артистов</div>';
    }
  },

  async loadAlbumsSequentially() {
    console.log(
      "[LOAD_ALBUMS] Начало загрузки альбомов, totalArtists:",
      this.totalArtists,
    );
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;

    this.albums = [];
    const uniqueAlbums = new Map();
    grid.innerHTML = this.uiRenderer.getLoadingTemplate(this.totalArtists);

    const progressSpan = document.getElementById("albumProgress");
    const foundSpan = document.getElementById("albumsFound");
    const progressFill = document.getElementById("loadingProgressFill");

    if (this.loadingTaskId) {
      cancelIdleCallback(this.loadingTaskId);
      this.loadingTaskId = null;
    }

    let currentIndex = 0;
    const loadNextBatch = async (deadline) => {
      const grid = document.getElementById("albumsGrid");
      if (!grid || !this.initialized) return;

      let batchSize = 0;
      while (
        (deadline.timeRemaining() > 0 || batchSize < 2) &&
        currentIndex < this.artists.length
      ) {
        const artist = this.artists[currentIndex];
        await this.dataManager.loadArtistAlbums(
          artist,
          uniqueAlbums,
          foundSpan,
        );
        currentIndex++;
        batchSize++;

        if (progressSpan) progressSpan.textContent = currentIndex;
        if (progressFill && this.totalArtists > 0) {
          progressFill.style.width =
            (currentIndex / this.totalArtists) * 100 + "%";
        }
        if (batchSize % 2 === 0) await this.delay(10);
      }

      if (currentIndex < this.artists.length) {
        this.loadingTaskId = requestIdleCallback(loadNextBatch, {
          timeout: 100,
        });
      } else {
        this.finalizeLoading();
        this.loadingTaskId = null;
      }
    };

    this.loadingTaskId = requestIdleCallback(loadNextBatch, { timeout: 100 });
  },

  finalizeLoading() {
    this.albums.sort((a, b) => {
      if (a.artist !== b.artist) return a.artist.localeCompare(b.artist);
      if (a.year !== b.year) return a.year.localeCompare(b.year);
      return a.title.localeCompare(b.title);
    });
    this.filteredAlbums = [...this.albums];
    this.uiRenderer.renderAlbums();
    this.isInitialLoad = true;
  },

  setupEventListeners() {
    const searchInput = document.getElementById("albumSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) =>
        this.performSearch(e.target.value),
      );
    }

    const refreshBtn = document.querySelector(".refresh-btn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => this.refreshDatabase());
    }

    const playlistToggleBtn = document.getElementById("playlistToggleBtn");
    if (playlistToggleBtn) {
      playlistToggleBtn.addEventListener("click", () =>
        this.openPlaylistSidebar(),
      );
    }

    const playlistSidebarClose = document.getElementById(
      "playlistSidebarClose",
    );
    if (playlistSidebarClose) {
      playlistSidebarClose.addEventListener("click", () =>
        this.closePlaylistSidebar(),
      );
    }

    this.searchEngine.updateSearchModeIndicator();
  },

  openPlaylistSidebar() {
    const modal = document.getElementById("albumModal");
    if (modal && modal.classList.contains("active")) {
      modal.classList.remove("active");
    }
    const sidebar = document.getElementById("playlistSidebar");
    if (sidebar) {
      sidebar.classList.add("open");
      if (typeof PlaylistViewer !== "undefined") PlaylistViewer.init();
    }
  },

  closePlaylistSidebar() {
    const sidebar = document.getElementById("playlistSidebar");
    if (sidebar) sidebar.classList.remove("open");
  },

  showPlaylistSection() {
    console.log("showPlaylistSection called");
    const modal = document.getElementById("albumModal");
    if (modal && modal.classList.contains("active"))
      modal.classList.remove("active");

    const playlistSection = document.getElementById("playlistSection");
    if (playlistSection) {
      playlistSection.style.display = "block";
      const playlistToggleBtn = document.getElementById("playlistToggleBtn");
      if (playlistToggleBtn) playlistToggleBtn.classList.add("active");

      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.init();
        setTimeout(() => PlaylistViewer.refresh(), 100);
      }

      setTimeout(() => {
        playlistSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      }, 200);
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          playlistSection.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 200);
      }
    }
  },

  async performSearch(searchTerm) {
    await this.searchEngine.performSearch(searchTerm);
  },

  async refreshDatabase() {
    await this.apiHandler.refreshDatabase();
  },

  showAlbumModal(album) {
    this.uiRenderer.showAlbumModal(album);
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
