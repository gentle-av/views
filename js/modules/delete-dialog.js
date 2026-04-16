class CustomDeleteDialog {
  constructor() {
    this.modal = null;
    this.resolveCallback = null;
  }

  showConfirm(fileName) {
    return new Promise((resolve) => {
      this.resolveCallback = resolve;
      this.createModal(fileName);
      this.attachEvents();
    });
  }

  createModal(fileName) {
    this.close();
    this.modal = document.createElement("div");
    this.modal.className = "custom-delete-modal";
    this.modal.innerHTML = `
      <div class="custom-delete-dialog">
        <div class="custom-delete-header">
          <i class="fas fa-trash-alt"></i>
          <h3>Удаление файла</h3>
        </div>
        <div class="custom-delete-body">
          <div class="custom-delete-message">
            Вы уверены, что хотите удалить этот файл?
          </div>
          <div class="custom-delete-filename" title="${this.escapeHtml(fileName)}">
            <i class="fas fa-file-video" style="margin-right: 8px;"></i>
            ${this.escapeHtml(fileName)}
          </div>
          <div class="custom-delete-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Файл будет перемещен в корзину</span>
          </div>
        </div>
        <div class="custom-delete-actions">
          <button class="custom-delete-btn custom-delete-btn-cancel">
            <i class="fas fa-times"></i>
            <span>Отмена</span>
          </button>
          <button class="custom-delete-btn custom-delete-btn-delete">
            <i class="fas fa-trash-alt"></i>
            <span>Удалить</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
    setTimeout(() => {
      if (this.modal) {
        this.modal.style.opacity = "1";
      }
    }, 10);
  }

  attachEvents() {
    if (!this.modal) return;
    const cancelBtn = this.modal.querySelector(".custom-delete-btn-cancel");
    const deleteBtn = this.modal.querySelector(".custom-delete-btn-delete");
    const overlay = this.modal;
    const handleCancel = () => {
      if (this.resolveCallback) {
        this.resolveCallback(false);
      }
      this.close();
    };
    const handleDelete = () => {
      if (this.resolveCallback) {
        this.resolveCallback(true);
      }
      this.close();
    };
    const handleOverlayClick = (e) => {
      if (e.target === overlay) {
        handleCancel();
      }
    };
    const handleKeydown = (e) => {
      if (e.key === "Escape") {
        handleCancel();
        document.removeEventListener("keydown", handleKeydown);
      }
    };
    cancelBtn.addEventListener("click", handleCancel);
    deleteBtn.addEventListener("click", handleDelete);
    overlay.addEventListener("click", handleOverlayClick);
    document.addEventListener("keydown", handleKeydown);
    this.handlers = {
      handleCancel,
      handleDelete,
      handleOverlayClick,
      handleKeydown,
    };
  }

  close() {
    if (this.modal && this.modal.parentNode) {
      this.modal.style.opacity = "0";
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
      }, 150);
    }
    if (this.handlers && this.modal) {
      this.handlers = null;
    }
  }

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

const CustomDeleteDialogInstance = new CustomDeleteDialog();
