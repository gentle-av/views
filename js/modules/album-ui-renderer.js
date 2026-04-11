class AlbumUIRenderer {
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
    const coverHtml = album.coverUrl
      ? `<img src="${album.coverUrl}" alt="${this.escapeHtml(album.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
      : `<i class="fas fa-album fallback-icon"></i>`;
    const fallbackHtml = album.coverUrl
      ? `<i class="fas fa-album fallback-icon" style="display: none;"></i>`
      : "";
    return `
      <div class="album-card" data-artist="${this.escapeHtml(album.artist)}" data-album="${this.escapeHtml(album.title)}">
        <div class="album-cover">
          ${coverHtml}
          ${fallbackHtml}
          <button class="album-edit-tags-btn" title="Редактировать теги альбома">
            <i class="fas fa-edit"></i>
          </button>
        </div>
        <div class="album-info">
          <div class="album-title" title="${this.escapeHtml(album.title)}">${this.escapeHtml(album.title)}</div>
          <div class="album-artist">${this.escapeHtml(album.artist || "Unknown")}</div>
          <div class="album-year">${album.year || ""}</div>
          <div class="track-count"><i class="fas fa-headphones"></i> ${album.trackCount || 0} треков</div>
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  renderAlbums() {
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    if (
      !this.library.filteredAlbums ||
      this.library.filteredAlbums.length === 0
    ) {
      grid.innerHTML =
        '<div class="empty"><i class="fas fa-music"></i> Альбомы не найдены</div>';
      return;
    }
    grid.innerHTML = this.library.filteredAlbums
      .map((album) => this.generateAlbumCardHtml(album))
      .join("");
    this.attachAlbumCardEvents();
  }

  attachAlbumCardEvents() {
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    grid.removeEventListener("click", this.handleAlbumClick);
    this.handleAlbumClick = (e) => {
      console.log("[AlbumLibrary] Click on grid", e.target);
      const card = e.target.closest(".album-card");
      if (!card) {
        console.log("[AlbumLibrary] No album card found");
        return;
      }
      console.log("[AlbumLibrary] Album card clicked", card.dataset);
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
      if (album) {
        console.log("[AlbumLibrary] Showing modal for", album.title);
        this.showAlbumModal(album);
      } else {
        console.log("[AlbumLibrary] Album not found in albums array");
      }
    };
    grid.addEventListener("click", this.handleAlbumClick);
    console.log("[AlbumLibrary] Event listener attached to grid");
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
  }

  getTracksListTemplate(album) {
    if (!album.tracks || album.tracks.length === 0) {
      return '<div class="empty-tracks">Нет треков</div>';
    }
    return album.tracks
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
  }

  formatDuration(seconds) {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  attachTrackEventListeners(modal, album, tracksList) {
    tracksList.querySelectorAll(".edit-track-tags").forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
      newBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        const trackIndex = parseInt(newBtn.dataset.trackIndex);
        const track = album.tracks[trackIndex];
        if (typeof TagEditor !== "undefined") {
          TagEditor.showTrackTagEditor(track, album);
        } else if (typeof Utils !== "undefined") {
          Utils.showNotification("Редактор тегов недоступен", "error");
        }
      });
    });
    tracksList.querySelectorAll(".track-item").forEach((item) => {
      const newItem = item.cloneNode(true);
      item.parentNode.replaceChild(newItem, item);
      const idx = parseInt(newItem.dataset.trackIndex);
      const trackName = newItem.dataset.trackName;
      const replacePlaylistBtn = newItem.querySelector(
        ".replace-playlist-with-track",
      );
      const addAfterCurrentBtn = newItem.querySelector(".add-after-current");
      const showPlaylistBtn = newItem.querySelector(
        ".show-playlist-from-track",
      );
      if (replacePlaylistBtn) {
        const newReplaceBtn = replacePlaylistBtn.cloneNode(true);
        replacePlaylistBtn.parentNode.replaceChild(
          newReplaceBtn,
          replacePlaylistBtn,
        );
        newReplaceBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (typeof AudioPlayer !== "undefined") {
            AudioPlayer.replacePlaylistWithTrack(album, idx);
            if (typeof Utils !== "undefined") {
              Utils.showNotification(
                `Плейлист заменен треком: ${trackName}`,
                "success",
              );
            }
            setTimeout(() => modal.classList.remove("active"), 500);
          }
        });
      }
      if (addAfterCurrentBtn) {
        const newAddBtn = addAfterCurrentBtn.cloneNode(true);
        addAfterCurrentBtn.parentNode.replaceChild(
          newAddBtn,
          addAfterCurrentBtn,
        );
        newAddBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          if (typeof AudioPlayer !== "undefined") {
            AudioPlayer.addTrackAfterCurrent(album, idx);
            if (typeof Utils !== "undefined") {
              Utils.showNotification(
                `Трек добавлен после текущего: ${trackName}`,
                "success",
              );
            }
          }
        });
      }
      if (showPlaylistBtn) {
        const newShowBtn = showPlaylistBtn.cloneNode(true);
        showPlaylistBtn.parentNode.replaceChild(newShowBtn, showPlaylistBtn);
        newShowBtn.addEventListener("click", (e) => {
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
      newItem.addEventListener("click", (e) => {
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
      const newPrevBtn = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newPrevBtn, prevBtn);
      newPrevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") AudioPlayer.previousTrack();
      });
    }
    if (nextBtn) {
      const newNextBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
      newNextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") AudioPlayer.nextTrack();
      });
    }
    if (addToPlaylistBtn) {
      const newAddBtn = addToPlaylistBtn.cloneNode(true);
      addToPlaylistBtn.parentNode.replaceChild(newAddBtn, addToPlaylistBtn);
      newAddBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.addAlbumToPlaylist(album);
          if (typeof Utils !== "undefined") {
            Utils.showNotification(
              `Альбом "${album.title}" добавлен в плейлист`,
              "success",
            );
          }
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
      const newReplaceBtn = replacePlaylistBtn.cloneNode(true);
      replacePlaylistBtn.parentNode.replaceChild(
        newReplaceBtn,
        replacePlaylistBtn,
      );
      newReplaceBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (typeof AudioPlayer !== "undefined") {
          AudioPlayer.replacePlaylistWithAlbum(album);
          if (typeof Utils !== "undefined") {
            Utils.showNotification(
              `Плейлист заменен альбомом: ${album.title}`,
              "success",
            );
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
        }
      });
    }
    if (showPlaylistBtn) {
      const newShowBtn = showPlaylistBtn.cloneNode(true);
      showPlaylistBtn.parentNode.replaceChild(newShowBtn, showPlaylistBtn);
      newShowBtn.addEventListener("click", (e) => {
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
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      newCloseBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        modal.classList.remove("active");
      });
    }
  }
}
