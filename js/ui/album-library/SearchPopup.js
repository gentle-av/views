export class SearchPopup {
  constructor(onSearch, onClear, getCurrentTerm) {
    this.onSearch = onSearch;
    this.onClear = onClear;
    this.getCurrentTerm = getCurrentTerm;
    this.isOpen = false;
    this.modal = null;
    this.searchInput = null;
    this._shouldClearOnClose = false;
    this._isHiding = false;
    this._boundHandleKeydown = this._handleKeydown.bind(this);
  }

  show() {
    if (this.isOpen) {
      return;
    }
    this._shouldClearOnClose = false;
    this._isHiding = false;
    this._createModal();
    this.isOpen = true;
    document.addEventListener("keydown", this._boundHandleKeydown);
    const currentTerm = this.getCurrentTerm ? this.getCurrentTerm() : "";
    if (this.searchInput) {
      this.searchInput.value = currentTerm;
      this.searchInput.focus();
      if (currentTerm) {
        this.searchInput.setSelectionRange(
          currentTerm.length,
          currentTerm.length,
        );
      }
    }
  }

  hide() {
    if (this._isHiding || !this.isOpen) {
      return;
    }
    this._isHiding = true;
    if (this._shouldClearOnClose && this.onClear) {
      this.onClear();
    } else if (this.searchInput && this.onSearch) {
      this.onSearch(this.searchInput.value);
    }
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
    this._shouldClearOnClose = false;
    setTimeout(() => {
      this._isHiding = false;
    }, 300);
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
          <div class="search-hint">
            <i class="fas fa-arrow-left"></i>
            <span>Enter - применить и закрыть</span>
          </div>
          <div class="search-hint">
            <i class="fas fa-times"></i>
            <span>Esc - очистить и закрыть</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
    this.searchInput = this.modal.querySelector(".search-popup-input");
    const closeBtn = this.modal.querySelector(".search-popup-close");
    const overlay = this.modal.querySelector(".search-popup-overlay");
    closeBtn.addEventListener("click", () => {
      this._shouldClearOnClose = true;
      this.hide();
    });
    overlay.addEventListener("click", () => {
      this._shouldClearOnClose = false;
      this.hide();
    });
    this.searchInput.addEventListener("input", (e) => {
      if (this.onSearch) {
        this.onSearch(e.target.value);
      }
    });
    this.searchInput.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        this._shouldClearOnClose = false;
        this.hide();
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        this._shouldClearOnClose = true;
        this.hide();
      }
    });
  }

  _handleKeydown(e) {
    if (e.key === "Escape" && this.isOpen && !this._isHiding) {
      e.preventDefault();
      e.stopPropagation();
      this._shouldClearOnClose = true;
      this.hide();
    }
  }
}
