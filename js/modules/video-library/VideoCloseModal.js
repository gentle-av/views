export class VideoCloseModal {
  constructor(events, api, universalPlayer = null) {
    this.events = events;
    this.api = api;
    this.universalPlayer = universalPlayer;
    this.modal = null;
    this.currentVideoPath = null;
    this.resolvePromise = null;
    this._bindEvents();
  }

  _bindEvents() {
    this.events.on("video:requestClose", (videoPath) => {
      this.show(videoPath);
    });
  }

  show(videoPath) {
    this.currentVideoPath = videoPath;
    this._createModal();
    this.modal.classList.add("active");
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  showWithCurrentVideo() {
    if (
      this.universalPlayer?.core?.currentFile &&
      this.universalPlayer.core.isVideo()
    ) {
      this.show(this.universalPlayer.core.currentFile);
    } else {
      Utils?.showNotification?.("Нет активного видео", "info");
    }
  }

  _createModal() {
    if (this.modal) {
      this.modal.remove();
    }
    this.modal = document.createElement("div");
    this.modal.className = "video-close-modal";
    this.modal.innerHTML = `
      <div class="video-close-modal-overlay"></div>
      <div class="video-close-modal-content">
        <div class="video-close-modal-header">
          <i class="fas fa-video"></i>
          <h3>Закрыть видео</h3>
        </div>
        <div class="video-close-modal-body">
          <p>Выберите действие для видео:</p>
          <div class="video-close-modal-path">${this._escapeHtml(this._getFileName(this.currentVideoPath))}</div>
        </div>
        <div class="video-close-modal-buttons">
          <button class="video-close-modal-btn close-only" id="videoCloseOnlyBtn">
            <i class="fas fa-stop"></i>
            <span>Только закрыть</span>
          </button>
          <button class="video-close-modal-btn close-delete" id="videoCloseDeleteBtn">
            <i class="fas fa-trash-alt"></i>
            <span>Закрыть и удалить</span>
          </button>
          <button class="video-close-modal-btn cancel" id="videoCloseCancelBtn">
            <i class="fas fa-times"></i>
            <span>Отмена</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(this.modal);
    this.modal
      .querySelector("#videoCloseOnlyBtn")
      .addEventListener("click", () => this._handleCloseOnly());
    this.modal
      .querySelector("#videoCloseDeleteBtn")
      .addEventListener("click", () => this._handleCloseDelete());
    this.modal
      .querySelector("#videoCloseCancelBtn")
      .addEventListener("click", () => this.hide());
    this.modal
      .querySelector(".video-close-modal-overlay")
      .addEventListener("click", () => this.hide());
    this._handleKeyPress = (e) => {
      if (e.key === "Escape") this.hide();
    };
    document.addEventListener("keydown", this._handleKeyPress);
  }

  _getFileName(filePath) {
    if (!filePath) return "Неизвестный файл";
    return filePath.split("/").pop();
  }

  async _handleCloseOnly() {
    const videoPath = this.currentVideoPath;
    this.hide();
    this.events.emit("video:closed", videoPath);
    if (this.resolvePromise)
      this.resolvePromise({ action: "close", path: videoPath });
    try {
      await this.api.post("/api/video/close");
      this._clearPlayerState();
      Utils?.showNotification?.("Видео закрыто", "info");
    } catch (error) {
      Utils?.showNotification?.("Ошибка закрытия видео", "error");
    }
  }

  async _handleCloseDelete() {
    const videoPath = this.currentVideoPath;
    this.hide();
    this.events.emit("video:deleted", videoPath);
    if (this.resolvePromise)
      this.resolvePromise({ action: "delete", path: videoPath });
    try {
      await this.api.post("/api/video/close");
      const deleteResponse = await this.api.post("/api/trash", {
        path: videoPath,
      });
      if (deleteResponse?.success) {
        Utils?.showNotification?.(
          `Видео "${this._getFileName(videoPath)}" удалено`,
          "success",
        );
        this.events.emit("video:refresh");
      } else {
        Utils?.showNotification?.(
          deleteResponse?.error || "Ошибка удаления видео",
          "error",
        );
      }
    } catch (error) {
      Utils?.showNotification?.("Ошибка при закрытии/удалении видео", "error");
    }
  }

  _clearPlayerState() {
    this.events.emit("player:clearState");
    if (this.universalPlayer) {
      this.universalPlayer.core?.reset();
      this.universalPlayer.progress?.reset();
      this.universalPlayer.uiUpdater?.reset();
      this.universalPlayer.hide();
    }
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove("active");
      setTimeout(() => {
        if (this.modal?.parentNode) this.modal.remove();
        this.modal = null;
      }, 200);
    }
    if (this._handleKeyPress) {
      document.removeEventListener("keydown", this._handleKeyPress);
      this._handleKeyPress = null;
    }
    if (this.resolvePromise) {
      this.resolvePromise({ action: "cancelled", path: null });
      this.resolvePromise = null;
    }
    this.currentVideoPath = null;
  }

  _escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  destroy() {
    this.hide();
    this.events.off("video:requestClose");
  }
}
