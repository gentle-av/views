"use strict";
// ts/modules/refresh-manager.ts
class RefreshButtonManager {
    constructor() {
        this.lastRefreshTime = null;
        this.popup = null;
        this.button = document.getElementById("headerRefreshMetadataBtn");
        if (this.button) {
            this.replaceClickListener();
        }
    }
    replaceClickListener() {
        if (!this.button)
            return;
        const newButton = this.button.cloneNode(true);
        if (this.button.parentNode) {
            this.button.parentNode.replaceChild(newButton, this.button);
        }
        this.button = newButton;
        this.button.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleRefreshClick();
        });
    }
    async handleRefreshClick() {
        this.showLastRefreshPopup();
        await this.performRefresh();
        this.closePopup();
    }
    async performRefresh() {
        const refreshBtn = this.button;
        if (!refreshBtn)
            return;
        const originalHtml = refreshBtn.innerHTML;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i><span>Обновление...</span>';
        try {
            const baseUrl = `http://${window.location.hostname}:${window.location.port}`;
            const response = await fetch(`${baseUrl}/api/music/force-rescan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            if (data.status === "success") {
                Utils.showNotification(`Сканирование запущено в фоне. Страница обновится через 5 секунд...`, "success");
                setTimeout(() => location.reload(), 5000);
            }
            else {
                Utils.showNotification(`Ошибка: ${data.message}`, "error");
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = originalHtml;
            }
        }
        catch (error) {
            const err = error;
            Utils.showNotification(`Ошибка: ${err.message}`, "error");
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalHtml;
        }
    }
    showLastRefreshPopup() {
        this.closePopup();
        const now = new Date();
        const timeStr = now.toLocaleTimeString("ru-RU", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const dateStr = now.toLocaleDateString("ru-RU");
        const message = this.lastRefreshTime
            ? `Последнее обновление: ${this.lastRefreshTime.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}\nТекущее время: ${timeStr}`
            : `Обновление начато в ${timeStr}`;
        this.popup = document.createElement("div");
        this.popup.className = "refresh-time-popup";
        this.popup.innerHTML = `
            <div class="refresh-time-popup-content">
                <div class="refresh-time-popup-header">
                    <i class="fas fa-clock"></i>
                    <span>Время обновления</span>
                    <button class="refresh-time-popup-close">&times;</button>
                </div>
                <div class="refresh-time-popup-body">
                    <div class="refresh-time-date">${dateStr}</div>
                    <div class="refresh-time-message">${message.replace(/\n/g, "<br>")}</div>
                    <div class="refresh-time-status" style="margin-top: 12px; font-size: 0.85rem; color: var(--yellow);">
                        <i class="fas fa-spinner fa-spin"></i> Обновление базы данных...
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.popup);
        const closeBtn = this.popup.querySelector(".refresh-time-popup-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => this.closePopup());
        }
        this.popup.addEventListener("click", (e) => {
            if (e.target === this.popup) {
                this.closePopup();
            }
        });
        this.lastRefreshTime = now;
    }
    closePopup() {
        if (this.popup && this.popup.parentNode) {
            this.popup.remove();
        }
        this.popup = null;
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new RefreshButtonManager());
}
else {
    new RefreshButtonManager();
}
