export class PlaylistPopupUI {
  constructor(headerBtnId, popupId, closeBtnId) {
    this.headerBtn = document.getElementById(headerBtnId);
    this.popup = document.getElementById(popupId);
    this.closeBtn = document.getElementById(closeBtnId);
    this.onOpen = null;
    this.onClose = null;
    this._init();
  }

  _init() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener("click", () => this.hide());
    }
    if (this.headerBtn) {
      this.headerBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      });
    }

    document.addEventListener("click", (e) => {
      if (
        this.isOpen() &&
        this.headerBtn &&
        !this.headerBtn.contains(e.target) &&
        this.popup &&
        !this.popup.contains(e.target)
      ) {
        this.hide();
      }
    });
  }

  toggle() {
    this.isOpen() ? this.hide() : this.show();
  }

  show() {
    if (this.popup) {
      document.body.appendChild(this.popup);
      this.popup.classList.add("open");
    }
    this._showOverlay();
    if (this.onOpen) this.onOpen();
  }

  hide() {
    if (this.popup) {
      this.popup.classList.remove("open");
    }
    this._hideOverlay();
    if (this.onClose) this.onClose();
  }

  isOpen() {
    return this.popup?.classList.contains("open") || false;
  }

  _showOverlay() {
    let overlay = document.querySelector(".overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "overlay";
      document.body.appendChild(overlay);
    }
    overlay.classList.add("active");
    overlay.style.display = "block";
  }

  _hideOverlay() {
    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.classList.remove("active");
      overlay.style.display = "none";
    }
  }
}
