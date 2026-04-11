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

  showPlaylistSection() {
    console.log("showPlaylistSection called");
    const modal = document.getElementById("albumModal");
    if (modal && modal.classList.contains("active")) {
      modal.classList.remove("active");
    }
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
        if (
          playlistSection &&
          typeof playlistSection.scrollIntoView === "function"
        ) {
          try {
            playlistSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          } catch (e) {
            console.error("scrollIntoView error:", e);
          }
        }
      }, 200);
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          if (
            playlistSection &&
            typeof playlistSection.scrollIntoView === "function"
          ) {
            try {
              playlistSection.scrollIntoView({
                behavior: "smooth",
                block: "end",
              });
            } catch (e) {
              console.error("scrollIntoView error:", e);
            }
          }
        }, 200);
      }
    }
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
    this.attachAlbumCardEvents();
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
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    // Используем делегирование событий
    grid.removeEventListener("click", this.handleAlbumClick);
    this.handleAlbumClick = (e) => {
      const card = e.target.closest(".album-card");
      if (!card) return;
      const editBtn = e.target.closest(".album-edit-tags-btn");
      if (editBtn) {
        e.stopPropagation();
        const artist = card.dataset.albumArtist;
        const albumTitle = card.dataset.albumTitle;
        const album = this.albums.find(
          (a) => a.artist === artist && a.title === albumTitle,
        );
        if (album && typeof TagEditor !== "undefined") {
          TagEditor.showAlbumTagEditor(album);
        }
        return;
      }
      const title = card.dataset.albumTitle;
      const artist = card.dataset.albumArtist;
      const album = this.albums.find(
        (a) => a.title === title && a.artist === artist,
      );
      if (album) this.showAlbumModal(album);
    };
    grid.addEventListener("click", this.handleAlbumClick);
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
      this.showPlaylistSection();
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
    if (!modal) return;
    const modalContent = modal.querySelector(".modal-content");
    if (!modalContent) return;
    modalContent.innerHTML = `
        <div class="album-modal-header">
            <div class="album-cover-container">
                ${album.coverUrl ? `<img src="${album.coverUrl}" alt="${this.escapeHtml(album.title)}" class="album-cover-modal">` : `<div class="album-cover-placeholder"><i class="fas fa-album"></i></div>`}
            </div>
            <div class="album-info-container">
                <h2 class="modal-album-title">${this.escapeHtml(album.artist)} — ${this.escapeHtml(album.title)}</h2>
                <div class="modal-album-year">${album.year || "Год неизвестен"}</div>
                <div class="modal-track-count"><i class="fas fa-headphones"></i> ${album.tracks ? album.tracks.length : 0} треков</div>
            </div>
            <div class="modal-controls">
                <button class="modal-control-btn prev-track-btn" title="Предыдущий трек"><i class="fas fa-step-backward"></i></button>
                <button class="modal-control-btn add-to-playlist-btn" title="Добавить в плейлист"><i class="fas fa-plus-circle"></i></button>
                <button class="modal-control-btn replace-playlist-btn" title="Заменить плейлист"><i class="fas fa-exchange-alt"></i></button>
                <button class="modal-control-btn show-playlist-btn" title="Показать плейлист"><i class="fas fa-list"></i></button>
                <button class="modal-control-btn next-track-btn" title="Следующий трек"><i class="fas fa-step-forward"></i></button>
                <button class="modal-close-btn"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="tracks-list-container">
            <h3>Треки</h3>
            <div class="tracks-list" id="modalTracksList"></div>
        </div>
    `;
    const modalTracksList = document.getElementById("modalTracksList");
    if (modalTracksList && album.tracks && album.tracks.length > 0) {
      modalTracksList.innerHTML = album.tracks
        .map(
          (track, idx) => `
            <div class="track-item" data-track-index="${idx}" data-track-name="${this.escapeHtml(track.name || track.title || "")}" data-track-path="${track.path || ""}">
                <div class="track-left">
                    <div class="track-number">${String(idx + 1).padStart(2, "0")}</div>
                    <div class="track-name">${this.escapeHtml(track.name || track.title || "Без названия")}</div>
                    <div class="track-duration">${track.duration ? this.formatDuration(track.duration) : ""}</div>
                </div>
                <div class="track-right">
                    <button class="track-control-btn edit-track-tags" data-track-index="${idx}" title="Редактировать теги трека"><i class="fas fa-edit"></i></button>
                    <button class="track-control-btn replace-playlist-with-track" title="Заменить плейлист этим треком"><i class="fas fa-exchange-alt"></i></button>
                    <button class="track-control-btn add-after-current" title="Добавить после текущего"><i class="fas fa-plus-circle"></i></button>
                    <button class="track-control-btn show-playlist-from-track" title="Показать плейлист"><i class="fas fa-list"></i></button>
                </div>
            </div>
        `,
        )
        .join("");
      modalTracksList.querySelectorAll(".edit-track-tags").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.trackIndex);
          const track = album.tracks[idx];
          const trackWithName = {
            ...track,
            name:
              track.name ||
              track.title ||
              (track.path
                ? decodeURIComponent(track.path.split("/").pop()).replace(
                    /\.(flac|mp3|m4a|wav)$/i,
                    "",
                  )
                : "Без названия"),
            title:
              track.title ||
              track.name ||
              (track.path
                ? decodeURIComponent(track.path.split("/").pop()).replace(
                    /\.(flac|mp3|m4a|wav)$/i,
                    "",
                  )
                : "Без названия"),
          };
          if (typeof TagEditor !== "undefined") {
            TagEditor.showTrackTagEditor(trackWithName, album);
          }
        });
      });
      modalTracksList
        .querySelectorAll(".replace-playlist-with-track")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.dataset.trackIndex);
            if (typeof AudioPlayer !== "undefined") {
              AudioPlayer.replacePlaylistWithTrack(album, idx);
            }
            modal.classList.remove("active");
          });
        });
      modalTracksList.querySelectorAll(".add-after-current").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.trackIndex);
          if (typeof AudioPlayer !== "undefined") {
            AudioPlayer.addTrackAfterCurrent(album, idx);
          }
        });
      });
      modalTracksList
        .querySelectorAll(".show-playlist-from-track")
        .forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (
              typeof AlbumLibrary !== "undefined" &&
              AlbumLibrary.showPlaylistSection
            ) {
              AlbumLibrary.showPlaylistSection();
            }
            modal.classList.remove("active");
          });
        });
      modalTracksList.querySelectorAll(".track-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          if (!e.target.closest(".track-control-btn")) {
            const idx = parseInt(item.dataset.trackIndex);
            if (typeof AudioPlayer !== "undefined") {
              AudioPlayer.playSingleTrack(album, idx);
            }
            modal.classList.remove("active");
          }
        });
      });
    }
    const prevBtn = modalContent.querySelector(".prev-track-btn");
    const nextBtn = modalContent.querySelector(".next-track-btn");
    const addToPlaylistBtn = modalContent.querySelector(".add-to-playlist-btn");
    const replacePlaylistBtn = modalContent.querySelector(
      ".replace-playlist-btn",
    );
    const showPlaylistBtn = modalContent.querySelector(".show-playlist-btn");
    const closeBtn = modalContent.querySelector(".modal-close-btn");
    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof AudioPlayer !== "undefined") AudioPlayer.previousTrack();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof AudioPlayer !== "undefined") AudioPlayer.nextTrack();
      });
    }
    if (addToPlaylistBtn) {
      addToPlaylistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.addAlbumToPlaylist(album);
        }
        if (
          typeof AlbumLibrary !== "undefined" &&
          AlbumLibrary.showPlaylistSection
        ) {
          AlbumLibrary.showPlaylistSection();
        }
      });
    }
    if (replacePlaylistBtn) {
      replacePlaylistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.replacePlaylistWithAlbum(album);
        }
        setTimeout(() => {
          modal.classList.remove("active");
          if (
            typeof AlbumLibrary !== "undefined" &&
            AlbumLibrary.showPlaylistSection
          ) {
            AlbumLibrary.showPlaylistSection();
          }
        }, 100);
      });
    }
    if (showPlaylistBtn) {
      showPlaylistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (
          typeof AlbumLibrary !== "undefined" &&
          AlbumLibrary.showPlaylistSection
        ) {
          AlbumLibrary.showPlaylistSection();
        }
        if (typeof PlaylistViewer !== "undefined") PlaylistViewer.init();
        modal.classList.remove("active");
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        modal.classList.remove("active");
      });
    }
    modal.classList.add("active");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
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
