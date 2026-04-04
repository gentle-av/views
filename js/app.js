const App = {
  currentPage: "video",
  loadedScripts: {
    video: false,
    audio: false,
  },

  async init() {
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
      return;
    }
    this.setupNavigation();
    this.setupMobileNavigation();
    this.setupHeaderControls();
    this.showProfileIndicator();
    if (typeof PlayerManager !== "undefined") {
      PlayerManager.init();
    }
    const pageContainer = document.getElementById("pageContainer");
    if (pageContainer) {
      pageContainer.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
    }
    this.setupMobileMenu();
    await this.loadPage("video");
  },

  setupMobileNavigation() {
    const navVideoBtn = document.getElementById("navVideoBtn");
    const navAudioBtn = document.getElementById("navAudioBtn");
    if (navVideoBtn) {
      navVideoBtn.addEventListener("click", () => this.loadPage("video"));
    }
    if (navAudioBtn) {
      navAudioBtn.addEventListener("click", () => this.loadPage("audio"));
    }
  },

  setupHeaderControls() {
    const headerPlaylistBtn = document.getElementById("headerPlaylistBtn");
    if (headerPlaylistBtn) {
      headerPlaylistBtn.addEventListener("click", () => {
        if (typeof AlbumLibrary !== "undefined") {
          AlbumLibrary.openPlaylistSidebar();
        }
      });
    }
    const headerRefreshBtn = document.getElementById("headerRefreshBtn");
    if (headerRefreshBtn) {
      headerRefreshBtn.addEventListener("click", () => {
        if (typeof AlbumLibrary !== "undefined") {
          AlbumLibrary.refreshDatabase();
        }
      });
    }
    const globalSearchInput = document.getElementById("globalSearchInput");
    if (globalSearchInput) {
      globalSearchInput.addEventListener("input", (e) => {
        if (
          this.currentPage === "audio" &&
          typeof AlbumLibrary !== "undefined"
        ) {
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

  setupNavigation() {
    const navVideo = document.getElementById("navVideo");
    const navAudio = document.getElementById("navAudio");
    if (navVideo)
      navVideo.addEventListener("click", () => this.loadPage("video"));
    if (navAudio)
      navAudio.addEventListener("click", () => this.loadPage("audio"));
  },

  async loadPage(page) {
    const pageContainer = document.getElementById("pageContainer");
    if (!pageContainer) return;
    this.currentPage = page;
    this.updateHeaderForPage(page);
    const navVideo = document.getElementById("navVideo");
    const navAudio = document.getElementById("navAudio");
    if (navVideo) navVideo.classList.toggle("active", page === "video");
    if (navAudio) navAudio.classList.toggle("active", page === "audio");
    const audioPlayerBar = document.getElementById("audioPlayerBar");
    if (audioPlayerBar && page === "video") {
      audioPlayerBar.style.display = "none";
    }
    try {
      const response = await fetch(`pages/${page}.html`);
      if (!response.ok) throw new Error("Page not found");
      const html = await response.text();
      pageContainer.innerHTML = html;
      if (page === "video") {
        const script = document.createElement("script");
        script.src = "js/modules/video-explorer.js";
        script.onload = () => {
          if (typeof VideoExplorer !== "undefined") {
            setTimeout(() => VideoExplorer.init(), 100);
          }
        };
        document.body.appendChild(script);
      } else if (page === "audio") {
        const script1 = document.createElement("script");
        script1.src = "js/modules/album-library.js";
        const script2 = document.createElement("script");
        script2.src = "js/modules/audio-player.js";
        const script3 = document.createElement("script");
        script3.src = "js/modules/playlist-viewer.js";
        script1.onload = () => {
          script2.onload = () => {
            script3.onload = () => {
              if (typeof AlbumLibrary !== "undefined") {
                setTimeout(() => AlbumLibrary.init(), 100);
              }
              if (typeof AudioPlayer !== "undefined") {
                setTimeout(() => AudioPlayer.init(), 150);
              }
              if (typeof PlaylistViewer !== "undefined") {
                setTimeout(() => PlaylistViewer.init(), 200);
              }
            };
            document.body.appendChild(script3);
          };
          document.body.appendChild(script2);
        };
        document.body.appendChild(script1);
      }
    } catch (error) {
      console.error("Error loading page:", error);
      pageContainer.innerHTML =
        '<div class="error">Ошибка загрузки страницы</div>';
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
    if (menuToggle) menuToggle.addEventListener("click", toggleMenu);
    if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleMenu);
    document.querySelectorAll(".sidebar-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
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
};

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});
