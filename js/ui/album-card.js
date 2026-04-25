class AlbumCard {
  constructor(album, events) {
    this.album = album;
    this.events = events;
    this.element = null;
    this.container = null;
    this.swipeThreshold = 50;
  }

  render() {
    const coverHtml = this.album.coverUrl
      ? `<img src="${this.album.coverUrl}" alt="${this._escape(this.album.title)}" loading="lazy">`
      : `<div class="album-card-placeholder"><i class="fas fa-music"></i></div>`;

    this.container = document.createElement("div");
    this.container.className = "album-swipe-delete-container";

    this.element = document.createElement("div");
    this.element.className = "album-card";
    this.element.dataset.album = this.album.title;
    this.element.dataset.artist = this.album.artist;
    this.element.innerHTML = `
      <div class="album-card-art">
        ${coverHtml}
      </div>
      <div class="album-card-info">
        <div class="album-card-title" title="${this._escape(this.album.title)}">${this._escape(this.album.title)}</div>
        <div class="album-card-artist" title="${this._escape(this.album.artist)}">${this._escape(this.album.artist)}</div>
        <div class="album-card-meta">
          ${this.album.year ? `<span>${this.album.year}</span>` : ""}
          <span>${this.album.trackCount} треков</span>
        </div>
      </div>
    `;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "album-swipe-delete-btn";
    deleteBtn.title = "Удалить альбом";
    deleteBtn.innerHTML = `
      <i class="fas fa-trash-alt"></i>
      <span>Удалить</span>
    `;

    this.container.appendChild(this.element);
    this.container.appendChild(deleteBtn);

    this._attachEvents(deleteBtn);
    this._initSwipe();
    return this.container;
  }

  _initSwipe() {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    let touchStartX = 0;
    let touchMoveX = 0;
    let isSwiping = false;

    this.element.addEventListener(
      "touchstart",
      (e) => {
        touchStartX = e.changedTouches[0].clientX;
        isSwiping = true;
        this.element.style.transition = "none";
      },
      { passive: true },
    );

    this.element.addEventListener(
      "touchmove",
      (e) => {
        if (!isSwiping) return;
        touchMoveX = e.changedTouches[0].clientX;
        const deltaX = touchMoveX - touchStartX;
        if (deltaX < 0 && Math.abs(deltaX) <= 80) {
          e.preventDefault();
          this.element.style.transform = `translateX(${deltaX}px)`;
        }
      },
      { passive: false },
    );

    this.element.addEventListener("touchend", () => {
      if (!isSwiping) return;
      const deltaX = touchMoveX - touchStartX;
      this.element.style.transition = "transform 0.3s ease";
      if (deltaX < -this.swipeThreshold) {
        this.element.classList.add("swipe-left");
        this.element.style.transform = "translateX(-80px)";
      } else {
        this.element.classList.remove("swipe-left");
        this.element.style.transform = "translateX(0)";
      }
      isSwiping = false;
      setTimeout(() => {
        this.element.style.transition = "";
      }, 300);
    });

    document.addEventListener("click", (e) => {
      if (this.container && !this.container.contains(e.target)) {
        this.element.classList.remove("swipe-left");
        this.element.style.transform = "translateX(0)";
      }
    });
  }

  _attachEvents(deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.events.emit("albumDelete", this.album);
    });

    this.element.addEventListener("click", (e) => {
      this.events.emit("albumClick", this.album);
    });

    this.element.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.events.emit("albumContextMenu", {
        x: e.clientX,
        y: e.clientY,
        album: this.album,
      });
    });
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
