class ConfirmDialog {
  constructor() {
    this.modal = null;
  }

  show(message, onConfirm, onCancel) {
    if (window.MediaCenter && window.MediaCenter._showOverlay) {
      window.MediaCenter._showOverlay();
    }
    this.modal = document.createElement("div");
    this.modal.className = "confirm-modal";
    this.modal.innerHTML = `
    <div class="confirm-dialog">
      <div class="confirm-message">${this.escapeHtml(message)}</div>
      <div class="confirm-buttons">
        <button class="confirm-btn confirm-btn-cancel">Отмена</button>
        <button class="confirm-btn confirm-btn-confirm">Обновить</button>
      </div>
    </div>
  `;
    document.body.appendChild(this.modal);
    const cancelBtn = this.modal.querySelector(".confirm-btn-cancel");
    const confirmBtn = this.modal.querySelector(".confirm-btn-confirm");
    cancelBtn.onclick = () => {
      this.close();
      if (onCancel) onCancel();
    };
    confirmBtn.onclick = () => {
      this.close();
      if (onConfirm) onConfirm();
    };
    this.modal.onclick = (e) => {
      if (e.target === this.modal) {
        this.close();
        if (onCancel) onCancel();
      }
    };
  }

  close() {
    if (this.modal && this.modal.parentNode) {
      this.modal.classList.add("closing");
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
        if (window.MediaCenter && window.MediaCenter._hideOverlay) {
          window.MediaCenter._hideOverlay();
        }
      }, 200);
    }
    if (this.handlers && this.modal) {
      this.handlers = null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}
