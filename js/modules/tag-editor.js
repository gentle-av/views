class TagEditor {
  constructor() {
    this.serverUrl = `http://${window.location.hostname}:${window.location.port}`;
  }

  getBaseUrl() {
    return this.serverUrl;
  }

  async updateTags(filePath, tags) {
    try {
      const payload = { path: filePath, ...tags };
      const response = await fetch(
        `${this.getBaseUrl()}/api/music/update-tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      console.error("[TagEditor] Error updating tags:", error);
      return false;
    }
  }

  async updateAlbumTags(album, newArtist, newAlbum, newYear) {
    if (!album || !album.tracks || album.tracks.length === 0) {
      Utils.showNotification("Альбом не содержит треков", "error");
      return false;
    }
    let successCount = 0;
    for (const track of album.tracks) {
      const tags = {};
      if (newArtist && newArtist !== album.artist) tags.artist = newArtist;
      if (newAlbum && newAlbum !== album.title) tags.album = newAlbum;
      if (newYear && newYear !== album.year) tags.year = parseInt(newYear);
      if (Object.keys(tags).length === 0) continue;
      const success = await this.updateTags(track.path, tags);
      if (success) successCount++;
    }
    if (successCount > 0) {
      Utils.showNotification(`Обновлено ${successCount} треков`, "success");
      window.dispatchEvent(new CustomEvent("albumTagsUpdated"));
      return true;
    } else {
      Utils.showNotification("Нет изменений для сохранения", "info");
      return false;
    }
  }

  showAlbumTagEditor(album) {
    const modal = document.createElement("div");
    modal.className = "tag-editor-modal";
    modal.innerHTML = `
      <div class="tag-editor-overlay"></div>
      <div class="tag-editor-container">
        <div class="tag-editor-header">
          <h3>Редактирование тегов альбома</h3>
          <button class="tag-editor-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="tag-editor-content">
          <div class="tag-editor-field">
            <label>Альбом:</label>
            <input type="text" id="editAlbumTitle" value="${this.escapeHtml(album.title)}" placeholder="Название альбома">
          </div>
          <div class="tag-editor-field">
            <label>Исполнитель:</label>
            <input type="text" id="editAlbumArtist" value="${this.escapeHtml(album.artist)}" placeholder="Исполнитель">
          </div>
          <div class="tag-editor-field">
            <label>Год:</label>
            <input type="text" id="editAlbumYear" value="${album.year || ""}" placeholder="Год выпуска">
          </div>
          <div class="tag-editor-actions">
            <button class="tag-editor-save-all" data-action="save-all">Применить</button>
            <button class="tag-editor-cancel">Отмена</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const overlay = modal.querySelector(".tag-editor-overlay");
    const closeBtn = modal.querySelector(".tag-editor-close");
    const cancelBtn = modal.querySelector(".tag-editor-cancel");
    const saveAllBtn = modal.querySelector("[data-action='save-all']");
    const closeModal = () => {
      modal.classList.add("closing");
      setTimeout(() => modal.remove(), 200);
    };
    overlay.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    saveAllBtn.addEventListener("click", async () => {
      const newTitle = document.getElementById("editAlbumTitle").value.trim();
      const newArtist = document.getElementById("editAlbumArtist").value.trim();
      const newYear = document.getElementById("editAlbumYear").value.trim();
      let successCount = 0;
      for (const track of album.tracks) {
        const tags = {};
        if (newTitle && newTitle !== album.title) tags.album = newTitle;
        if (newArtist && newArtist !== album.artist) tags.artist = newArtist;
        if (newYear && newYear !== album.year) tags.year = parseInt(newYear);
        if (Object.keys(tags).length === 0) continue;
        if (await this.updateTags(track.path, tags)) successCount++;
      }
      if (successCount > 0) {
        Utils.showNotification(`Обновлено ${successCount} треков`, "success");
        window.dispatchEvent(new CustomEvent("albumTagsUpdated"));
      } else {
        Utils.showNotification("Нет изменений для сохранения", "info");
      }
      closeModal();
    });
  }

  showTrackTagEditor(track, album = null) {
    const trackName =
      track.name ||
      track.title ||
      (track.path
        ? decodeURIComponent(track.path.split("/").pop()).replace(
            /\.(flac|mp3|m4a|wav)$/i,
            "",
          )
        : "Без названия");
    const modal = document.createElement("div");
    modal.className = "tag-editor-modal";
    modal.innerHTML = `
      <div class="tag-editor-overlay"></div>
      <div class="tag-editor-container">
        <div class="tag-editor-header">
          <h3>Редактирование тегов трека</h3>
          <button class="tag-editor-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="tag-editor-content">
          <div class="tag-editor-field">
            <label>Название трека:</label>
            <input type="text" id="editTrackTitle" value="${this.escapeHtml(trackName)}" placeholder="Название трека">
          </div>
          <div class="tag-editor-field">
            <label>Исполнитель:</label>
            <input type="text" id="editTrackArtist" value="${album ? this.escapeHtml(album.artist) : ""}" placeholder="Исполнитель">
          </div>
          <div class="tag-editor-field">
            <label>Альбом:</label>
            <input type="text" id="editTrackAlbum" value="${album ? this.escapeHtml(album.title) : ""}" placeholder="Альбом">
          </div>
          <div class="tag-editor-field">
            <label>Номер трека:</label>
            <input type="number" id="editTrackNumber" value="${track.trackNumber || track.number || ""}" placeholder="Номер трека">
          </div>
          <div class="tag-editor-field">
            <label>Год:</label>
            <input type="text" id="editTrackYear" value="${album ? album.year || "" : ""}" placeholder="Год выпуска">
          </div>
          <div class="tag-editor-actions">
            <button class="tag-editor-save" data-action="save">Сохранить</button>
            <button class="tag-editor-cancel">Отмена</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const overlay = modal.querySelector(".tag-editor-overlay");
    const closeBtn = modal.querySelector(".tag-editor-close");
    const cancelBtn = modal.querySelector(".tag-editor-cancel");
    const saveBtn = modal.querySelector("[data-action='save']");
    const closeModal = () => {
      modal.classList.add("closing");
      setTimeout(() => modal.remove(), 200);
    };
    overlay.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    saveBtn.addEventListener("click", async () => {
      const tags = {};
      const newTitle = document.getElementById("editTrackTitle").value.trim();
      const newArtist = document.getElementById("editTrackArtist").value.trim();
      const newAlbum = document.getElementById("editTrackAlbum").value.trim();
      const newTrackNumber = document
        .getElementById("editTrackNumber")
        .value.trim();
      const newYear = document.getElementById("editTrackYear").value.trim();
      if (newTitle && newTitle !== trackName) tags.title = newTitle;
      if (newArtist) tags.artist = newArtist;
      if (newAlbum) tags.album = newAlbum;
      if (newTrackNumber) tags.track = parseInt(newTrackNumber);
      if (newYear) tags.year = parseInt(newYear);
      if (Object.keys(tags).length === 0) {
        Utils.showNotification("Нет изменений для сохранения", "info");
        closeModal();
        return;
      }
      const success = await this.updateTags(track.path, tags);
      if (success) {
        Utils.showNotification("Теги трека обновлены", "success");
        window.dispatchEvent(new CustomEvent("albumTagsUpdated"));
      } else {
        Utils.showNotification("Ошибка при сохранении тегов", "error");
      }
      closeModal();
    });
  }

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}

const TagEditorInstance = new TagEditor();
window.TagEditor = TagEditorInstance;
