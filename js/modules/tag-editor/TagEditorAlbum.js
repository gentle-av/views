export class TagEditorAlbum {
  constructor(api, modal) {
    this.api = api;
    this.modal = modal;
  }

  async updateAlbumTags(album, newArtist, newAlbum, newYear) {
    if (!album || !album.tracks || album.tracks.length === 0) {
      return false;
    }
    let successCount = 0;
    for (const track of album.tracks) {
      const tags = {};
      if (newArtist && newArtist !== album.artist) tags.artist = newArtist;
      if (newAlbum && newAlbum !== album.title) tags.album = newAlbum;
      if (newYear && newYear !== album.year) tags.year = parseInt(newYear);
      if (Object.keys(tags).length === 0) continue;
      const success = await this.api.updateTags(track.path, tags);
      if (success) successCount++;
    }
    if (successCount > 0) {
      window.dispatchEvent(new CustomEvent("albumTagsUpdated"));
      return true;
    }
    return false;
  }

  showEditor(album) {
    const modal = this.modal.show(`
      <div class="tag-editor-overlay"></div>
      <div class="tag-editor-container">
        <div class="tag-editor-header">
          <h3>Редактирование тегов альбома</h3>
          <button class="tag-editor-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="tag-editor-content">
          <div class="tag-editor-field">
            <label>Альбом:</label>
            <input type="text" id="editAlbumTitle" value="${this.modal.escapeHtml(album.title)}" placeholder="Название альбома">
          </div>
          <div class="tag-editor-field">
            <label>Исполнитель:</label>
            <input type="text" id="editAlbumArtist" value="${this.modal.escapeHtml(album.artist)}" placeholder="Исполнитель">
          </div>
          <div class="tag-editor-field">
            <label>Год:</label>
            <input type="text" id="editAlbumYear" value="${album.year || ""}" placeholder="Год выпуска">
          </div>
          <div class="tag-editor-field-cover">
            <label>Обложка альбома:</label>
            <div class="cover-preview">
              <div id="currentCoverPreview" class="cover-preview-image">
                ${album.coverUrl ? `<img src="${album.coverUrl}">` : '<i class="fas fa-image"></i>'}
              </div>
              <button type="button" id="changeCoverBtn" class="change-cover-btn">
                <i class="fas fa-upload"></i> Выбрать обложку
              </button>
              <input type="file" id="coverFileInput" class="cover-file-input" accept="image/jpeg,image/png,image/gif,image/webp">
            </div>
          </div>
          <div class="tag-editor-actions">
            <button class="tag-editor-save-all" data-action="save-all">Применить</button>
            <button class="tag-editor-cancel">Отмена</button>
          </div>
        </div>
      </div>
    `);
    this.modal.bindCloseHandlers(modal);
    this._bindEvents(modal, album);
  }

  _showNotification(message, type = "info") {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
    }
  }

  _bindEvents(modal, album) {
    const saveAllBtn = modal.querySelector("[data-action='save-all']");
    const changeCoverBtn = modal.querySelector("#changeCoverBtn");
    const coverFileInput = modal.querySelector("#coverFileInput");
    const currentCoverPreview = modal.querySelector("#currentCoverPreview");
    saveAllBtn.addEventListener("click", async () => {
      const newTitle = document.getElementById("editAlbumTitle").value.trim();
      const newArtist = document.getElementById("editAlbumArtist").value.trim();
      const newYear = document.getElementById("editAlbumYear").value.trim();
      const success = await this.updateAlbumTags(
        album,
        newArtist,
        newTitle,
        newYear,
      );
      if (success) {
        this._showNotification("Теги альбома обновлены", "success");
      } else {
        this._showNotification("Нет изменений для сохранения", "info");
      }
      this.modal.hide();
    });
    if (changeCoverBtn && coverFileInput) {
      changeCoverBtn.addEventListener("click", () => coverFileInput.click());
      coverFileInput.addEventListener("change", async (e) => {
        if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const reader = new FileReader();
          reader.onload = (event) => {
            currentCoverPreview.innerHTML = `<img src="${event.target.result}">`;
          };
          reader.readAsDataURL(file);
          this._showNotification("Загрузка обложки...", "info");
          const { TagEditorCover } = await import("./TagEditorCover.js");
          const cover = new TagEditorCover(this.api, this.modal);
          const success = await cover.uploadAlbumArtForAlbum(album, file);
          if (success) {
            this._showNotification("Обложка обновлена", "success");
            album.coverUrl = URL.createObjectURL(file);
          } else {
            this._showNotification("Ошибка загрузки", "error");
          }
          coverFileInput.value = "";
        }
      });
    }
  }
}
