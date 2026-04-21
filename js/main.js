const MediaCenter = {
  async init() {
    console.log("MediaCenter v2.0 initializing...");
    this.events = new EventBus();
    this.api = new ApiClient();
    this.playerApi = new PlayerApiClient();
    this.musicApi = new MusicApiClient();
    NavigationManager.init(this.events);
    this.events.on("page:videoLoaded", () => this._onVideoPageLoaded());
    this.events.on("page:audioLoaded", () => this._onAudioPageLoaded());
    await this.playerApi.checkAvailability();
    this.playback = new PlaybackController(this.playerApi, this.events);
    await this.playback.init();
    this.videoLibrary = null;
    this.albumLibrary = null;
    this.bottomPanel = new BottomPlayerPanel(this.playback, this.events);
    this.playlistPopup = null;
    this.videoPlayer = null;
    this._updateUIForPage("video");
    await NavigationManager.switchTo("video");
    console.log("MediaCenter v2.0 ready");
  },

  _updateUIForPage(page) {
    const mainContent = document.querySelector(".main-content");
    const audioPlayerBar = document.getElementById("audioPlayerBar");
    const headerPlaylistBtn = document.getElementById("headerPlaylistBtn");
    const headerRefreshMetadataBtn = document.getElementById(
      "headerRefreshMetadataBtn",
    );
    const globalSearchBox = document.getElementById("globalSearchBox");
    if (page === "audio") {
      mainContent.classList.add("audio-page");
      mainContent.classList.remove("video-page");
      if (audioPlayerBar) {
        audioPlayerBar.style.display = "flex";
      }
      if (headerPlaylistBtn) {
        headerPlaylistBtn.style.display = "flex";
      }
      if (headerRefreshMetadataBtn) {
        headerRefreshMetadataBtn.style.display = "flex";
      }
      if (globalSearchBox) {
        globalSearchBox.style.display = "flex";
      }
    } else {
      mainContent.classList.add("video-page");
      mainContent.classList.remove("audio-page");
      if (audioPlayerBar) {
        audioPlayerBar.style.display = "none";
      }
      if (headerPlaylistBtn) {
        headerPlaylistBtn.style.display = "none";
      }
      if (headerRefreshMetadataBtn) {
        headerRefreshMetadataBtn.style.display = "none";
      }
      if (globalSearchBox) {
        globalSearchBox.style.display = "none";
      }
    }
  },

  _onVideoPageLoaded() {
    console.log("Video page loaded, initializing VideoLibrary...");
    this._updateUIForPage("video");
    if (this.videoPlayer) {
      this.videoPlayer.hide();
      this.videoPlayer = null;
    }
    this.videoPlayer = new VideoPlayerController(this.api, this.events);
    if (this.videoLibrary) {
      this.videoLibrary.destroy();
      this.videoLibrary = null;
    }
    this.videoLibrary = new VideoLibrary(
      this.api,
      this.events,
      NavigationManager,
    );
    this.events.on("video:refresh", () => this.videoLibrary.refresh());
    this.events.on("playTrack", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    this.events.on("track:play", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    this.events.on("track:addAfterCurrent", ({ album, trackIndex }) => {
      this.playback.addTrackAfterCurrent(album, trackIndex);
      Utils.showNotification(`Трек добавлен после текущего`, "success");
    });
    this.events.on("track:editMetadata", ({ album, track, trackIndex }) => {
      if (window.TagEditor) {
        window.TagEditor.showTrackTagEditor(track, album);
      } else {
        Utils.showNotification("Редактор тегов временно недоступен", "error");
      }
    });
  },

  _onAudioPageLoaded() {
    console.log("Audio page loaded, initializing AlbumLibrary...");
    this._updateUIForPage("audio");
    if (this.albumModal) {
      this.albumModal.hide();
      this.albumModal = null;
    }
    this.albumModal = new AlbumModal(this.events);
    if (this.albumLibrary) {
      this.albumLibrary.destroy();
      this.albumLibrary = null;
    }
    this.albumLibrary = new AlbumLibrary(this.musicApi, this.events);
    this.albumLibrary.init();
    if (!this.playlistPopup) {
      this.playlistPopup = new PlaylistPopup(
        this.playback,
        this.events,
        this.albumLibrary,
      );
    } else {
      this.playlistPopup.albumLibrary = this.albumLibrary;
      this.playlistPopup.tracksCache.clear();
      this.playlistPopup.refresh();
    }
    const refreshMetadataBtn = document.getElementById(
      "headerRefreshMetadataBtn",
    );
    if (refreshMetadataBtn) {
      refreshMetadataBtn.onclick = async () => {
        refreshMetadataBtn.disabled = true;
        refreshMetadataBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i><span>Обновление...</span>';
        // Utils.showNotification("Обновление базы данных...", "info");
        try {
          const response = await fetch(
            `${this.api.baseUrl}/api/music/force-rescan`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            },
          );
          const data = await response.json();
          if (data.status === "success") {
            // Utils.showNotification(
            //   `Обновление завершено: добавлено ${data.added_files} файлов`,
            //   "success",
            // );
            setTimeout(() => location.reload(), 1500);
          } else {
            Utils.showNotification(`Ошибка: ${data.message}`, "error");
          }
        } catch (error) {
          Utils.showNotification(`Ошибка: ${error.message}`, "error");
        } finally {
          refreshMetadataBtn.disabled = false;
          refreshMetadataBtn.innerHTML =
            '<i class="fas fa-sync-alt"></i><span>Обновить</span>';
        }
      };
    }
    this.events.on("album:play", (album) => this.playback.playAlbum(album));
    this.events.on("album:addToPlaylist", async (album) => {
      await this.playback.addAlbumToPlaylist(album);
      Utils.showNotification(
        `Альбом "${album.title}" добавлен в плейлист`,
        "success",
      );
    });
    this.events.on("album:replacePlaylist", async (album) => {
      await this.playback.api.clearPlaylist();
      await this.playback.addAlbumToPlaylist(album);
      this.events.emit("playlistCleared");
      this.events.emit("playlistChanged");
      Utils.showNotification(`Плейлист заменен на "${album.title}"`, "success");
    });
    this.events.on("album:playTrack", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
      searchInput.value = "";
      searchInput.oninput = (e) => {
        if (this.albumLibrary) {
          this.albumLibrary.search(e.target.value);
        }
      };
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => MediaCenter.init());
} else {
  MediaCenter.init();
}
