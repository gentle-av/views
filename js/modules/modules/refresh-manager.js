"use strict";
class RefreshButtonManager {
    constructor() {
        this.lastRefreshTime = null;
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
    }
    async performRefresh() {
        const refreshBtn = this.button;
        if (!refreshBtn)
            return;
        const originalHtml = refreshBtn.innerHTML;
        refreshBtn.disabled = true;
        refreshBtn.innerHTML =
            '<i class="fas fa-spinner fa-spin"></i><span>Обновление...</span>';
        Utils.showNotification("Обновление базы данных...", "info");
        try {
            const baseUrl = `http://${window.location.hostname}:${window.location.port}`;
            const response = await fetch(`${baseUrl}/api/music/force-rescan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            if (data.status === "success") {
                Utils.showNotification(`Обновление завершено: добавлено ${data.added_files} файлов`, "success");
                setTimeout(() => location.reload(), 1500);
            }
            else {
                Utils.showNotification(`Ошибка: ${data.message}`, "error");
            }
        }
        catch (error) {
            const err = error;
            Utils.showNotification(`Ошибка: ${err.message}`, "error");
        }
        finally {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = originalHtml;
        }
    }
    showLastRefreshPopup() {
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
        this.showCustomPopup(message, dateStr);
        this.lastRefreshTime = now;
    }
    showCustomPopup(message, dateStr) {
        const existingPopup = document.querySelector(".refresh-time-popup");
        if (existingPopup) {
            existingPopup.remove();
        }
        const popup = document.createElement("div");
        popup.className = "refresh-time-popup";
        popup.innerHTML = `
            <div class="refresh-time-popup-content">
                <div class="refresh-time-popup-header">
                    <i class="fas fa-clock"></i>
                    <span>Время обновления</span>
                    <button class="refresh-time-popup-close">&times;</button>
                </div>
                <div class="refresh-time-popup-body">
                    <div class="refresh-time-date">${dateStr}</div>
                    <div class="refresh-time-message">${message.replace(/\n/g, "<br>")}</div>
                </div>
            </div>
        `;
        document.body.appendChild(popup);
        const closeBtn = popup.querySelector(".refresh-time-popup-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => popup.remove());
        }
        popup.addEventListener("click", (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
        setTimeout(() => {
            if (popup.parentNode) {
                popup.remove();
            }
        }, 5000);
    }
}
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => new RefreshButtonManager());
}
else {
    new RefreshButtonManager();
}
