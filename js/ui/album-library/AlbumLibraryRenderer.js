import { AlbumCard } from "../album-card.js";

export class AlbumLibraryRenderer {
  constructor(container, events, state) {
    this.container = container;
    this.events = events;
    this.state = state;
    this._scrollPosition = 0;
  }

  showLoading() {
    if (this.container && !this.state.isDestroyed) {
      this.container.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка альбомов...</div>';
    }
  }

  showError() {
    if (this.container && !this.state.isDestroyed) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
    }
  }

  showEmpty() {
    if (this.container && !this.state.isDestroyed) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-music"></i> Альбомы не найдены</div>';
    }
  }

  showLoadingMore() {
    const existing = this.container.querySelector(".loading-more");
    if (existing) existing.remove();
    if (this.state.isLoadingMore && !this.state.isDestroyed) {
      const loadingMore = document.createElement("div");
      loadingMore.className = "loading-more";
      loadingMore.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Загрузка альбомов...';
      this.container.appendChild(loadingMore);
    }
  }

  removeLoadingMore() {
    const existing = this.container.querySelector(".loading-more");
    if (existing) existing.remove();
  }

  saveScrollPosition() {
    const scrollable = document.getElementById("scrollableContent");
    if (scrollable) {
      this._scrollPosition = scrollable.scrollTop;
    }
  }

  restoreScrollPosition() {
    const scrollable = document.getElementById("scrollableContent");
    if (scrollable && this._scrollPosition > 0) {
      setTimeout(() => {
        scrollable.scrollTop = this._scrollPosition;
      }, 50);
    }
  }

  renderAlbums(onCardRender) {
    if (!this.container || this.state.isDestroyed) return;
    const loadingIndicator = this.container.querySelector(".loading");
    if (
      loadingIndicator &&
      this.state.filteredAlbums.length === 0 &&
      !this.state.isLoadingMore
    ) {
      return;
    }
    if (loadingIndicator) loadingIndicator.remove();
    if (this.state.filteredAlbums.length === 0 && !this.state.isLoadingMore) {
      this.showEmpty();
      return;
    }
    const existingCards = this.container.querySelectorAll(
      ".album-swipe-delete-container",
    );
    const existingCount = existingCards.length;
    const newAlbums = this.state.filteredAlbums.slice(existingCount);
    for (const album of newAlbums) {
      const card = new AlbumCard(album, this.events);
      const cardElement = card.render();
      if (album.id) {
        cardElement.setAttribute("data-album-id", album.id);
      }
      this.container.appendChild(cardElement);
      if (onCardRender) onCardRender(card);
    }
    this.showLoadingMore();
    this._fixScroll();
  }

  _fixScroll() {
    const scrollable = document.getElementById("scrollableContent");
    if (scrollable) {
      scrollable.style.overflowY = "auto";
      scrollable.style.webkitOverflowScrolling = "touch";
    }
  }

  clear() {
    this.saveScrollPosition();
    if (this.container) {
      this.container.innerHTML = "";
    }
  }

  closeAllSwipes() {
    if (!this.container) return;
    const cards = this.container.querySelectorAll(".album-card");
    cards.forEach((card) => {
      card.classList.remove("swipe-left");
      card.style.transform = "translateX(0)";
    });
  }
}
