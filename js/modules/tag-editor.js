const TagEditor = {
  getBaseUrl() {
    return `http://${window.location.hostname}:${window.location.port}`;
  },

  async updateTags(filePath, tags) {
    try {
      const payload = {
        path: filePath,
        ...tags,
      };
      console.log("[TagEditor] Updating tags:", payload);
      const response = await fetch(
        `${this.getBaseUrl()}/api/music/update-tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      console.log("[TagEditor] Update response:", data);
      if (data.status === "success") {
        return true;
      } else {
        console.error("[TagEditor] Update failed:", data.message);
        return false;
      }
    } catch (error) {
      console.error("[TagEditor] Error updating tags:", error);
      return false;
    }
  },

  async getTags(filePath) {
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/api/music/file-metadata?path=${encodeURIComponent(filePath)}`,
      );
      const data = await response.json();
      if (data.status === "success" && data.data) {
        const fileData = data.data.file;
        const dbData = data.data.database;
        return {
          title: fileData.title || dbData.title,
          artist: fileData.artist || dbData.artist,
          album: fileData.album || dbData.album,
          track: fileData.track || dbData.track,
          year: fileData.year || dbData.year,
          genre: fileData.genre || dbData.genre,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching tags:", error);
      return null;
    }
  },

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
            <input type="text" id="editAlbumTitle" value="${Utils.escapeHtml(album.title)}" placeholder="Название альбома">
          </div>
          <div class="tag-editor-field">
            <label>Исполнитель:</label>
            <input type="text" id="editAlbumArtist" value="${Utils.escapeHtml(album.artist)}" placeholder="Исполнитель">
          </div>
          <div class="tag-editor-field">
            <label>Год:</label>
            <input type="text" id="editAlbumYear" value="${album.year || ""}" placeholder="Год выпуска">
          </div>
          <div class="tag-editor-actions">
            <button class="tag-editor-save-all" data-action="save-all">Сохранить для всех треков</button>
            <button class="tag-editor-save" data-action="save">Сохранить только для альбома</button>
            <button class="tag-editor-cancel">Отмена</button>
          </div>
          <div class="tag-editor-note">
            <i class="fas fa-info-circle"></i>
            <span>"Сохранить для всех треков" — применит изменения ко всем композициям альбома</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const overlay = modal.querySelector(".tag-editor-overlay");
    const closeBtn = modal.querySelector(".tag-editor-close");
    const cancelBtn = modal.querySelector(".tag-editor-cancel");
    const saveBtn = modal.querySelector("[data-action='save']");
    const saveAllBtn = modal.querySelector("[data-action='save-all']");
    const closeModal = () => modal.remove();
    overlay.addEventListener("click", closeModal);
    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    saveBtn.addEventListener("click", async () => {
      const newTitle = document.getElementById("editAlbumTitle").value.trim();
      const newArtist = document.getElementById("editAlbumArtist").value.trim();
      const newYear = document.getElementById("editAlbumYear").value.trim();
      let successCount = 0;
      for (const track of album.tracks) {
        const tags = {};
        if (newTitle && newTitle !== album.title) tags.album = newTitle;
        if (newArtist && newArtist !== album.artist) tags.artist = newArtist;
        if (newYear && newYear !== album.year) tags.year = parseInt(newYear);
        if (Object.keys(tags).length > 0) {
          const result = await this.updateTags(track.path, tags);
          if (result) successCount++;
        }
      }
      if (successCount > 0) {
        Utils.showNotification(`Обновлено ${successCount} треков`, "success");
        setTimeout(() => location.reload(), 1000);
      } else {
        Utils.showNotification("Нет изменений для сохранения", "info");
      }
      closeModal();
    });
    saveAllBtn.addEventListener("click", async () => {
      const newTitle = document.getElementById("editAlbumTitle").value.trim();
      const newArtist = document.getElementById("editAlbumArtist").value.trim();
      const newYear = document.getElementById("editAlbumYear").value.trim();
      let successCount = 0;
      for (const track of album.tracks) {
        const tags = {};
        if (newTitle) tags.album = newTitle;
        if (newArtist) tags.artist = newArtist;
        if (newYear) tags.year = parseInt(newYear);
        const result = await this.updateTags(track.path, tags);
        if (result) successCount++;
      }
      if (successCount > 0) {
        Utils.showNotification(`Обновлено ${successCount} треков`, "success");
        setTimeout(() => location.reload(), 1000);
      } else {
        Utils.showNotification("Ошибка при сохранении", "error");
      }
      closeModal();
    });
  },

  showTrackTagEditor(track, album = null) {
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
            <input type="text" id="editTrackTitle" value="${Utils.escapeHtml(track.name)}" placeholder="Название трека">
          </div>
          <div class="tag-editor-field">
            <label>Исполнитель:</label>
            <input type="text" id="editTrackArtist" value="${album ? Utils.escapeHtml(album.artist) : ""}" placeholder="Исполнитель">
          </div>
          <div class="tag-editor-field">
            <label>Альбом:</label>
            <input type="text" id="editTrackAlbum" value="${album ? Utils.escapeHtml(album.title) : ""}" placeholder="Альбом">
          </div>
          <div class="tag-editor-field">
            <label>Номер трека:</label>
            <input type="number" id="editTrackNumber" value="${track.trackNumber || ""}" placeholder="Номер трека">
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
    const closeModal = () => modal.remove();
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
      if (newTitle && newTitle !== track.name) tags.title = newTitle;
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
        setTimeout(() => location.reload(), 1000);
      } else {
        Utils.showNotification("Ошибка при сохранении тегов", "error");
      }
      closeModal();
    });
  },
};
