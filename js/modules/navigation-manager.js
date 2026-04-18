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
    const buttons = ["navVideo", "navAudio", "navVideoBtn", "navAudioBtn"];

    buttons.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.removeEventListener("click", this._handler);
        this._handler = (e) => {
          e.preventDefault();
          const page = id.includes("Video") ? "video" : "audio";
          this.switchTo(page);
        };
        btn.addEventListener("click", this._handler);
      }
    });
  },

  async switchTo(page) {
    if (this.currentPage === page) return;

    this.currentPage = page;
    this._updatePageTitle(page);
    this._updateActiveButtons(page);
    const searchBox = document.getElementById("globalSearchBox");
    if (searchBox) {
      searchBox.style.display = page === "audio" ? "flex" : "none";
    }
    const container = document.getElementById("pageContainer");
    if (container) {
      const response = await fetch(`${page}.html`);
      const html = await response.text();
      container.innerHTML = html;
      this.events.emit(`page:${page}Loaded`);
    }
  },

  _updatePageTitle(page) {
    const titleEl = document.getElementById("pageTitle");
    if (titleEl) {
      const icon = page === "video" ? "fa-video" : "fa-music";
      const text = page === "video" ? "Видео" : "Аудиотека";
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
