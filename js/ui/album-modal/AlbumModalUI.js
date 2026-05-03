export class AlbumModalUI {
  constructor(modal) {
    this.modal = modal;
  }

  show() {
    if (this.modal) {
      this.modal.classList.add("active");
      if (window.MediaCenter && window.MediaCenter._showOverlay) {
        window.MediaCenter._showOverlay();
      }
    }
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove("active");
      this.modal.style.zIndex = "";
      if (window.MediaCenter && window.MediaCenter._hideOverlay) {
        window.MediaCenter._hideOverlay();
      }
    }
  }
}
