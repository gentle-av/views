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
    this.showProgressDialog();
    const baseUrl = `http://${window.location.hostname}:${window.location.port}`;
    try {
      const response = await fetch(`${baseUrl}/api/music/force-rescan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status === "success") {
        await this.pollRescanStatus();
      } else if (data.in_progress) {
        this.updateProgressDialog(data.total_files, data.processed_files);
        await this.pollRescanStatus();
      } else {
        this.closePopup();
        this.isRefreshing = false;
        Utils.showNotification("Ошибка запуска сканирования", "error");
      }
    } catch (error) {
      this.closePopup();
      this.isRefreshing = false;
      Utils.showNotification("Ошибка: " + error.message, "error");
    }
  }

  async pollRescanStatus() {
    const baseUrl = `http://${window.location.hostname}:${window.location.port}`;
    let isComplete = false;
    let pollCount = 0;
    const maxPolls = 3600;
    while (!isComplete && pollCount < maxPolls && this.isRefreshing) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      pollCount++;
      try {
        const response = await fetch(`${baseUrl}/api/music/rescan-status`);
        const status = await response.json();
        if (status.status === "success") {
          if (status.in_progress) {
            this.updateProgressDialog(
              status.total_files,
              status.processed_files,
              status.percent,
            );
          } else {
            isComplete = true;
            this.showCompleteDialog(status);
            if (window.MediaCenter && window.MediaCenter.albumLibrary) {
              await window.MediaCenter.albumLibrary.loader.refresh();
              window.MediaCenter.albumLibrary.state.indexTracks();
              window.MediaCenter.albumLibrary.renderer.renderAlbums();
              window.MediaCenter.albumLibrary.search.reset();
            }
            this.isRefreshing = false;
          }
        }
      } catch (error) {}
    }
    if (!isComplete && this.isRefreshing) {
      Utils.showNotification("Превышено время ожидания сканирования", "error");
      this.closePopup();
      this.isRefreshing = false;
    }
  }

  showProgressDialog() {
    this.closePopup();
    if (window.MediaCenter && window.MediaCenter._showOverlay) {
      window.MediaCenter._showOverlay();
    }
    this.popup = document.createElement("div");
    this.popup.className = "refresh-time-popup";
    this.popup.innerHTML = `
    <div class="refresh-time-popup-content" style="width: 450px;">
      <div class="refresh-time-popup-header">
        <i class="fas fa-sync-alt"></i>
        <span>Сканирование музыкальной библиотеки</span>
        <button class="refresh-time-popup-close">&times;</button>
      </div>
      <div class="refresh-time-popup-body">
        <div class="progress-stats" style="margin-bottom: 16px;">
          <div class="progress-files-count" style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 0.9rem;">
            <span><i class="fas fa-file-audio"></i> Файлы: <span id="progressProcessed">0</span> / <span id="progressTotal">?</span></span>
            <span><i class="fas fa-percent"></i> <span id="progressPercent">0</span>%</span>
          </div>
          <div class="progress-bar-container" style="background: var(--bg3); border-radius: 8px; height: 24px; overflow: hidden;">
            <div id="progressBarFill" class="progress-bar-fill" style="background: linear-gradient(90deg, var(--yellow), var(--orange)); width: 0%; height: 100%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: var(--bg1); font-size: 0.75rem; font-weight: bold;"></div>
          </div>
        </div>
        <div class="progress-details" style="font-size: 0.8rem; color: var(--fg3);">
          <div><i class="fas fa-compact-disc"></i> Добавлено альбомов: <span id="progressNewAlbums">0</span></div>
          <div><i class="fas fa-exclamation-triangle"></i> Ошибок: <span id="progressErrors">0</span></div>
        </div>
        <div class="refresh-time-status" style="margin-top: 12px; font-size: 0.85rem; color: var(--yellow);">
          <span id="progressMessage">Подготовка к сканированию...</span>
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

  updateProgressDialog(total, processed, percent) {
    if (!this.popup) return;
    const processedSpan = this.popup.querySelector("#progressProcessed");
    const totalSpan = this.popup.querySelector("#progressTotal");
    const percentSpan = this.popup.querySelector("#progressPercent");
    const progressBar = this.popup.querySelector("#progressBarFill");
    const messageSpan = this.popup.querySelector("#progressMessage");
    if (processedSpan) processedSpan.textContent = processed || 0;
    if (totalSpan) totalSpan.textContent = total || "?";
    const displayPercent =
      percent !== undefined
        ? percent
        : total > 0
          ? Math.round((processed / total) * 100)
          : 0;
    if (percentSpan) percentSpan.textContent = displayPercent;
    if (progressBar) {
      progressBar.style.width = `${displayPercent}%`;
      if (displayPercent > 10) {
        progressBar.textContent = `${displayPercent}%`;
      } else {
        progressBar.textContent = "";
      }
    }
    if (messageSpan) {
      if (total === 0) {
        messageSpan.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Подсчет файлов...';
      } else {
        messageSpan.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Сканирование: ${processed} из ${total} файлов`;
      }
    }
  }

  showCompleteDialog(status) {
    if (!this.popup) return;
    const popupBody = this.popup.querySelector(".refresh-time-popup-body");
    if (popupBody) {
      popupBody.innerHTML = `
        <div class="refresh-time-message" style="text-align: center; padding: 20px;">
          <i class="fas fa-check-circle" style="font-size: 48px; color: var(--green); margin-bottom: 16px;"></i>
          <h3 style="margin-bottom: 16px;">Сканирование завершено!</h3>
          <div style="text-align: left; background: var(--bg2); padding: 12px; border-radius: 8px; margin-top: 12px;">
            <div><i class="fas fa-compact-disc"></i> Добавлено альбомов: ${status.new_albums_count || 0}</div>
            <div><i class="fas fa-music"></i> Всего альбомов: ${status.new_albums_count || 0}</div>
            <div><i class="fas fa-exclamation-triangle"></i> Ошибок: ${status.error_count || 0}</div>
            <div><i class="fas fa-file-audio"></i> Обработано файлов: ${status.processed_files || 0}</div>
          </div>
        </div>
      `;
    }
    setTimeout(() => this.closePopup(), 4000);
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
