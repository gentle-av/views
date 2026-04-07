export class AlbumUIRenderer {
  constructor(library) {
    this.library = library;
  }

  getLoadingTemplate(totalArtists) {
    return `
      <div class="loading" style="grid-column: 1/-1;">
        <i class="fas fa-spinner fa-spin"></i>
        Загрузка альбомов...
        <span id="albumProgress">0</span>/<span id="albumTotal">${totalArtists}</span> артистов
        <div style="margin-top: 10px;">
          <span id="albumsFound">0</span> альбомов найдено
        </div>
        <div class="loading-progress-container">
          <div class="loading-progress-bar-fill" id="loadingProgressFill"></div>
        </div>
      </div>
    `;
  }

  generateAlbumCardHtml(album) {
    return `
      <div class="album-card" data-artist="${Utils.escapeHtml(album.artist)}" data-album="${Utils.escapeHtml(album.title)}">
        <div class="album-cover">
          ${album.coverUrl ? `<img src="${album.coverUrl}" alt="${Utils.escapeHtml(album.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : `<i class="fas fa-album fallback-icon"></i>`}
          ${album.coverUrl ? `<i class="fas fa-album fallback-icon" style="display: none;"></i>` : ""}
          <button class="album-edit-tags-btn" title="Редактировать теги альбома">
            <i class="fas fa-edit"></i>
          </button>
        </div>
        <div class="album-info">
          <div class="album-title" title="${Utils.escapeHtml(album.title)}">${Utils.escapeHtml(album.title)}</div>
          <div class="album-artist">${Utils.escapeHtml(album.artist || "Unknown")}</div>
          <div class="album-year">${album.year}</div>
          <div class="track-count"><i class="fas fa-headphones"></i> ${album.trackCount} треков</div>
        </div>
      </div>
    `;
  }

  renderAlbums() {
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    if (this.library.filteredAlbums.length === 0) {
      grid.innerHTML =
        '<div class="empty"><i class="fas fa-music"></i> Альбомы не найдены</div>';
      return;
    }
    grid.innerHTML = this.library.filteredAlbums
      .map((album) => this.generateAlbumCardHtml(album))
      .join("");
    this.attachAlbumCardEvents();
  }

  renderAlbumsIncremental() {
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    if (this.library.isInitialLoad) {
      this.renderAlbums();
      this.library.isInitialLoad = false;
      return;
    }
    const existingCards = grid.querySelectorAll(".album-card");
    const existingKeys = new Set();
    existingCards.forEach((card) => {
      existingKeys.add(`${card.dataset.artist}|${card.dataset.album}`);
    });
    const newAlbumsHtml = [];
    for (const album of this.library.filteredAlbums) {
      const key = `${album.artist}|${album.title}`;
      if (!existingKeys.has(key)) {
        newAlbumsHtml.push(this.generateAlbumCardHtml(album));
      }
    }
    if (newAlbumsHtml.length > 0) {
      grid.insertAdjacentHTML("beforeend", newAlbumsHtml.join(""));
      this.attachAlbumCardEvents();
    }
  }

  attachAlbumCardEvents() {
    document.querySelectorAll(".album-card").forEach((card) => {
      card.removeEventListener("click", this.handleAlbumClick);
      card.addEventListener("click", this.handleAlbumClick.bind(this));
      const editBtn = card.querySelector(".album-edit-tags-btn");
      if (editBtn) {
        editBtn.removeEventListener("click", this.handleAlbumEdit);
        editBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const artist = card.dataset.artist;
          const albumTitle = card.dataset.album;
          const album = this.library.albums.find(
            (a) => a.artist === artist && a.title === albumTitle,
          );
          if (album && typeof TagEditor !== "undefined") {
            TagEditor.showAlbumTagEditor(album);
          }
        });
      }
    });
  }

  handleAlbumClick(event) {
    const card = event.currentTarget;
    const artist = card.dataset.artist;
    const albumTitle = card.dataset.album;
    const album = this.library.albums.find(
      (a) => a.artist === artist && a.title === albumTitle,
    );
    if (album) this.library.showAlbumModal(album);
  }

  showAlbumModal(album) {
    const modal = document.getElementById("albumModal");
    if (!modal) return;
    const modalContent = modal.querySelector(".modal-content");
    if (!modalContent) return;
    modalContent.innerHTML = this.getAlbumModalTemplate(album);
    const tracksList = document.getElementById("modalTracksList");
    if (tracksList) {
      tracksList.innerHTML = this.getTracksListTemplate(album);
      this.attachTrackEventListeners(modal, album, tracksList);
    }
    this.attachModalControlButtons(modal, modalContent, album);
    modal.classList.add("active");
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("active");
    });
  }

  getAlbumModalTemplate(album) {
    return `
      <div class="album-modal-header">
        <div class="album-cover-container">
          ${album.coverUrl ? `<img src="${album.coverUrl}" alt="${Utils.escapeHtml(album.title)}" class="album-cover-modal">` : `<div class="album-cover-placeholder"><i class="fas fa-album"></i></div>`}
        </div>
        <div class="album-info-container">
          <h2 class="modal-album-title">${Utils.escapeHtml(album.artist)} — ${Utils.escapeHtml(album.title)}</h2>
          <div class="modal-album-year">${album.year || "Год неизвестен"}</div>
          <div class="modal-track-count"><i class="fas fa-headphones"></i> ${album.trackCount} треков</div>
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
  }

  getTracksListTemplate(album) {
    return album.tracks
      .map(
        (track, idx) => `
      <div class="track-item" data-track-index="${idx}" data-track-name="${Utils.escapeHtml(track.name)}" data-track-path="${track.path}">
        <div class="track-number">${String(idx + 1).padStart(2, "0")}</div>
        <div class="track-name">${Utils.escapeHtml(track.name)}</div>
        <div class="track-controls">
          <button class="track-control-btn edit-track-tags" data-track-index="${idx}" title="Редактировать теги трека"><i class="fas fa-edit"></i></button>
          <button class="track-control-btn replace-playlist-with-track" title="Заменить плейлист этим треком"><i class="fas fa-exchange-alt"></i></button>
          <button class="track-control-btn add-after-current" title="Добавить после текущего"><i class="fas fa-plus-circle"></i></button>
          <button class="track-control-btn show-playlist-from-track" title="Показать плейлист"><i class="fas fa-list"></i></button>
        </div>
      </div>
    `,
      )
      .join("");
  }

  attachTrackEventListeners(modal, album, tracksList) {
    tracksList.querySelectorAll(".edit-track-tags").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const trackIndex = parseInt(btn.dataset.trackIndex);
        const track = album.tracks[trackIndex];
        if (typeof TagEditor !== "undefined") {
          TagEditor.showTrackTagEditor(track, album);
        } else {
          Utils.showNotification("Редактор тегов недоступен", "error");
        }
      });
    });
    tracksList.querySelectorAll(".track-item").forEach((item) => {
      const idx = parseInt(item.dataset.trackIndex);
      const trackName = item.dataset.trackName;
      const replacePlaylistBtn = item.querySelector(
        ".replace-playlist-with-track",
      );
      const addAfterCurrentBtn = item.querySelector(".add-after-current");
      const showPlaylistBtn = item.querySelector(".show-playlist-from-track");
      if (replacePlaylistBtn) {
        replacePlaylistBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (typeof AudioPlayer !== "undefined") {
            AudioPlayer.replacePlaylistWithTrack(album, idx);
            Utils.showNotification(
              `Плейлист заменен треком: ${trackName}`,
              "success",
            );
            setTimeout(() => modal.classList.remove("active"), 500);
          }
        });
      }
      if (addAfterCurrentBtn) {
        addAfterCurrentBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (typeof AudioPlayer !== "undefined") {
            AudioPlayer.addTrackAfterCurrent(album, idx);
            Utils.showNotification(
              `Трек добавлен после текущего: ${trackName}`,
              "success",
            );
          }
        });
      }
      if (showPlaylistBtn) {
        showPlaylistBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
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
      item.addEventListener("click", (e) => {
        if (!e.target.closest(".track-control-btn")) {
          e.stopPropagation();
          if (typeof AudioPlayer !== "undefined") {
            AudioPlayer.playSingleTrack(album, idx);
          }
          modal.classList.remove("active");
        }
      });
    });
  }

  attachModalControlButtons(modal, modalContent, album) {
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
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") AudioPlayer.previousTrack();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") AudioPlayer.nextTrack();
      });
    }
    if (addToPlaylistBtn) {
      addToPlaylistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.addAlbumToPlaylist(album);
          Utils.showNotification(
            `Альбом "${album.title}" добавлен в плейлист`,
            "success",
          );
          if (
            typeof AlbumLibrary !== "undefined" &&
            AlbumLibrary.showPlaylistSection
          ) {
            AlbumLibrary.showPlaylistSection();
          }
        }
      });
    }
    if (replacePlaylistBtn) {
      replacePlaylistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.replacePlaylistWithAlbum(album);
          Utils.showNotification(
            `Плейлист заменен альбомом: ${album.title}`,
            "success",
          );
          setTimeout(() => {
            modal.classList.remove("active");
            if (
              typeof AlbumLibrary !== "undefined" &&
              AlbumLibrary.showPlaylistSection
            ) {
              AlbumLibrary.showPlaylistSection();
            }
          }, 100);
        }
      });
    }
    if (showPlaylistBtn) {
      showPlaylistBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
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
  }
}
