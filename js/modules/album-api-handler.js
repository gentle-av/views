// album-api-handler.js
export class AlbumAPIHandler {
  constructor(library) {
    this.library = library;
  }

  async refreshDatabase() {
    let refreshBtn = document.querySelector(".refresh-btn");
    if (!refreshBtn) {
      const refreshBtnAlt = document.querySelector("#refreshBtn");
      const refreshBtnAlt2 = document.querySelector(".btn-refresh");
      const refreshBtnAlt3 = document.querySelector("button[title='Обновить']");
      const refreshBtnAlt4 = document
        .querySelector("button i.fa-sync-alt")
        ?.closest("button");
      refreshBtn =
        refreshBtnAlt || refreshBtnAlt2 || refreshBtnAlt3 || refreshBtnAlt4;
      if (!refreshBtn) return;
    }
    refreshBtn.classList.add("refreshing");
    refreshBtn.disabled = true;
    try {
      const grid = document.getElementById("albumsGrid");
      if (grid) {
        grid.innerHTML =
          '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Обновление базы данных...</div>';
      }
      const scanResponse = await fetch("/api/music/force-rescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!scanResponse.ok) {
        throw new Error(`HTTP ${scanResponse.status} при сканировании`);
      }
      const scanResult = await scanResponse.json();
      if (scanResult.status !== "success") {
        throw new Error(scanResult.message || "Ошибка при сканировании");
      }
      this.library.reset();
      this.library.initialized = true;
      const artistsResponse = await fetch("/api/music/artists", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const artistsData = await artistsResponse.json();
      if (artistsData.status === "success" && artistsData.artists) {
        this.library.artists = artistsData.artists;
        this.library.totalArtists = this.library.artists.length;
        this.library.loadedArtists = 0;
        this.library.albums = [];
        this.library.filteredAlbums = [];
        this.library.allTracks = [];
        await this.library.loadAlbumsSequentially();
        Utils.showNotification(
          `База данных обновлена: ${scanResult.updated_files || 0} файлов обновлено`,
          "success",
        );
      } else {
        throw new Error("Не удалось получить список артистов");
      }
    } catch (error) {
      console.error("[REFRESH] ОШИБКА:", error);
      Utils.showNotification(
        "Ошибка при обновлении базы данных: " + error.message,
        "error",
      );
      const grid = document.getElementById("albumsGrid");
      if (grid) {
        grid.innerHTML = `<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка: ${Utils.escapeHtml(error.message)}</div>`;
      }
    } finally {
      refreshBtn.classList.remove("refreshing");
      refreshBtn.disabled = false;
    }
  }
}
