import { AlbumLibraryState } from "./AlbumLibraryState.js";
import { AlbumLibraryLoader } from "./AlbumLibraryLoader.js";
import { AlbumLibraryRenderer } from "./AlbumLibraryRenderer.js";
import { AlbumLibrarySearch } from "./AlbumLibrarySearch.js";
import { AlbumLibraryScroll } from "./AlbumLibraryScroll.js";
import { AlbumLibraryEvents } from "./AlbumLibraryEvents.js";
import { AlbumLibraryProgress } from "./AlbumLibraryProgress.js";

export class AlbumLibrary {
  constructor(musicApi, events) {
    this.api = musicApi;
    this.events = events;
    this.container = document.getElementById("albumsGrid");
    this.state = new AlbumLibraryState();
    this.loader = new AlbumLibraryLoader(this.api, this.state);
    this.renderer = new AlbumLibraryRenderer(
      this.container,
      this.events,
      this.state,
    );
    this.search = new AlbumLibrarySearch(this.state, this.renderer);
    this.scroll = new AlbumLibraryScroll(
      this.loader,
      this.renderer,
      this.state,
      () => this.search.refreshFilter(),
    );
    this.eventsHandler = new AlbumLibraryEvents(
      this.api,
      this.events,
      this.state,
      this.loader,
      this.renderer,
      () => this.refresh(),
    );
    this.progress = new AlbumLibraryProgress();
    this.isReady = false;
  }

  async init() {
    this.renderer.showLoading();
    await this.loader.loadArtistsAndFirstAlbums();
    this.state.indexTracks();
    this.renderer.renderAlbums();
    this.eventsHandler.bind();
    this.scroll.init();
    this.isReady = true;
  }

  getMetadataByPath(path) {
    return this.state.getMetadataByPath(path);
  }

  _showConfirmDialog() {
    return new Promise((resolve) => {
      const existingModal = document.querySelector(".refresh-confirm-modal");
      if (existingModal) existingModal.remove();
      const modal = document.createElement("div");
      modal.className = "refresh-confirm-modal";
      modal.innerHTML = `
        <div class="refresh-confirm-dialog">
          <div class="refresh-confirm-header">
            <i class="fas fa-sync-alt"></i>
            <h3>Обновление библиотеки</h3>
          </div>
          <div class="refresh-confirm-body">
            <div class="refresh-confirm-message">
              Это действие обновит список альбомов и композиций.<br>
              Процесс может занять некоторое время.
            </div>
            <div class="refresh-confirm-warning">
              <i class="fas fa-clock"></i>
              <span>Время обновления зависит от количества файлов в библиотеке</span>
            </div>
          </div>
          <div class="refresh-confirm-actions">
            <button class="refresh-confirm-btn refresh-confirm-cancel">
              <i class="fas fa-times"></i> Отмена
            </button>
            <button class="refresh-confirm-btn refresh-confirm-confirm">
              <i class="fas fa-check"></i> Начать
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      const closeModal = () => modal.remove();
      modal.querySelector(".refresh-confirm-cancel").onclick = () => {
        closeModal();
        resolve(false);
      };
      modal.querySelector(".refresh-confirm-confirm").onclick = () => {
        closeModal();
        resolve(true);
      };
      modal.onclick = (e) => {
        if (e.target === modal) {
          closeModal();
          resolve(false);
        }
      };
    });
  }

  async refresh() {
    const confirmed = await this._showConfirmDialog();
    if (!confirmed) return;
    this.progress.show("Обновление библиотеки", 0);
    this.progress.setCancelCallback(() => this.loader.cancel());
    this.renderer.clear();
    this.renderer.showLoading();
    const startTime = Date.now();
    try {
      this.progress.update(5, "Загрузка списка исполнителей...", 0, 0);
      await this.loader.refresh((status) => {
        this.progress.updateStatus(status);
      });
      this.progress.update(
        90,
        "Индексация треков...",
        this.state.albums.length,
        this.state.albums.length,
      );
      this.state.indexTracks();
      this.search.reset();
      this.renderer.renderAlbums();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.progress.update(
        100,
        `Готово! (${elapsed} сек.)`,
        this.state.albums.length,
        this.state.albums.length,
      );
      setTimeout(() => this.progress.hide(), 1500);
    } catch (error) {
      console.error("Refresh error:", error);
      this.progress.update(
        0,
        "Ошибка: " + (error.message || "Неизвестная ошибка"),
      );
      setTimeout(() => this.progress.hide(), 4000);
      throw error;
    } finally {
      this.progress.setCancelCallback(null);
    }
  }

  searchAlbums(term) {
    if (!this.isReady) return;
    if (term === "" || term === null || term === undefined) {
      this.search.reset();
    } else {
      this.search.search(term);
    }
  }

  destroy() {
    this.state.destroy();
    this.scroll.destroy();
    this.eventsHandler.unbind();
    this.renderer.clear();
    this.progress.destroy();
  }
}
