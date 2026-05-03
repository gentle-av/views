export class AlbumModalEvents {
  constructor(modal, onShow) {
    this.modal = modal;
    this.onShow = onShow;
  }

  bind(events) {
    events.on("album:open", async (album) => {
      await this.onShow(album);
    });
    this._bindModalClose();
  }

  _bindModalClose() {
    if (!this.modal) return;
    const closeBtn = this.modal.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => this.hide();
    }
    this.modal.addEventListener("click", (e) => {
      if (e.target === this.modal) this.hide();
    });
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove("active");
      if (window.MediaCenter && window.MediaCenter._hideOverlay) {
        window.MediaCenter._hideOverlay();
      }
    }
  }
}
