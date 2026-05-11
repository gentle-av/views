export class SearchPopup {
  constructor(onSearch, onClose) {
    this.onSearch = onSearch;
    this.onClose = onClose;
    this.isOpen = false;
    this.modal = null;
    this.searchInput = null;
    this._boundHandleKeydown = this._handleKeydown.bind(this);
  }

  show() {
    if (this.isOpen) return;
    this._createModal();
    this.isOpen = true;
    document.addEventListener("keydown", this._boundHandleKeydown);
    setTimeout(() => {
      if (this.searchInput) {
        this.searchInput.focus();
      }
    }, 100);
  }

  hide() {
    if (!this.isOpen) return;
    if (this.modal && this.modal.parentNode) {
      this.modal.classList.add("closing");
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.remove();
        }
      }, 200);
    }
    this.isOpen = false;
    document.removeEventListener("keydown", this._boundHandleKeydown);
    if (this.onClose) this.onClose();
  }

  _createModal() {
    if (this.modal && this.modal.parentNode) {
      this.modal.remove();
    }
    this.modal = document.createElement("div");
    this.modal.className = "search-popup-modal";
    this.modal.innerHTML = `
      <div class="search-popup-overlay"></div>
      <div class="search-popup-container">
        <div class="search-popup-header">
          <i class="fas fa-search"></i>
          <input type="text" class="search-popup-input" placeholder="Поиск альбомов или исполнителей..." autocomplete="off">
          <button class="search-popup-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="search-popup-hints">
          <div class="search-hint">
            <i class="fas fa-music"></i>
            <span>Поиск по названию альбома</span>
          </div>
          <div class="search-hint">
            <i class="fas fa-user"></i>
            <span>Поиск по имени исполнителя</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
    this.searchInput = this.modal.querySelector(".search-popup-input");
    const closeBtn = this.modal.querySelector(".search-popup-close");
    const overlay = this.modal.querySelector(".search-popup-overlay");
    closeBtn.addEventListener("click", () => this.hide());
    overlay.addEventListener("click", () => this.hide());
    this.searchInput.addEventListener("input", (e) => {
      if (this.onSearch) this.onSearch(e.target.value);
    });
  }

  _handleKeydown(e) {
    if (e.key === "Escape") {
      this.hide();
    }
  }
}
