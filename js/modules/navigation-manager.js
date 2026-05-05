const NavigationManager = {
  currentPage: null,
  initialized: false,

  init(events) {
    if (this.initialized) return;
    this.initialized = true;
    this.events = events;
    this._attachButtons();
  },

  _attachButtons() {
    const buttons = [
      "navVideo",
      "navAudio",
      "navPower",
      "navVideoBtn",
      "navAudioBtn",
      "navPowerBtn",
    ];
    buttons.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        const handler = (e) => {
          e.preventDefault();
          let page = "video";
          if (id.includes("Audio")) page = "audio";
          if (id.includes("Power")) page = "power";
          this.switchTo(page);
        };
        btn.removeEventListener("click", handler);
        btn.addEventListener("click", handler);
        btn._navHandler = handler;
      }
    });
  },

  async switchTo(page) {
    if (this.currentPage === page) return;
    this.currentPage = page;
    this.events.emit("page:changed", page);
    this._updatePageTitle(page);
    this._updateActiveButtons(page);
    const searchBox = document.getElementById("globalSearchBox");
    if (searchBox) searchBox.style.display = page === "audio" ? "flex" : "none";
    const headerPlaylistBtn = document.getElementById("headerPlaylistBtn");
    if (headerPlaylistBtn)
      headerPlaylistBtn.style.display = page === "audio" ? "flex" : "none";
    const refreshBtn = document.getElementById("headerRefreshBtn");
    if (refreshBtn)
      refreshBtn.style.display = page === "video" ? "flex" : "none";
    const refreshMetadataBtn = document.getElementById(
      "headerRefreshMetadataBtn",
    );
    if (refreshMetadataBtn)
      refreshMetadataBtn.style.display = page === "audio" ? "flex" : "none";
    const container = document.getElementById("pageContainer");
    if (!container) return;
    container.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
    try {
      const response = await fetch(`pages/${page}.html`);
      if (!response.ok)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const html = await response.text();
      container.innerHTML = html;
      this.events.emit(`page:${page}Loaded`);
      const universalPlayer = document.getElementById("universalBottomPlayer");
      if (universalPlayer && window.universalPlayerInstance) {
        const hasActivePlayback =
          window.universalPlayerInstance.currentFile !== null;
        if (hasActivePlayback) {
          universalPlayer.style.display = "flex";
          universalPlayer.classList.add("active");
        } else {
          universalPlayer.style.display = "none";
          universalPlayer.classList.remove("active");
        }
      }
      if (
        window.universalPlayerInstance &&
        window.universalPlayerInstance.currentFile
      ) {
        window.universalPlayerInstance.show();
      }
    } catch (error) {
      container.innerHTML = `<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки: ${error.message}</div>`;
    }
  },

  _updatePageTitle(page) {
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) {
      let icon = "fa-video";
      let text = "Видео";
      if (page === "audio") {
        icon = "fa-music";
        text = "Аудиотека";
      } else if (page === "power") {
        icon = "fa-plug";
        text = "Управление питанием";
      }
      titleEl.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
    }
  },

  _updateActiveButtons(page) {
    document
      .querySelectorAll(".sidebar-btn, .mobile-nav-buttons .header-btn")
      .forEach((btn) => {
        const btnPage =
          btn.getAttribute("data-page") ||
          (btn.id?.includes("Video")
            ? "video"
            : btn.id?.includes("Audio")
              ? "audio"
              : btn.id?.includes("Power")
                ? "power"
                : null);
        if (btnPage === page) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
  },

  getCurrentPage() {
    return this.currentPage;
  },
};
