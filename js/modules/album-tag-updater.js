class AlbumTagUpdater {
  constructor() {
    this.serverUrl = `http://${window.location.hostname}:${window.location.port}`;
  }

  getServerUrl() {
    return this.serverUrl;
  }

  async updateAlbumTags(album, newArtist, newAlbum, newYear) {
    if (!album || !album.tracks || album.tracks.length === 0) {
      Utils.showNotification("Альбом не содержит треков", "error");
      return false;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const track of album.tracks) {
      const tags = {};

      if (newArtist && newArtist !== album.artist) {
        tags.artist = newArtist;
      }

      if (newAlbum && newAlbum !== album.title) {
        tags.album = newAlbum;
      }

      if (newYear && newYear !== album.year) {
        tags.year = parseInt(newYear);
      }

      if (Object.keys(tags).length === 0) {
        continue;
      }

      const success = await this.updateTrackTags(track.path, tags);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    if (successCount > 0) {
      Utils.showNotification(
        `Обновлено ${successCount} треков${errorCount > 0 ? `, ошибок: ${errorCount}` : ""}`,
        "success",
      );
      setTimeout(() => location.reload(), 1000);
      return true;
    } else {
      Utils.showNotification("Ошибка при обновлении тегов", "error");
      return false;
    }
  }

  async updateTrackTags(filePath, tags) {
    try {
      const payload = {
        path: filePath,
        ...tags,
      };

      const response = await fetch(
        `${this.getServerUrl()}/api/music/update-tags`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      return data.status === "success";
    } catch (error) {
      console.error("Error updating tags:", error);
      return false;
    }
  }

  async updateAlbumTagsFromForm(album) {
    const newArtist = prompt("Введите имя исполнителя:", album.artist);
    if (newArtist === null) return;

    const newAlbum = prompt("Введите название альбома:", album.title);
    if (newAlbum === null) return;

    const newYear = prompt("Введите год выпуска:", album.year || "");

    await this.updateAlbumTags(album, newArtist, newAlbum, newYear);
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
            <label>Исполнитель:</label>
            <input type="text" id="editAlbumArtist" value="${this.escapeHtml(album.artist)}" placeholder="Исполнитель">
          </div>
          <div class="tag-editor-field">
            <label>Альбом:</label>
            <input type="text" id="editAlbumTitle" value="${this.escapeHtml(album.title)}" placeholder="Название альбома">
          </div>
          <div class="tag-editor-field">
            <label>Год:</label>
            <input type="text" id="editAlbumYear" value="${album.year || ""}" placeholder="Год выпуска">
          </div>
          <div class="tag-editor-actions">
            <button class="tag-editor-save" data-action="save">Сохранить</button>
            <button class="tag-editor-cancel">Отмена</button>
          </div>
          <div class="tag-editor-note">
            <i class="fas fa-info-circle"></i>
            <span>Изменения применятся ко всем трекам альбома</span>
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
      const newArtist = document.getElementById("editAlbumArtist").value.trim();
      const newAlbum = document.getElementById("editAlbumTitle").value.trim();
      const newYear = document.getElementById("editAlbumYear").value.trim();

      if (!newArtist && !newAlbum && !newYear) {
        Utils.showNotification("Нет изменений для сохранения", "info");
        closeModal();
        return;
      }

      await this.updateAlbumTags(album, newArtist, newAlbum, newYear);
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

const AlbumTagUpdaterInstance = new AlbumTagUpdater();
