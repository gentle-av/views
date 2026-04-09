const AlbumLibrary = {
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
    if (typeof AlbumDataManager !== "undefined") {
      this.dataManager = new AlbumDataManager(this);
    }
    if (typeof AlbumUIRenderer !== "undefined") {
      this.uiRenderer = new AlbumUIRenderer(this);
    }
    if (typeof AlbumSearchEngine !== "undefined") {
      this.searchEngine = new AlbumSearchEngine(this);
    }
    if (typeof AlbumAPIHandler !== "undefined") {
      this.apiHandler = new AlbumAPIHandler(this);
    }
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    grid.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка артистов...</div>';
    await this.loadArtistsInBackground();
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
    grid.innerHTML = "" /*'<div class="albums-grid-initial"></div>'*/;
    if (this.loadingTaskId) {
      cancelIdleCallback(this.loadingTaskId);
      this.loadingTaskId = null;
    }
    let currentIndex = 0;
    const loadNextBatch = async (deadline) => {
      if (!this.initialized) return;
      let batchSize = 0;
      while (
        (deadline.timeRemaining() > 0 || batchSize < 3) &&
        currentIndex < this.artists.length
      ) {
        const artist = this.artists[currentIndex];
        await this.loadArtistAlbums(artist, uniqueAlbums);
        currentIndex++;
        batchSize++;
        if (batchSize % 3 === 0) await this.delay(10);
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

  async loadArtistAlbums(artist, uniqueAlbums) {
    try {
      const response = await fetch(
        `${this.getServerUrl()}/api/music/albums?artist=${encodeURIComponent(artist)}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json();
      if (data.status === "success" && data.albums) {
        for (const albumData of data.albums) {
          const albumKey = `${albumData.artist}|${albumData.album}`;
          if (!uniqueAlbums.has(albumKey)) {
            const tracksResponse = await fetch(
              `${this.getServerUrl()}/api/music/tracks/album/${encodeURIComponent(albumData.album)}?artist=${encodeURIComponent(albumData.artist)}`,
              {
                method: "GET",
                headers: { "Content-Type": "application/json" },
              },
            );
            const tracksData = await tracksResponse.json();
            const coverUrl = await this.getAlbumCover(
              albumData.album,
              albumData.artist,
            );
            const album = {
              title: albumData.album,
              artist: albumData.artist,
              year: albumData.year,
              tracks: tracksData.tracks || [],
              coverUrl: coverUrl,
            };
            uniqueAlbums.set(albumKey, album);
            this.albums.push(album);
            this.renderSingleAlbum(album);
          }
        }
      }
    } catch (error) {
      console.error(`Error loading albums for artist ${artist}:`, error);
    }
  },

  async getAlbumCover(albumName, artist) {
    try {
      const url = `${this.getServerUrl()}/api/music/albumart/album/${encodeURIComponent(albumName)}?artist=${encodeURIComponent(artist)}`;
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    } catch (error) {
      console.error("Error loading cover:", error);
      return null;
    }
  },

  renderSingleAlbum(album) {
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    const albumHtml = this.generateAlbumCardHtml(album);
    grid.insertAdjacentHTML("beforeend", albumHtml);
    this.attachAlbumCardEvents();
  },

  finalizeLoading() {
    this.albums.sort((a, b) => {
      if (a.artist !== b.artist) return a.artist.localeCompare(b.artist);
      if (a.year !== b.year) return (a.year || "").localeCompare(b.year || "");
      return a.title.localeCompare(b.title);
    });
    this.filteredAlbums = [...this.albums];
  },

  renderAlbums() {
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    if (this.filteredAlbums.length === 0) {
      grid.innerHTML =
        '<div class="empty"><i class="fas fa-music"></i> Альбомы не найдены</div>';
      return;
    }
    let html = "";
    for (const album of this.filteredAlbums) {
      html += this.generateAlbumCardHtml(album);
    }
    grid.innerHTML = html;
    this.attachAlbumCardEvents();
  },

  generateAlbumCardHtml(album) {
    const coverUrl = album.coverUrl || "";
    const trackCount = album.tracks ? album.tracks.length : 0;
    const coverHtml = coverUrl
      ? `<img src="${coverUrl}" alt="${this.escapeHtml(album.title)}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23333\'/%3E%3Ctext x=\'50\' y=\'55\' text-anchor=\'middle\' fill=\'%23666\' font-size=\'12\'%3E🎵%3C/text%3E%3C/svg%3E';">`
      : `<div class="album-card-placeholder"><i class="fas fa-music"></i></div>`;
    return `
        <div class="album-card" data-album-title="${this.escapeHtml(album.title)}" data-album-artist="${this.escapeHtml(album.artist)}">
            <div class="album-card-art">
                ${coverHtml}
            </div>
            <div class="album-card-info">
                <div class="album-card-title" title="${this.escapeHtml(album.title)}">${this.escapeHtml(album.title)}</div>
                <div class="album-card-artist">${this.escapeHtml(album.artist)}</div>
                <div class="album-card-meta">
                    ${album.year ? `<span>${album.year}</span>` : ""}
                    <span>${trackCount} треков</span>
                </div>
            </div>
        </div>
    `;
  },

  attachAlbumCardEvents() {
    document.querySelectorAll(".album-card").forEach((card) => {
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      newCard.addEventListener("click", (e) => {
        const title = newCard.dataset.albumTitle;
        const artist = newCard.dataset.albumArtist;
        const album = this.albums.find(
          (a) => a.title === title && a.artist === artist,
        );
        if (album) this.showAlbumModal(album);
      });
    });
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
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

  async performSearch(searchTerm) {
    if (!searchTerm.trim()) {
      this.filteredAlbums = [...this.albums];
      this.renderAlbums();
      return;
    }
    const term = searchTerm.toLowerCase();
    this.filteredAlbums = this.albums.filter(
      (album) =>
        album.title.toLowerCase().includes(term) ||
        album.artist.toLowerCase().includes(term),
    );
    this.renderAlbums();
  },

  async refreshDatabase() {
    try {
      const response = await fetch(
        `${this.getServerUrl()}/api/music/force-rescan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      const data = await response.json();
      if (data.status === "success") {
        if (typeof Utils !== "undefined") {
          Utils.showNotification("База данных обновлена", "success");
        }
        await this.reloadAlbums();
      }
    } catch (error) {
      console.error("Error refreshing database:", error);
      if (typeof Utils !== "undefined") {
        Utils.showNotification("Ошибка обновления базы данных", "error");
      }
    }
  },

  showAlbumModal(album) {
    const modal = document.getElementById("albumModal");
    const modalTitle = document.getElementById("modalAlbumTitle");
    const modalTracksList = document.getElementById("modalTracksList");
    if (!modal || !modalTitle || !modalTracksList) return;
    modalTitle.textContent = `${album.artist} - ${album.title}`;
    const modalAlbumArt = document.getElementById("modalAlbumArt");
    if (modalAlbumArt && album.coverUrl) {
      modalAlbumArt.src = album.coverUrl;
      modalAlbumArt.onerror = () => {
        modalAlbumArt.src =
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23333'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23666' font-size='12'%3E🎵%3C/text%3E%3C/svg%3E";
      };
    }
    if (album.tracks && album.tracks.length > 0) {
      let tracksHtml = '<div class="modal-tracks-list">';
      album.tracks.forEach((track, idx) => {
        tracksHtml += `
          <div class="modal-track-item" data-track-index="${idx}">
            <div class="modal-track-number">${idx + 1}</div>
            <div class="modal-track-info">
              <div class="modal-track-title">${this.escapeHtml(track.name || track.title || "Без названия")}</div>
              <div class="modal-track-duration">${this.formatDuration(track.duration)}</div>
            </div>
            <button class="modal-track-play-btn" data-track-index="${idx}">
              <i class="fas fa-play"></i>
            </button>
          </div>
        `;
      });
      tracksHtml += "</div>";
      modalTracksList.innerHTML = tracksHtml;
      modalTracksList
        .querySelectorAll(".modal-track-play-btn")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.trackIndex);
            if (typeof PlaylistViewer !== "undefined") {
              PlaylistViewer.addToPlaylist(album, idx);
              modal.classList.remove("active");
            }
          });
        });
      modalTracksList.querySelectorAll(".modal-track-item").forEach((item) => {
        item.addEventListener("click", () => {
          const idx = parseInt(item.dataset.trackIndex);
          if (typeof PlaylistViewer !== "undefined") {
            PlaylistViewer.addToPlaylist(album, idx);
            modal.classList.remove("active");
          }
        });
      });
    } else {
      modalTracksList.innerHTML = '<div class="modal-empty">Нет треков</div>';
    }
    modal.classList.add("active");
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener("click", () => {
        modal.classList.remove("active");
      });
    }
  },

  formatDuration(seconds) {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};
