export class VideoCloseModal {
  constructor(events, api, universalPlayer = null) {
    this.events = events;
    this.api = api;
    this.universalPlayer = universalPlayer;
    this.modal = null;
    this.currentVideoPath = null;
    this.resolvePromise = null;
    this.bindEvents();
  }

  bindEvents() {
    this.events.on("video:close", (videoPath) => {
      this.show(videoPath);
    });
  }

  show(videoPath) {
    this.currentVideoPath = videoPath;
    this.createModal();
    this.modal.classList.add("active");
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  createModal() {
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
          <div class="video-close-modal-path">${this.escapeHtml(this.getFileName(this.currentVideoPath))}</div>
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
    const closeOnlyBtn = this.modal.querySelector("#videoCloseOnlyBtn");
    const closeDeleteBtn = this.modal.querySelector("#videoCloseDeleteBtn");
    const cancelBtn = this.modal.querySelector("#videoCloseCancelBtn");
    const overlay = this.modal.querySelector(".video-close-modal-overlay");
    closeOnlyBtn.addEventListener("click", () => this.handleCloseOnly());
    closeDeleteBtn.addEventListener("click", () => this.handleCloseDelete());
    cancelBtn.addEventListener("click", () => this.hide());
    overlay.addEventListener("click", () => this.hide());
    this.handleKeyPress = (e) => {
      if (e.key === "Escape") {
        this.hide();
      }
    };
    document.addEventListener("keydown", this.handleKeyPress);
  }

  getFileName(filePath) {
    if (!filePath) return "Неизвестный файл";
    const parts = filePath.split("/");
    return parts[parts.length - 1];
  }

  async handleCloseOnly() {
    const videoPath = this.currentVideoPath;
    this.hide();
    this.events.emit("video:closeOnly", videoPath);
    if (this.resolvePromise) {
      this.resolvePromise({ action: "close", path: videoPath });
    }
    try {
      await this.api.post("/api/video/close");
      this.clearPlayerState();
      if (typeof Utils !== "undefined" && Utils.showNotification) {
        Utils.showNotification("Видео закрыто", "info");
      }
    } catch (error) {
      console.error("[VideoCloseModal] Error closing video:", error);
      if (typeof Utils !== "undefined" && Utils.showNotification) {
        Utils.showNotification("Ошибка закрытия видео", "error");
      }
    }
  }

  async handleCloseDelete() {
    const videoPath = this.currentVideoPath;
    this.hide();
    this.events.emit("video:closeAndDelete", videoPath);
    if (this.resolvePromise) {
      this.resolvePromise({ action: "delete", path: videoPath });
    }
    try {
      await this.api.post("/api/video/close");
      this.clearPlayerState();
      const deleteResponse = await this.api.post("/api/trash", {
        path: videoPath,
      });
      if (deleteResponse && deleteResponse.success) {
        if (typeof Utils !== "undefined" && Utils.showNotification) {
          Utils.showNotification(
            `Видео "${this.getFileName(videoPath)}" удалено`,
            "success",
          );
        }
        this.events.emit("video:refresh");
      } else {
        console.error(
          "[VideoCloseModal] Delete failed:",
          deleteResponse?.error,
        );
        if (typeof Utils !== "undefined" && Utils.showNotification) {
          Utils.showNotification(
            deleteResponse?.error || "Ошибка удаления видео",
            "error",
          );
        }
      }
    } catch (error) {
      console.error("[VideoCloseModal] Error closing/deleting video:", error);
      if (typeof Utils !== "undefined" && Utils.showNotification) {
        Utils.showNotification("Ошибка при закрытии/удалении видео", "error");
      }
    }
  }

  clearPlayerState() {
    this.events.emit("player:clearState");
    if (this.universalPlayer) {
      this.universalPlayer.core.reset();
      this.universalPlayer.progress.reset();
      this.universalPlayer.uiUpdater.reset();
      this.universalPlayer.polling.stop();
      this.universalPlayer.hide();
    }
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove("active");
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.remove();
          this.modal = null;
        }
      }, 200);
    }
    if (this.handleKeyPress) {
      document.removeEventListener("keydown", this.handleKeyPress);
    }
    if (this.resolvePromise) {
      this.resolvePromise({ action: "cancelled", path: null });
      this.resolvePromise = null;
    }
    this.currentVideoPath = null;
  }

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  destroy() {
    this.hide();
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }
}
