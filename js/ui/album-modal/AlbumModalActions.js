// js/ui/album-modal/AlbumModalActions.js
export class AlbumModalActions {
  constructor(modal, events, musicApi, onHide) {
    this.modal = modal;
    this.events = events;
    this.musicApi = musicApi;
    this.onHide = onHide;
  }

  render(album) {
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
    `;
    modalBody?.insertBefore(actionsDiv, modalBody.firstChild);
    this._attachPlayButton(actionsDiv, album);
    this._attachAddButton(actionsDiv, album);
  }

  async _attachPlayButton(container, album) {
    const playBtn = container.querySelector(".modal-play-btn");
    if (!playBtn) return;
    playBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tracks = album.tracks || [];
      let trackPaths = [];
      if (tracks.length === 0 && this.musicApi) {
        try {
          const tracksData = await this.musicApi.getTracks(
            album.title,
            album.artist,
            true,
          );
          trackPaths = tracksData.map((track) => track.path);
        } catch (error) {
          console.error("Failed to load tracks:", error);
        }
      } else {
        trackPaths = tracks.map((track) => track.path);
      }
      if (trackPaths.length > 0) {
        if (this.musicApi && this.musicApi.playTracks) {
          await this.musicApi.playTracks(trackPaths);
        } else {
          this.events.emit("album:play", album);
        }
      }
      this.onHide();
    });
  }

  async _attachAddButton(container, album) {
    const addBtn = container.querySelector(".modal-add-btn");
    if (!addBtn) return;
    addBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const tracks = album.tracks || [];
      if (tracks.length === 0 && this.musicApi) {
        try {
          const tracksData = await this.musicApi.getTracks(
            album.title,
            album.artist,
            true,
          );
          tracks.push(...tracksData);
        } catch (error) {
          console.error("Failed to load tracks for playlist:", error);
        }
      }
      for (const track of tracks) {
        this.events.emit("playlist:addTrack", {
          path: track.path,
          title:
            track.title || track.name || this._extractNameFromPath(track.path),
          artist: track.artist || album.artist,
          duration: track.duration || 0,
        });
      }
      if (window.showNotification) {
        window.showNotification(
          `Добавлено ${tracks.length} треков в плейлист`,
          "success",
        );
      }
      this.onHide();
    });
  }

  _extractNameFromPath(path) {
    if (!path) return "Без названия";
    const fileName = path.split("/").pop();
    return fileName.replace(/\.(flac|mp3|m4a|wav)$/i, "");
  }
}
