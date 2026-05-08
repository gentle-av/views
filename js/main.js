import { UniversalPlayer } from "./ui/universal-player.js";
import { PlaybackController } from "./core/playback-controller/PlaybackController.js";
import { VideoLibrary } from "./modules/video-library/VideoLibrary.js";
import { AlbumLibrary } from "./ui/album-library/AlbumLibrary.js";
import { AlbumModal } from "./ui/album-modal.js";
import { initPowerManagement } from "./modules/power-management/index.js";
import { PlayerAPI } from "./ui/universal-player/PlayerApi.js";

const MediaCenter = {
  async init() {
    this._lastPlayPath = null;
    this._lastPlayTime = 0;
    window.addEventListener("beforeunload", () => {
      if (this.videoLibrary) {
        this.videoLibrary.destroy();
      }
      if (this.universalPlayer) {
        this.universalPlayer.destroy();
      }
    });
    this.events = new EventBus();
    this.api = new ApiClient();
    this.playerApi = new PlayerApiClient();
    this.musicApi = new MusicApiClient();
    if (this.musicApi && !this.musicApi.openMusium) {
      this.musicApi.openMusium = async (tracks) => {
        try {
          const response = await fetch("/api/music/open", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tracks }),
          });
          const data = await response.json();
          return data;
        } catch (error) {
          console.error("[MusicAPI] openMusium error:", error);
        }
      };
    }
    NavigationManager.init(this.events);
    this.events.on("page:videoLoaded", () => this._onVideoPageLoaded());
    this.events.on("page:audioLoaded", () => this._onAudioPageLoaded());
    this.events.on("page:powerLoaded", () => this._onPowerPageLoaded());
    await this.playerApi.checkAvailability();
    this.playback = new PlaybackController(this.playerApi, this.events);
    await this.playback.init();
    const playerAPI = new PlayerAPI(this.api, this.musicApi, this.playerApi);
    this.universalPlayer = new UniversalPlayer(
      playerAPI,
      this.events,
      this.musicApi,
      this.playerApi,
      this.api,
    );
    this.events.on("player:show", () => {
      if (this.universalPlayer) {
        this.universalPlayer.show();
      }
    });
    window.universalPlayerInstance = this.universalPlayer;
    this.videoLibrary = null;
    this.albumLibrary = null;
    this.albumModal = null;
    this.playlistPopup = null;
    this.bottomPlayerPanel = null;
    this._updateUIForPage("video");
    await NavigationManager.switchTo("video");
    window.MediaCenter = this;
  },

  _onVideoPageLoaded() {
    this._updateUIForPage("video");
    if (this.videoLibrary) {
      this.videoLibrary.destroy();
      this.videoLibrary = null;
    }
    setTimeout(() => {
      this.videoLibrary = new VideoLibrary(
        this.api,
        this.events,
        NavigationManager,
        this.universalPlayer,
      );
      this.events.on("video:refresh", () => {
        if (this.videoLibrary) this.videoLibrary.refresh();
      });
      this.events.on("player:clearState", () => {
        if (this.universalPlayer) {
          this.universalPlayer.clearState();
        } else {
          console.warn("[MediaCenter] universalPlayer is null");
        }
      });
      setTimeout(async () => {
        if (
          this.universalPlayer &&
          this.universalPlayer.checkExistingPlayback
        ) {
          await this.universalPlayer.checkExistingPlayback("video");
        }
        if (this.videoLibrary && this.videoLibrary._adjustBottomPadding) {
          setTimeout(() => this.videoLibrary._adjustBottomPadding(), 200);
        }
      }, 500);
    }, 50);
  },

  _onAudioPageLoaded() {
    this._updateUIForPage("audio");
    if (typeof AlbumModal !== "undefined") {
      if (this.albumModal) {
        this.albumModal.hide();
        this.albumModal = null;
      }
      this.albumModal = new AlbumModal(this.events, this.musicApi);
      const trackList = new TrackList(this.events);
      this.albumModal.setTrackList(trackList);
    }
    if (typeof AlbumLibrary !== "undefined") {
      if (this.albumLibrary) {
        this.albumLibrary.destroy();
        this.albumLibrary = null;
      }
      this.albumLibrary = new AlbumLibrary(this.musicApi, this.events);
      this.albumLibrary.init().then(() => {
        if (this.playback && this.albumLibrary.albums) {
          for (const album of this.albumLibrary.albums) {
            for (const track of album.tracks) {
              if (track.path && track.title) {
                this.playback._trackNameCache.set(track.path, track.title);
              }
            }
          }
        }
        if (this.universalPlayer) {
          this.universalPlayer.syncWithPlayback();
        }
      });
    }
    if (typeof PlaylistPopup !== "undefined" && !this.playlistPopup) {
      this.playlistPopup = new PlaylistPopup(
        this.playback,
        this.events,
        this.albumLibrary,
      );
    } else if (this.playlistPopup) {
      this.playlistPopup.albumLibrary = this.albumLibrary;
      this.playlistPopup.tracksCache.clear();
      this.playlistPopup.refresh();
    }
    const refreshBtn = document.getElementById("headerRefreshBtn");
    if (refreshBtn) {
      refreshBtn.style.display = "none";
      refreshBtn.onclick = null;
    }
    const searchInput = document.getElementById("globalSearchInput");
    const searchClearBtn = document.getElementById("searchClearBtn");
    if (searchInput) {
      searchInput.value = "";
      const updateClearButton = () => {
        if (searchClearBtn) {
          const shouldShow =
            searchInput.value.length > 0 &&
            document.activeElement === searchInput;
          searchClearBtn.style.display = shouldShow ? "flex" : "none";
        }
      };
      searchInput.oninput = (e) => {
        if (this.albumLibrary && this.albumLibrary.isReady) {
          this.albumLibrary.searchAlbums(e.target.value);
        }
        updateClearButton();
      };
      searchInput.onfocus = () => {
        updateClearButton();
      };
      searchInput.onblur = () => {
        setTimeout(() => {
          if (searchClearBtn && document.activeElement !== searchInput) {
            searchClearBtn.style.display = "none";
          }
        }, 100);
      };
      if (searchClearBtn) {
        searchClearBtn.onmousedown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          searchInput.value = "";
          if (this.albumLibrary && this.albumLibrary.isReady) {
            this.albumLibrary.searchAlbums("");
          }
          updateClearButton();
          searchInput.focus();
          return false;
        };
      }
      updateClearButton();
    }
    this.events.on("album:play", (album) => {
      if (album.tracks && album.tracks.length > 0) {
        const trackPaths = album.tracks.map((track) => track.path);
        if (this.musicApi && this.musicApi.playTracks) {
          this.musicApi
            .playTracks(trackPaths)
            .then(() => {
              setTimeout(() => {
                if (this.universalPlayer) {
                  this.universalPlayer.startPlaybackExternal();
                }
              }, 500);
            })
            .catch((err) => {
              console.error("[DEBUG] playTracks error:", err);
            });
        } else {
          this.universalPlayer.startPlayback(album.tracks[0].path, "audio");
        }
      }
    });
    this.events.on("album:addToPlaylist", async (album) => {
      await this.playback.addAlbumToPlaylist(album);
    });
    this.events.on("album:open", async (album) => {
      if (this.albumModal) {
        await this.albumModal.show(album);
      }
    });
    this.events.on("album:playMusium", async (album) => {
      const tracks = album.tracks || [];
      if (tracks.length === 0 && this.musicApi) {
        try {
          const tracksData = await this.musicApi.getTracks(
            album.title,
            album.artist,
            true,
          );
          tracks.push(...tracksData);
        } catch (error) {}
      }
      const trackPaths = tracks.map((track) => track.path);
      if (this.musicApi && this.musicApi.openMusium) {
        await this.musicApi.openMusium(trackPaths);
      }
    });
    this.events.on("album:replacePlaylist", async (album) => {
      await this.playback.api.clearPlaylist();
      await this.playback.addAlbumToPlaylist(album);
      this.events.emit("playlistCleared");
      this.events.emit("playlistChanged");
    });
    this.events.on("album:playTrack", ({ album, trackIndex }) => {
      this.playback.playTrack(album, trackIndex);
    });
    setTimeout(async () => {
      if (this.universalPlayer && this.universalPlayer.checkExistingPlayback) {
        await this.universalPlayer.checkExistingPlayback("audio");
      }
      if (
        this.universalPlayer &&
        this.universalPlayer.core &&
        this.universalPlayer.core.currentFile
      ) {
        this.universalPlayer.show();
      }
    }, 500);
  },

  _onPowerPageLoaded() {
    this._updateUIForPage("power");
    if (!this.powerManagement) {
      this.powerManagement = initPowerManagement(this.api, this.events, {
        tvAddress: "192.168.50.13",
      });
    }
  },

  _updateUIForPage(page) {
    const mainContent = document.querySelector(".main-content");
    const headerPlaylistBtn = document.getElementById("headerPlaylistBtn");
    const headerRefreshMetadataBtn = document.getElementById(
      "headerRefreshMetadataBtn",
    );
    const globalSearchBox = document.getElementById("globalSearchBox");
    const refreshBtn = document.getElementById("headerRefreshBtn");
    if (page === "audio") {
      if (mainContent) {
        mainContent.classList.add("audio-page");
        mainContent.classList.remove("video-page");
        mainContent.classList.remove("power-page");
      }
      if (headerPlaylistBtn) headerPlaylistBtn.style.display = "flex";
      if (headerRefreshMetadataBtn)
        headerRefreshMetadataBtn.style.display = "flex";
      if (globalSearchBox) globalSearchBox.style.display = "flex";
      if (refreshBtn) refreshBtn.style.display = "none";
    } else if (page === "power") {
      if (mainContent) {
        mainContent.classList.add("power-page");
        mainContent.classList.remove("video-page");
        mainContent.classList.remove("audio-page");
      }
      if (headerPlaylistBtn) headerPlaylistBtn.style.display = "none";
      if (headerRefreshMetadataBtn)
        headerRefreshMetadataBtn.style.display = "none";
      if (globalSearchBox) globalSearchBox.style.display = "none";
      if (refreshBtn) refreshBtn.style.display = "none";
    } else {
      if (mainContent) {
        mainContent.classList.add("video-page");
        mainContent.classList.remove("audio-page");
        mainContent.classList.remove("power-page");
      }
      if (headerPlaylistBtn) headerPlaylistBtn.style.display = "none";
      if (headerRefreshMetadataBtn)
        headerRefreshMetadataBtn.style.display = "none";
      if (globalSearchBox) globalSearchBox.style.display = "none";
      if (refreshBtn) refreshBtn.style.display = "none";
    }
  },

  _showOverlay() {
    let overlay = document.querySelector(".overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "overlay";
      document.body.insertBefore(overlay, document.body.firstChild);
    }
    overlay.classList.add("active");
    overlay.style.display = "block";
  },

  _hideOverlay() {
    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.classList.remove("active");
      overlay.style.display = "none";
    }
  },
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => MediaCenter.init());
} else {
  MediaCenter.init();
}
