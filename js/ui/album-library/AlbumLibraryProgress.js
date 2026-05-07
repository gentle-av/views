export class AlbumLibraryProgress {
  constructor() {
    this.progressBar = null;
    this.progressText = null;
    this.progressContainer = null;
    this.detailsText = null;
    this.cancelCallback = null;
    this._createProgressElement();
  }

  _createProgressElement() {
    this._removeProgressElement();
    this.progressContainer = document.createElement("div");
    this.progressContainer.className = "album-library-progress";
    this.progressContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 380px;
      background: var(--bg1);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      z-index: 10000;
      border: 1px solid var(--bg3);
      transition: opacity 0.3s ease;
    `;
    const title = document.createElement("div");
    title.className = "album-library-progress-title";
    title.innerHTML =
      '<i class="fas fa-sync-alt fa-spin"></i> <span>Обновление библиотеки</span>';
    this.progressContainer.appendChild(title);
    const barContainer = document.createElement("div");
    barContainer.className = "album-library-progress-bar-container";
    barContainer.style.cssText = `background: var(--bg3); border-radius: 6px; height: 6px; overflow: hidden; margin-bottom: 8px;`;
    this.progressBar = document.createElement("div");
    this.progressBar.className = "album-library-progress-bar-fill";
    this.progressBar.style.cssText = `background: linear-gradient(90deg, var(--yellow) 0%, var(--orange) 100%); width: 0%; height: 100%; transition: width 0.3s ease; border-radius: 6px;`;
    barContainer.appendChild(this.progressBar);
    this.progressContainer.appendChild(barContainer);
    this.progressText = document.createElement("div");
    this.progressText.className = "album-library-progress-text";
    this.progressText.style.cssText = `font-size: 12px; color: var(--fg3); margin-bottom: 4px;`;
    this.progressContainer.appendChild(this.progressText);
    this.detailsText = document.createElement("div");
    this.detailsText.className = "album-library-progress-details";
    this.detailsText.style.cssText = `font-size: 11px; color: var(--fg4); margin-top: 4px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px;`;
    this.progressContainer.appendChild(this.detailsText);
    document.body.appendChild(this.progressContainer);
    this.hide();
  }

  show(title = "Обновление библиотеки", initialPercent = 0) {
    if (!this.progressContainer) return;
    const titleSpan = this.progressContainer.querySelector(
      ".album-library-progress-title span",
    );
    if (titleSpan) titleSpan.textContent = title;
    this.progressContainer.style.display = "block";
    this.progressContainer.style.opacity = "1";
    this.update(initialPercent, "Подготовка...");
  }

  update(percent, message = "", processed = 0, total = 0) {
    if (!this.progressContainer) return;
    const clampedPercent = Math.min(100, Math.max(0, percent));
    if (this.progressBar) this.progressBar.style.width = `${clampedPercent}%`;
    if (this.progressText) {
      this.progressText.innerHTML = message
        ? `<i class="fas fa-spinner fa-spin"></i> ${message}`
        : '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
    }
    if (this.detailsText) {
      let html = `<span class="album-library-progress-percent">${Math.round(clampedPercent)}%</span>`;
      if (processed > 0 || total > 0) {
        html += `<span><i class="fas fa-compact-disc"></i> ${processed}/${total}</span>`;
      }
      this.detailsText.innerHTML = html;
    }
  }

  updateStatus(status) {
    if (!this.progressContainer) return;
    const {
      inProgress,
      totalFiles,
      processedFiles,
      addedFiles,
      errorCount,
      percent,
      message,
    } = status;
    if (percent !== undefined && this.progressBar) {
      this.progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
    }
    if (this.progressText) {
      if (message) {
        this.progressText.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${message}`;
      } else if (inProgress !== undefined) {
        this.progressText.innerHTML = inProgress
          ? '<i class="fas fa-spinner fa-spin"></i> Сканирование файлов...'
          : '<i class="fas fa-check-circle"></i> Завершено';
      }
    }
    if (
      this.detailsText &&
      (totalFiles !== undefined || processedFiles !== undefined)
    ) {
      let html = `<span class="album-library-progress-percent">${Math.round(percent || 0)}%</span>`;
      if (processedFiles !== undefined && totalFiles !== undefined) {
        html += `<span><i class="fas fa-compact-disc"></i> ${processedFiles}/${totalFiles}</span>`;
        if (totalFiles - processedFiles > 0) {
          html += `<span><i class="fas fa-hourglass-half"></i> осталось: ${totalFiles - processedFiles}</span>`;
        }
      }
      if (addedFiles !== undefined && addedFiles > 0) {
        html += `<span><i class="fas fa-plus-circle"></i> +${addedFiles}</span>`;
      }
      if (errorCount !== undefined && errorCount > 0) {
        html += `<span class="album-library-progress-error"><i class="fas fa-exclamation-triangle"></i> ${errorCount}</span>`;
      }
      this.detailsText.innerHTML = html;
    }
  }

  setCancelCallback(callback) {
    this.cancelCallback = callback;
    if (
      callback &&
      !this.progressContainer.querySelector(
        ".album-library-progress-cancel-btn",
      )
    ) {
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "album-library-progress-cancel-btn";
      cancelBtn.innerHTML = '<i class="fas fa-times"></i> Отменить';
      cancelBtn.onclick = () => {
        if (this.cancelCallback) this.cancelCallback();
        this.hide();
      };
      this.progressContainer.appendChild(cancelBtn);
    } else if (!callback) {
      const existingBtn = this.progressContainer.querySelector(
        ".album-library-progress-cancel-btn",
      );
      if (existingBtn) existingBtn.remove();
    }
  }

  hide() {
    if (this.progressContainer) {
      this.progressContainer.style.opacity = "0";
      setTimeout(() => {
        if (this.progressContainer)
          this.progressContainer.style.display = "none";
      }, 300);
    }
  }

  _removeProgressElement() {
    if (this.progressContainer && this.progressContainer.parentNode) {
      this.progressContainer.parentNode.removeChild(this.progressContainer);
    }
  }

  destroy() {
    this._removeProgressElement();
    this.progressBar = null;
    this.progressText = null;
    this.progressContainer = null;
    this.detailsText = null;
    this.cancelCallback = null;
  }
}
