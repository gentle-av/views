class AlbumModal {
  constructor(events, musicApi = null) {
    this.events = events;
    this.musicApi = musicApi;
    this.modal = document.getElementById("albumModal");
    this.titleEl = document.getElementById("modalAlbumTitle");
    this.tracksContainer = document.getElementById("modalTracksList");
    this.trackList = null;
    this._currentAlbum = null;
    this._bindEvents();
  }

  setMusicApi(musicApi) {
    this.musicApi = musicApi;
  }

  setTrackList(trackList) {
    this.trackList = trackList;
  }

  _bindEvents() {
    this.events.on("album:open", async (album) => {
      await this.show(album);
    });
    if (this.modal) {
      const closeBtn = this.modal.querySelector(".modal-close");
      if (closeBtn) {
        closeBtn.onclick = () => this.hide();
      }
      this.modal.addEventListener("click", (e) => {
        if (e.target === this.modal) this.hide();
      });
    }
  }

  async show(album) {
    if (!this.modal || !album) return;
    this._renderHeader(album);
    this._renderActions(album);
    if (this.tracksContainer) {
      this.tracksContainer.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка треков...</div>';
    }
    if (album.tracks && album.tracks.length > 0) {
      if (this.trackList && this.tracksContainer) {
        this.trackList.render(this.tracksContainer, album);
      }
    } else if (this.musicApi) {
      try {
        const tracksData = await this.musicApi.getTracks(
          album.title,
          album.artist,
          true,
        );
        const coverUrl = await this.musicApi.fetchAlbumCover(
          album.title,
          album.artist,
        );
        const normalizedTracks = (tracksData || []).map((track, idx) => ({
          ...track,
          title:
            track.title || track.name || this._extractNameFromPath(track.path),
          displayName:
            track.title || track.name || this._extractNameFromPath(track.path),
          trackNumber: track.track || idx + 1,
        }));
        album.tracks = normalizedTracks;
        album.coverUrl = coverUrl;
        if (this.trackList && this.tracksContainer) {
          this.trackList.render(this.tracksContainer, album);
        }
      } catch (error) {
        console.error("Failed to load tracks:", error);
        if (this.tracksContainer) {
          this.tracksContainer.innerHTML =
            '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки треков</div>';
        }
      }
    } else {
      if (this.tracksContainer) {
        this.tracksContainer.innerHTML =
          '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Нет треков</div>';
      }
    }
    this.modal.classList.add("active");
    this._currentAlbum = album;
  }

  hide() {
    if (this.modal) {
      this.modal.classList.remove("active");
    }
  }

  _renderHeader(album) {
    if (!this.titleEl) return;
    this.titleEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <div style="width: 60px; height: 60px; border-radius: 8px; overflow: hidden; background: var(--bg2); display: flex; align-items: center; justify-content: center;">
          ${album.coverUrl ? `<img src="${album.coverUrl}" style="width: 100%; height: 100%; object-fit: cover;">` : '<i class="fas fa-music" style="font-size: 30px; color: var(--yellow);"></i>'}
        </div>
        <div style="flex: 1;">
          <div style="font-size: 1.1rem; font-weight: 600;">${this._escape(album.title)}</div>
          <div style="font-size: 0.85rem; color: var(--yellow);">${this._escape(album.artist)}</div>
          <div style="font-size: 0.75rem; color: var(--fg3);">${album.trackCount || (album.tracks ? album.tracks.length : 0)} треков</div>
        </div>
      </div>
    `;
  }

  _renderActions(album) {
    const modalBody = this.modal?.querySelector(".modal-body");
    const existingActions = modalBody?.querySelector(".modal-album-actions");
    if (existingActions) existingActions.remove();
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "modal-album-actions";
    actionsDiv.style.cssText =
      "display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid var(--bg3); background: var(--bg2); flex-wrap: wrap;";
    actionsDiv.innerHTML = `
      <button class="modal-play-btn" style="flex: 1; padding: 10px; background: var(--yellow); color: var(--bg0); border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
        <i class="fas fa-play"></i> Воспроизвести альбом
      </button>
      <button class="modal-add-btn" style="flex: 1; padding: 10px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
        <i class="fas fa-plus"></i> Добавить в плейлист
      </button>
      <button class="modal-edit-btn" style="flex: 1; padding: 10px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;">
        <i class="fas fa-edit"></i> Редактировать теги
      </button>
    `;
    modalBody?.insertBefore(actionsDiv, modalBody.firstChild);
    const playBtn = actionsDiv.querySelector(".modal-play-btn");
    const addBtn = actionsDiv.querySelector(".modal-add-btn");
    const editBtn = actionsDiv.querySelector(".modal-edit-btn");
    if (playBtn) {
      playBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.events.emit("album:play", album);
        this.hide();
      });
    }
    if (addBtn) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.events.emit("album:addToPlaylist", album);
        this.hide();
      });
    }
    if (editBtn) {
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.TagEditor) {
          window.TagEditor.showAlbumTagEditor(album);
        }
        this.hide();
      });
    }
  }

  _extractNameFromPath(path) {
    if (!path) return "Без названия";
    const fileName = path.split("/").pop();
    return fileName.replace(/\.(flac|mp3|m4a|wav)$/i, "");
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
