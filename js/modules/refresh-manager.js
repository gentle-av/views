"use strict";
class RefreshButtonManager {
  constructor() {
    this.lastRefreshTime = null;
    this.popup = null;
    this.button = document.getElementById("headerRefreshMetadataBtn");
    this.isRefreshing = false;
    if (this.button) {
      this.replaceClickListener();
    }
  }

  replaceClickListener() {
    if (!this.button) return;
    const newButton = this.button.cloneNode(true);
    if (this.button.parentNode) {
      this.button.parentNode.replaceChild(newButton, this.button);
    }
    this.button = newButton;
    this.button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.isRefreshing) {
        return;
      }
      this.handleRefreshClick();
    });
  }

  async handleRefreshClick() {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.showLastRefreshPopup();
    const baseUrl = `http://${window.location.hostname}:${window.location.port}`;
    try {
      const response = await fetch(`${baseUrl}/api/music/force-rescan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status === "success") {
        await this.pollRescanStatus();
      } else {
        this.closePopup();
        this.isRefreshing = false;
      }
    } catch (error) {
      this.closePopup();
      this.isRefreshing = false;
    }
  }

  async pollRescanStatus() {
    const baseUrl = `http://${window.location.hostname}:${window.location.port}`;
    const statusDiv = this.popup?.querySelector(".refresh-time-status");
    let isComplete = false;
    let pollCount = 0;
    while (!isComplete && pollCount < 120) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      pollCount++;
      try {
        const response = await fetch(`${baseUrl}/api/music/rescan-status`);
        const status = await response.json();
        if (status.status === "success") {
          if (status.in_progress) {
            const percent = Math.round(
              (status.processed_files / status.total_files) * 100,
            );
            if (statusDiv && status.total_files > 0) {
              statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Сканирование: ${status.processed_files}/${status.total_files} файлов (${percent}%)<br>`;
            } else if (statusDiv) {
              statusDiv.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Подсчет файлов...<br>Найдено: ${status.total_files}`;
            }
          } else {
            isComplete = true;
            this.showCompleteNotification(status);
            this.isRefreshing = false;
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }
    if (!isComplete) {
      Utils.showNotification("Превышено время ожидания сканирования", "error");
      this.closePopup();
      this.isRefreshing = false;
    }
  }

  showCompleteNotification(status) {
    const popupBody = this.popup?.querySelector(".refresh-time-popup-body");
    if (popupBody) {
      popupBody.innerHTML = `
        <div class="refresh-time-message">
          Обновление завершено!<br>
          Добавлено альбомов: ${status.new_albums_count}<br>
          Всего альбомов: ${status.new_albums_count}<br>
          Ошибок: ${status.error_count}
        </div>
      `;
    }
    setTimeout(() => this.closePopup(), 3000);
  }

  showLastRefreshPopup() {
    this.closePopup();
    if (window.MediaCenter && window.MediaCenter._showOverlay) {
      window.MediaCenter._showOverlay();
    }
    this.popup = document.createElement("div");
    this.popup.className = "refresh-time-popup";
    this.popup.innerHTML = `
    <div class="refresh-time-popup-content">
      <div class="refresh-time-popup-header">
        <i class="fas fa-sync-alt"></i>
        <span>Сканирование метаданных</span>
        <button class="refresh-time-popup-close">&times;</button>
      </div>
      <div class="refresh-time-popup-body">
        <div class="refresh-time-status" style="margin-top: 12px; font-size: 0.85rem; color: var(--yellow);">
          <i class="fas fa-spinner fa-spin"></i> Обновление базы данных...
        </div>
      </div>
    </div>
  `;
    document.body.appendChild(this.popup);
    const closeBtn = this.popup.querySelector(".refresh-time-popup-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.isRefreshing = false;
        this.closePopup();
      });
    }
    this.popup.addEventListener("click", (e) => {
      if (e.target === this.popup) {
        this.isRefreshing = false;
        this.closePopup();
      }
    });
  }

  closePopup() {
    if (this.popup && this.popup.parentNode) {
      this.popup.classList.add("closing");
      setTimeout(() => {
        if (this.popup && this.popup.parentNode) {
          this.popup.remove();
        }
        this.popup = null;
        if (window.MediaCenter && window.MediaCenter._hideOverlay) {
          window.MediaCenter._hideOverlay();
        }
      }, 200);
    } else {
      this.popup = null;
      if (window.MediaCenter && window.MediaCenter._hideOverlay) {
        window.MediaCenter._hideOverlay();
      }
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => new RefreshButtonManager(),
  );
} else {
  new RefreshButtonManager();
}
