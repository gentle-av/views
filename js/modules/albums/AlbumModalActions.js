// AlbumModalActions.js
export class AlbumModalActions {
  constructor(modal, events, musicApi, universalPlayer, onHide) {
    this.modal = modal;
    this.events = events;
    this.musicApi = musicApi;
    this.universalPlayer = universalPlayer;
    this.onHide = onHide;
  }

  render(album) {
    const modalBody = this.modal?.querySelector(".modal-body");
    const existingActions = modalBody?.querySelector(".modal-album-actions");
    if (existingActions) existingActions.remove();
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "modal-album-actions";
    const isMobile = window.innerWidth <= 768;
    let playBtnStyle, addBtnStyle, editBtnStyle;
    if (isMobile) {
      playBtnStyle = `width: calc(50% - 5px); flex: none; padding: 12px; background: var(--yellow); color: var(--bg0); border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;`;
      addBtnStyle = `width: calc(50% - 5px); flex: none; padding: 12px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;`;
      editBtnStyle = `width: 100%; flex: none; padding: 12px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease; margin-top: 0;`;
      actionsDiv.style.cssText = `display: flex; flex-direction: row; flex-wrap: wrap; gap: 10px; padding: 12px; border-bottom: 1px solid var(--bg3); background: var(--bg2);`;
    } else {
      playBtnStyle = `flex: 1; padding: 10px; background: var(--yellow); color: var(--bg0); border: none; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;`;
      addBtnStyle = `flex: 1; padding: 10px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;`;
      editBtnStyle = `flex: 0.5; padding: 10px; background: var(--bg2); color: var(--fg1); border: 1px solid var(--bg3); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s ease;`;
      actionsDiv.style.cssText = `display: flex; gap: 12px; padding: 16px; border-bottom: 1px solid var(--bg3); background: var(--bg2); flex-wrap: wrap;`;
    }
    actionsDiv.innerHTML = `
    <button class="modal-play-btn" style="${playBtnStyle}">
      <i class="fas fa-play"></i> Воспроизвести альбом
    </button>
    <button class="modal-add-btn" style="${addBtnStyle}">
      <i class="fas fa-plus"></i> Добавить в плейлист
    </button>
    <button class="modal-edit-album-btn" style="${editBtnStyle}">
      <i class="fas fa-pen"></i> Редактировать
    </button>
  `;
    modalBody?.insertBefore(actionsDiv, modalBody.firstChild);
    this._attachPlayButton(actionsDiv, album);
    this._attachAddButton(actionsDiv, album);
    this._attachEditAlbumButton(actionsDiv, album);
  }

  async _attachPlayButton(container, album) {
    const playBtn = container.querySelector(".modal-play-btn");
    if (!playBtn) return;
    playBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      let tracks = album.tracks || [];
      if (tracks.length === 0 && this.musicApi) {
        try {
          const tracksData = await this.musicApi.getTracks(
            album.title,
            album.artist,
            true,
          );
          tracks = tracksData;
          album.tracks = tracksData;
        } catch (error) {
          return;
        }
      }
      const trackPaths = tracks.map((track) => track.path);
      if (trackPaths.length === 0 || !this.universalPlayer) return;
      await this.universalPlayer.apiClient.post("/api/audio/setPlaylist", {
        tracks: trackPaths,
      });
      await this.universalPlayer.apiClient.post("/api/audio/play");
      if (this.universalPlayer && tracks[0]) {
        const firstTrack = tracks[0];
        const title =
          firstTrack.title ||
          firstTrack.name ||
          this._extractNameFromPath(firstTrack.path);
        const artist = firstTrack.artist || album.artist;
        const coverUrl =
          album.coverUrl ||
          (await this.musicApi?.fetchAlbumCover(album.title, album.artist));
        this.universalPlayer.core.setCurrentFile(firstTrack.path);
        this.universalPlayer.core.setMediaType("audio");
        this.universalPlayer.core.setPlaying(true);
        this.universalPlayer.uiUpdater.updateTrackFullInfo(
          title,
          artist,
          coverUrl,
        );
        this.universalPlayer.uiUpdater.updateTrackCount(0, tracks.length);
        this.universalPlayer.uiUpdater.updatePlayPauseButton(true);
        if (this.universalPlayer.polling) {
          this.universalPlayer.polling.stop();
          this.universalPlayer.polling.start();
        }
      }
      this.events.emit("playback:audioStart", trackPaths[0]);
      this.onHide();
    });
  }

  _attachAddButton(container, album) {
    const addBtn = container.querySelector(".modal-add-btn");
    if (!addBtn) return;
    addBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tracks = album.tracks || [];
      for (const track of tracks) {
        if (track.path) {
          fetch("/api/audio/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ track: track.path }),
          }).catch((err) => console.error("Failed to add track:", err));
        }
        this.events.emit("playlist:addTrack", {
          path: track.path,
          title:
            track.title || track.name || this._extractNameFromPath(track.path),
          artist: track.artist || album.artist,
          duration: track.duration || 0,
        });
      }
      this.onHide();
    });
  }

  _attachEditAlbumButton(container, album) {
    const editBtn = container.querySelector(".modal-edit-album-btn");
    if (!editBtn) return;
    editBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      let tracks = album.tracks || [];
      if (tracks.length === 0 && this.musicApi) {
        try {
          const tracksData = await this.musicApi.getTracks(
            album.title,
            album.artist,
            true,
          );
          tracks = tracksData;
          album.tracks = tracksData;
        } catch (error) {}
      }
      if (window.TagEditor && window.TagEditor.showAlbumTagEditor) {
        this.onHide();
        window.TagEditor.showAlbumTagEditor(album);
      } else {
        if (window.showNotification) {
          window.showNotification("Редактор тегов недоступен", "error");
        }
      }
    });
  }

  _extractNameFromPath(path) {
    if (!path) return "Без названия";
    const fileName = path.split("/").pop();
    return fileName.replace(/\.(flac|mp3|m4a|wav)$/i, "");
  }
}
