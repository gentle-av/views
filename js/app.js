const App = {
  loadedScripts: {
    video: false,
    audio: false,
  },
  initializing: false,
  pageLoading: false,
  debug: true,

  log(...args) {
    if (this.debug) console.log("[App]", ...args);
  },

  async init() {
    this.log("init started");
    if (this.initializing) {
      this.log("Already initializing, skip");
      return;
    }
    this.initializing = true;
    const serverAvailable = await this.checkServerAvailability();
    if (!serverAvailable) {
      const pageContainer = document.getElementById("pageContainer");
      if (pageContainer) {
        pageContainer.innerHTML = `
          <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            Сервер недоступен. Убедитесь, что бэкенд запущен.
          </div>
        `;
      }
      this.initializing = false;
      return;
    }
    this.setupHeaderControls();
    this.showProfileIndicator();
    if (typeof PlayerManager !== "undefined") {
      PlayerManager.init();
    }
    if (typeof NavigationManager !== "undefined") {
      NavigationManager.init();
      NavigationManager.onPageChange((page) => {
        this.log("onPageChange received:", page);
        this.loadPage(page);
      });
      setTimeout(() => {
        NavigationManager.attachButtonHandlers();
      }, 1000);
    }
    this.setupMobileMenu();
    this.log("Calling loadPage video");
    await this.loadPage("video");
    this.initializing = false;
    this.log("init finished");
  },

  setupHeaderControls() {
    const headerPlaylistBtn = document.getElementById("headerPlaylistBtn");
    if (headerPlaylistBtn) {
      const newPlaylistBtn = headerPlaylistBtn.cloneNode(true);
      headerPlaylistBtn.parentNode.replaceChild(
        newPlaylistBtn,
        headerPlaylistBtn,
      );
      newPlaylistBtn.addEventListener("click", () => {
        if (typeof AlbumLibrary !== "undefined") {
          AlbumLibrary.openPlaylistSidebar();
        }
      });
    }
    const headerRefreshBtn = document.getElementById("headerRefreshBtn");
    if (headerRefreshBtn) {
      const newRefreshBtn = headerRefreshBtn.cloneNode(true);
      headerRefreshBtn.parentNode.replaceChild(newRefreshBtn, headerRefreshBtn);
      newRefreshBtn.addEventListener("click", () => {
        if (typeof AlbumLibrary !== "undefined") {
          AlbumLibrary.refreshDatabase();
        }
      });
    }
    const globalSearchInput = document.getElementById("globalSearchInput");
    if (globalSearchInput) {
      const newSearchInput = globalSearchInput.cloneNode(true);
      globalSearchInput.parentNode.replaceChild(
        newSearchInput,
        globalSearchInput,
      );
      newSearchInput.addEventListener("input", (e) => {
        const currentPage = NavigationManager
          ? NavigationManager.getCurrentPage()
          : null;
        if (currentPage === "audio" && typeof AlbumLibrary !== "undefined") {
          AlbumLibrary.filterAlbums(e.target.value);
        }
      });
    }
  },

  updateHeaderForPage(page) {
    const pageTitle = document.getElementById("pageTitle");
    const searchBox = document.getElementById("globalSearchBox");
    const playlistBtn = document.getElementById("headerPlaylistBtn");
    const refreshBtn = document.getElementById("headerRefreshBtn");
    const navVideoBtn = document.getElementById("navVideoBtn");
    const navAudioBtn = document.getElementById("navAudioBtn");
    if (page === "video") {
      if (pageTitle) pageTitle.innerHTML = '<i class="fas fa-video"></i> Видео';
      if (searchBox) searchBox.style.display = "none";
      if (playlistBtn) playlistBtn.style.display = "none";
      if (refreshBtn) refreshBtn.style.display = "none";
      if (navVideoBtn) {
        navVideoBtn.classList.add("active");
        navVideoBtn.style.display = "flex";
      }
      if (navAudioBtn) {
        navAudioBtn.classList.remove("active");
        navAudioBtn.style.display = "flex";
      }
    } else if (page === "audio") {
      if (pageTitle)
        pageTitle.innerHTML = '<i class="fas fa-album"></i> Альбомы';
      if (searchBox) searchBox.style.display = "flex";
      if (playlistBtn) playlistBtn.style.display = "flex";
      if (refreshBtn) refreshBtn.style.display = "flex";
      if (navVideoBtn) {
        navVideoBtn.classList.remove("active");
        navVideoBtn.style.display = "flex";
      }
      if (navAudioBtn) {
        navAudioBtn.classList.add("active");
        navAudioBtn.style.display = "flex";
      }
      const searchInput = document.getElementById("globalSearchInput");
      if (searchInput) searchInput.value = "";
    }
  },

  async checkServerAvailability() {
    try {
      const response = await fetch(`${Utils.getServerUrl()}/api/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/mnt/video" }),
      });
      return response.ok;
    } catch (error) {
      console.warn("Server not available:", error);
      return false;
    }
  },

  showProfileIndicator() {
    const indicator = document.getElementById("profileIndicator");
    if (!indicator) return;
    const port = window.location.port;
    const profile = port === "9093" ? "тестовая" : "продуктовая";
    const color = port === "9093" ? "var(--orange)" : "var(--green)";
    indicator.innerHTML = `
      <div style="font-size: 0.7rem; margin-top: 5px; padding: 2px 8px; background: ${color}20; border-radius: 12px; color: ${color};">
        <i class="fas ${port === "9093" ? "fa-flask" : "fa-check-circle"}"></i>
        ${profile} (порт ${port})
      </div>
    `;
  },

  async loadPage(page) {
    this.log("loadPage called with:", page, "pageLoading:", this.pageLoading);
    if (this.pageLoading) {
      this.log("Already loading page, skip");
      return;
    }
    this.pageLoading = true;
    const pageContainer = document.getElementById("pageContainer");
    if (!pageContainer) {
      this.log("pageContainer not found");
      this.pageLoading = false;
      return;
    }
    this.updateHeaderForPage(page);
    this.updateSidebarActiveState(page);
    const audioPlayerBar = document.getElementById("audioPlayerBar");
    if (audioPlayerBar && page === "video") {
      audioPlayerBar.style.display = "none";
    }
    try {
      this.log("Fetching page:", `pages/${page}.html`);
      const response = await fetch(`pages/${page}.html`);
      if (!response.ok) throw new Error("Page not found");
      const html = await response.text();
      pageContainer.innerHTML = html;
      this.log("Page HTML loaded");
      if (page === "video") {
        this.loadVideoPage();
      } else if (page === "audio") {
        this.loadAudioPage();
      }
    } catch (error) {
      console.error("Error loading page:", error);
      pageContainer.innerHTML =
        '<div class="error">Ошибка загрузки страницы</div>';
    }
    this.pageLoading = false;
    this.log("loadPage finished");
  },

  updateSidebarActiveState(page) {
    const navVideo = document.getElementById("navVideo");
    const navAudio = document.getElementById("navAudio");
    const navVideoBtn = document.getElementById("navVideoBtn");
    const navAudioBtn = document.getElementById("navAudioBtn");
    if (navVideo) {
      navVideo.classList.toggle("active", page === "video");
    }
    if (navAudio) {
      navAudio.classList.toggle("active", page === "audio");
    }
    if (navVideoBtn) {
      navVideoBtn.classList.toggle("active", page === "video");
    }
    if (navAudioBtn) {
      navAudioBtn.classList.toggle("active", page === "audio");
    }
  },

  loadVideoPage() {
    this.log("loadVideoPage called, scripts loaded:", this.loadedScripts.video);
    if (!this.loadedScripts.video) {
      setTimeout(() => {
        if (typeof VideoExplorer !== "undefined") {
          this.log("Calling VideoExplorer.init");
          VideoExplorer.init();
        }
        if (typeof NavigationManager !== "undefined") {
          this.log("Calling NavigationManager.attachButtonHandlers");
          NavigationManager.attachButtonHandlers();
        }
        this.loadedScripts.video = true;
      }, 100);
    } else {
      this.log("Scripts already loaded, reinitializing");
      setTimeout(() => {
        const videoContent = document.getElementById("videoContent");
        if (videoContent) {
          videoContent.innerHTML =
            '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
        }
        if (typeof VideoExplorer !== "undefined") {
          VideoExplorer.initialized = false;
          VideoExplorer.currentPath = "/mnt/video";
          VideoExplorer.history = [];
          VideoExplorer.init();
        }
        if (typeof NavigationManager !== "undefined") {
          NavigationManager.attachButtonHandlers();
        }
      }, 100);
    }
  },

  loadAudioPage() {
    this.log("loadAudioPage called, scripts loaded:", this.loadedScripts.audio);
    if (!this.loadedScripts.audio) {
      setTimeout(() => {
        if (typeof AlbumLibrary !== "undefined") {
          AlbumLibrary.init();
        }
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.init();
        }
        if (typeof PlaylistViewer !== "undefined") {
          PlaylistViewer.init();
        }
        if (typeof NavigationManager !== "undefined") {
          NavigationManager.attachButtonHandlers();
        }
        this.loadedScripts.audio = true;
      }, 100);
    } else {
      this.log("Scripts already loaded, reinitializing");
      setTimeout(() => {
        if (typeof AlbumLibrary !== "undefined") {
          AlbumLibrary.reloadAlbums();
        }
        if (typeof AudioPlayer !== "undefined" && AudioPlayer.initialized) {
          AudioPlayer.updateUI();
        }
        if (
          typeof PlaylistViewer !== "undefined" &&
          PlaylistViewer.initialized
        ) {
          PlaylistViewer.refresh();
        }
        if (typeof NavigationManager !== "undefined") {
          NavigationManager.attachButtonHandlers();
        }
      }, 100);
    }
  },

  setupMobileMenu() {
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.getElementById("sidebar");
    const sidebarOverlay = document.getElementById("sidebarOverlay");
    const toggleMenu = () => {
      if (sidebar) sidebar.classList.toggle("open");
      if (sidebarOverlay) sidebarOverlay.classList.toggle("open");
    };
    if (menuToggle) {
      const newMenuToggle = menuToggle.cloneNode(true);
      menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
      newMenuToggle.addEventListener("click", toggleMenu);
    }
    if (sidebarOverlay) {
      const newOverlay = sidebarOverlay.cloneNode(true);
      sidebarOverlay.parentNode.replaceChild(newOverlay, sidebarOverlay);
      newOverlay.addEventListener("click", toggleMenu);
    }
    document.querySelectorAll(".sidebar-btn").forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
          toggleMenu();
        }
      });
    });
  },

  loadDirectory(path, mediaType) {
    if (mediaType === "video" && typeof VideoExplorer !== "undefined") {
      VideoExplorer.loadDirectory(path, true);
    }
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
