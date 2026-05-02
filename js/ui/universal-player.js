class UniversalPlayer {
  constructor(apiClient, events, musicApi = null, playerApi = null) {
    this.api = apiClient;
    this.events = events;
    this.musicApi = musicApi;
    this.playerApi = playerApi;
    this.mediaType = null;
    this.currentFile = null;
    this.isPlaying = false;
    this._duration = 0;
    this._currentTime = 0;
    this._isDestroyed = false;
    this._currentVolume = 50;
    this._isMuted = false;
    this._volumePollInterval = null;
    this._currentOutput = "speakers";
    this._progressInterval = null;
    this._isPollingStarted = false;
    this._isMinimized = false;
    this._settingsCollapsed = true;
    this.element = null;
    this._currentAlbumArt = null;
    this._isStartingVideo = false;
    this._createPanel();
    this._initElements();
    this._attachEvents();
    this._subscribeToEvents();
    this._startAutoUpdate();
    this._loadInitialVolume();
    this._loadInitialAudioOutput();
    this._startVolumePolling();
    this._ignorePollingUpdate = false;
  }

  _createPanel() {
    if (document.getElementById("universalBottomPlayer")) return;
    this.element = document.createElement("div");
    this.element.id = "universalBottomPlayer";
    this.element.className = "universal-bottom-player";
    this.element.innerHTML = `
      <div class="universal-bottom-player-minimize-bar" id="universalMinimizeBar">
        <i class="fas fa-chevron-up"></i>
      </div>
      <div class="universal-bottom-player-content">
        <div class="universal-bottom-player-info">
          <div class="universal-bottom-player-preview" id="universalBottomPreview">
            <i id="universalBottomPreviewIcon" class="fas fa-play-circle"></i>
            <img id="universalBottomPreviewImg" style="display: none" alt="Preview" />
          </div>
          <div class="universal-bottom-player-track-info">
            <div id="universalBottomTrackName" class="universal-bottom-player-track-name">—</div>
            <div id="universalBottomTrackArtist" class="universal-bottom-player-track-artist"></div>
            <div id="universalBottomTrackCount" class="universal-bottom-player-track-count"></div>
          </div>
        </div>
        <div class="universal-bottom-player-progress">
          <div class="universal-bottom-player-progress-bar-container">
            <span id="universalBottomCurrentTime" class="universal-bottom-player-time-current">0:00</span>
            <div id="universalBottomProgressBar" class="universal-bottom-player-progress-bar">
              <div id="universalBottomProgressFill" class="universal-bottom-player-progress-fill"></div>
            </div>
            <span id="universalBottomDuration" class="universal-bottom-player-time-total">0:00</span>
          </div>
        </div>
        <div class="universal-bottom-player-controls">
          <button id="universalBottomPrevBtn" class="universal-bottom-player-btn" title="Предыдущий"><i class="fas fa-backward-step"></i></button>
          <button id="universalBottomPlayPauseBtn" class="universal-bottom-player-btn universal-bottom-player-play" title="Play/Pause"><i class="fas fa-play"></i></button>
          <button id="universalBottomStopBtn" class="universal-bottom-player-btn" title="Стоп"><i class="fas fa-stop"></i></button>
          <button id="universalBottomNextBtn" class="universal-bottom-player-btn" title="Следующий"><i class="fas fa-forward-step"></i></button>
          <button id="universalBottomFullscreenBtn" class="universal-bottom-player-btn" title="Полный экран"><i class="fas fa-expand"></i></button>
          <button id="universalBottomSettingsToggle" class="universal-bottom-player-btn universal-bottom-player-settings-toggle" title="Настройки"><i class="fas fa-sliders-h"></i></button>
        </div>
      </div>
      <div id="universalBottomSettings" class="universal-bottom-player-settings collapsed">
        <div class="universal-bottom-player-volume-section">
          <div class="universal-bottom-player-volume-controls">
            <button id="universalBottomVolumeDown" class="universal-bottom-player-volume-btn" title="Уменьшить громкость"><i class="fas fa-minus"></i></button>
            <button id="universalBottomVolumeMute" class="universal-bottom-player-volume-mute" title="Мьют"><i class="fas fa-volume-up"></i></button>
            <button id="universalBottomVolumeUp" class="universal-bottom-player-volume-btn" title="Увеличить громкость"><i class="fas fa-plus"></i></button>
            <span id="universalBottomVolumeValue" class="universal-bottom-player-volume-value">50%</span>
          </div>
        </div>
        <div class="universal-bottom-player-output-section">
          <span class="universal-bottom-player-output-label"><i class="fas fa-exchange-alt"></i> Аудиовыход:</span>
          <button id="universalBottomSpeakersBtn" class="universal-bottom-player-output-btn speakers-btn" title="Колонки"><i class="fas fa-volume-up"></i><span>Колонки</span></button>
          <button id="universalBottomHeadphonesBtn" class="universal-bottom-player-output-btn headphones-btn" title="Наушники"><i class="fas fa-headphones"></i><span>Наушники</span></button>
        </div>
      </div>
    `;
    document.body.appendChild(this.element);
  }

  _initElements() {
    this.element = document.getElementById("universalBottomPlayer");
    this.playPauseBtn = document.getElementById("universalBottomPlayPauseBtn");
    this.prevBtn = document.getElementById("universalBottomPrevBtn");
    this.nextBtn = document.getElementById("universalBottomNextBtn");
    this.stopBtn = document.getElementById("universalBottomStopBtn");
    this.fullscreenBtn = document.getElementById(
      "universalBottomFullscreenBtn",
    );
    this.progressBar = document.getElementById("universalBottomProgressBar");
    this.progressFill = document.getElementById("universalBottomProgressFill");
    this.trackName = document.getElementById("universalBottomTrackName");
    this.trackArtist = document.getElementById("universalBottomTrackArtist");
    this.trackCount = document.getElementById("universalBottomTrackCount");
    this.timeCurrent = document.getElementById("universalBottomCurrentTime");
    this.timeTotal = document.getElementById("universalBottomDuration");
    this.previewImg = document.getElementById("universalBottomPreviewImg");
    this.previewIcon = document.getElementById("universalBottomPreviewIcon");
    this.minimizeBar = document.getElementById("universalMinimizeBar");
    this.settingsToggle = document.getElementById(
      "universalBottomSettingsToggle",
    );
    this.settingsContainer = document.getElementById("universalBottomSettings");
    this.volumeDown = document.getElementById("universalBottomVolumeDown");
    this.volumeUp = document.getElementById("universalBottomVolumeUp");
    this.volumeMute = document.getElementById("universalBottomVolumeMute");
    this.volumeValue = document.getElementById("universalBottomVolumeValue");
    this.volumeFill = document.getElementById("universalVolumeFill");
    this.speakersBtn = document.getElementById("universalBottomSpeakersBtn");
    this.headphonesBtn = document.getElementById(
      "universalBottomHeadphonesBtn",
    );
  }

  _attachEvents() {
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener("click", () =>
        this._togglePlayPause(),
      );
    }
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this._seekBackward());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this._seekForward());
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener("click", () => this.stop());
    }
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener("click", () =>
        this._toggleFullscreen(),
      );
    }
    if (this.progressBar) {
      this.progressBar.addEventListener("click", (e) =>
        this._handleProgressClick(e),
      );
    }
    if (this.minimizeBar) {
      this.minimizeBar.addEventListener("click", () => this._toggleMinimize());
    }
    if (this.settingsToggle) {
      this.settingsToggle.addEventListener("click", () =>
        this._toggleSettings(),
      );
    }
    if (this.volumeDown) {
      this.volumeDown.addEventListener("click", () => this._changeVolume(-5));
    }
    if (this.volumeUp) {
      this.volumeUp.addEventListener("click", () => this._changeVolume(5));
    }
    if (this.volumeMute) {
      this.volumeMute.addEventListener("click", () => this._toggleMute());
    }
    if (this.speakersBtn) {
      this.speakersBtn.addEventListener("click", () =>
        this._switchToSpeakers(),
      );
    }
    if (this.headphonesBtn) {
      this.headphonesBtn.addEventListener("click", () =>
        this._switchToHeadphones(),
      );
    }
  }

  _subscribeToEvents() {
    this.events.on("video:play", (path) => {
      console.log("[UNIVERSAL] video:play received", {
        path,
        currentFile: this.currentFile,
        mediaType: this.mediaType,
      });
      if (this.currentFile === path && this.mediaType === "video") {
        console.log("[UNIVERSAL] Same video, showing player");
        this.show();
        if (!this.isPlaying) {
          this._togglePlayPause();
        }
        return;
      }
      if (this.mediaType === "audio" && this.currentFile) {
        console.log("[UNIVERSAL] Stopping audio before video");
        this.stop();
      }
      this.startPlayback(path, "video");
    });
    this.events.on("playback:audioStart", (path) => {
      if (this.mediaType === "video" && this.currentFile) {
        this.stop();
      }
      this.startPlayback(path, "audio");
    });
    this.events.on("playback:videoStopped", () => {
      if (this.mediaType === "video") {
        this.stop();
      }
    });
    this.events.on("playback:audioStopped", () => {
      if (this.mediaType === "audio") {
        this.stop();
      }
    });
    this.events.on("stateChange", (state) => this._updateFromState(state));
    this.events.on("trackChanged", ({ album, trackIndex }) => {
      if (album && album.tracks && album.tracks[trackIndex]) {
        const track = album.tracks[trackIndex];
        this._updateTrackInfo(track.displayName || track.title, album.artist);
        if (track.path) {
          this.currentFile = track.path;
          this._loadAlbumCover(this.currentFile);
        }
      }
    });
    this.events.on("page:changed", (page) => {
      if (page === "video" && this.mediaType === "video" && this.currentFile) {
        this.show();
        return;
      }
      if (page === "audio" && this.mediaType === "audio" && this.currentFile) {
        this.show();
        return;
      }
      if (page === "video" || page === "audio") {
        if (this.currentFile) {
          this.show();
        }
      } else {
        this.hide();
      }
    });
    this.events.on("playlistChanged", () => {
      if (this.currentFile) {
        this.show();
      }
    });
  }

  _updateFromState(state) {
    if (!state) return;
    if (this.mediaType === "video") {
      return;
    }
    if (state.currentTrack) {
      this.currentFile = state.currentTrack;
      let fileName = this.currentFile.split("/").pop();
      fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
      const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
      if (match) {
        fileName = match[1];
      }
      if (this.trackName) {
        this.trackName.textContent = this._escape(fileName);
      }
      if (this.musicApi && this.currentFile) {
        this.musicApi
          .getFileMetadata(this.currentFile)
          .then((metadata) => {
            if (
              metadata &&
              metadata.data &&
              metadata.data.file &&
              metadata.data.file.artist
            ) {
              if (this.trackArtist) {
                this.trackArtist.textContent = this._escape(
                  metadata.data.file.artist,
                );
              }
            } else if (
              metadata &&
              metadata.data &&
              metadata.data.database &&
              metadata.data.database.artist
            ) {
              if (this.trackArtist) {
                this.trackArtist.textContent = this._escape(
                  metadata.data.database.artist,
                );
              }
            }
          })
          .catch(() => {});
      }
    }
    this.isPlaying = state.isPlaying || false;
    this._updatePlayPauseButton(this.isPlaying);
    if (state.currentIndex !== undefined && state.totalTracks !== undefined) {
      if (this.trackCount) {
        this.trackCount.textContent = `${state.currentIndex + 1}/${state.totalTracks}`;
      }
    }
  }

  _updateTrackInfo(title, artist) {
    if (this.trackName) {
      let trackTitle = title || "—";
      const match = trackTitle.match(/^\d+\s*[-.]?\s*(.+)$/);
      if (match) {
        trackTitle = match[1];
      }
      this.trackName.textContent = this._escape(trackTitle);
    }
    if (this.trackArtist) {
      this.trackArtist.textContent = this._escape(artist || "");
    }
  }

  setMediaType(type) {
    this.mediaType = type;
    this._updateMediaIcon();
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
      this._isPollingStarted = false;
    }
    this._startProgressPolling();
  }

  async checkExistingPlayback(type) {
    if (this._isDestroyed) return false;
    if (type === "video") {
      try {
        const response = await this.api.get("/api/video/status");
        if (response.success && response.playing && response.currentFile) {
          this.mediaType = type;
          this.currentFile = response.currentFile;
          this.isPlaying = !response.paused;
          this._currentTime = response.currentTime || 0;
          this._duration = response.duration || 0;
          this._updateFileInfo(this.currentFile);
          this._updateProgressBar(this._currentTime, this._duration);
          this._updateTimeDisplay(this._currentTime, this._duration);
          this._updatePlayPauseButton(this.isPlaying);
          this._updateMediaIcon();
          await this._loadVideoPreview(this.currentFile);
          if (this.trackArtist) this.trackArtist.textContent = "Видео";
          this.show();
          this._startProgressPolling();
          return true;
        } else if (
          response.success &&
          !response.playing &&
          response.currentFile
        ) {
          this.mediaType = type;
          this.currentFile = response.currentFile;
          this.isPlaying = false;
          this._updateFileInfo(this.currentFile);
          this._updateMediaIcon();
          await this._loadVideoPreview(this.currentFile);
          this.show();
          return true;
        }
      } catch (error) {
        console.error("Failed to check video playback:", error);
      }
    }
    if (type === "audio" && this.playerApi) {
      try {
        const state = await this.playerApi.getPlaybackState();
        if (state && state.success && state.data) {
          const hasPlayback = state.data.totalTracks > 0;
          if (hasPlayback) {
            this.mediaType = type;
            this.currentFile = state.data.currentTrack;
            this.isPlaying = state.data.isPlaying || false;
            this._updateFileInfo(this.currentFile);
            this._updatePlayPauseButton(this.isPlaying);
            this._updateMediaIcon();
            if (
              this.trackCount &&
              state.data.currentIndex !== undefined &&
              state.data.totalTracks !== undefined
            ) {
              this.trackCount.textContent = `${state.data.currentIndex + 1}/${state.data.totalTracks}`;
            }
            if (this.currentFile && this.musicApi) {
              const metadata = await this.musicApi.getFileMetadata(
                this.currentFile,
              );
              if (metadata && metadata.data && metadata.data.file) {
                if (metadata.data.file.title) {
                  let trackTitle = metadata.data.file.title;
                  const match = trackTitle.match(/^\d+\s*[-.]?\s*(.+)$/);
                  if (match) trackTitle = match[1];
                  if (this.trackName)
                    this.trackName.textContent = this._escape(trackTitle);
                }
                if (metadata.data.file.artist && this.trackArtist) {
                  this.trackArtist.textContent = this._escape(
                    metadata.data.file.artist,
                  );
                }
              }
              await this._loadAlbumCover(this.currentFile);
            }
            this.show();
            this._startProgressPolling();
            return true;
          }
        }
      } catch (error) {
        console.error("Failed to check audio playback:", error);
      }
    }
    return false;
  }

  async startPlayback(path, type) {
    console.log("[UNIVERSAL] startPlayback called", {
      path,
      type,
      isStartingVideo: this._isStartingVideo,
    });
    if (this._isStartingVideo) {
      console.log("[UNIVERSAL] Already starting video, returning");
      return;
    }
    if (
      this.currentFile === path &&
      this.mediaType === type &&
      this.isPlaying
    ) {
      console.log("[UNIVERSAL] Same file already playing, just showing");
      this.show();
      return;
    }
    if (this.mediaType && this.mediaType !== type && this.currentFile) {
      console.log("[UNIVERSAL] Switching media type, stopping current");
      await this.stop();
    }
    if (type === "video") {
      this._isStartingVideo = true;
    }
    this.setMediaType(type);
    this.currentFile = path;
    this._updateFileInfo(path);
    this._updateMediaIcon();
    if (type === "video") {
      await this._loadVideoPreview(path);
      if (this.trackArtist) this.trackArtist.textContent = "Видео";
      try {
        console.log("[UNIVERSAL] Calling /api/open");
        const response = await this.api.post("/api/open", { path });
        console.log("[UNIVERSAL] /api/open response", response);
        if (!response.success) {
          Utils.showNotification(
            response.error || "Ошибка воспроизведения",
            "error",
          );
          this._isStartingVideo = false;
          return;
        }
        console.log("[UNIVERSAL] Calling show()");
        this.show();
        this._updatePlayPauseButton(true);
        this.isPlaying = true;
        setTimeout(async () => {
          const status = await this.api.get("/api/video/status");
          console.log("[UNIVERSAL] Video status after delay", status);
          const isActuallyPlaying = !status.paused;
          if (this.isPlaying !== isActuallyPlaying) {
            this.isPlaying = isActuallyPlaying;
            this._updatePlayPauseButton(this.isPlaying);
          }
          this._isStartingVideo = false;
        }, 500);
      } catch (error) {
        console.error("[UNIVERSAL] Error starting video:", error);
        Utils.showNotification("Ошибка запуска видео", "error");
        this._isStartingVideo = false;
      }
    } else {
      try {
        await this.api.post("/api/video/close").catch(() => {});
      } catch (error) {}
      await this._loadAlbumCover(path);
      console.log("[UNIVERSAL] Audio playback starting, showing player");
      this.show();
      this._updatePlayPauseButton(true);
      this.isPlaying = true;
      setTimeout(async () => {
        if (this.playerApi) {
          const timeInfo = await this.playerApi.getCurrentTime();
          if (timeInfo && timeInfo.data && timeInfo.data.duration > 0) {
            this._duration = timeInfo.data.duration;
            this._updateTimeDisplay(this._currentTime, this._duration);
          }
          const state = await this.playerApi.getPlaybackState();
          if (state && state.data && state.data.currentTrack) {
            this.currentFile = state.data.currentTrack;
            this._updateFileInfo(this.currentFile);
          }
        }
      }, 500);
    }
  }

  setMediaType(type) {
    this.mediaType = type;
    this._updateMediaIcon();
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
      this._isPollingStarted = false;
    }
    this._startProgressPolling();
    if (this.currentFile) {
      this.show();
    }
  }

  _updateMediaIcon() {
    if (this.previewIcon) {
      if (this.mediaType === "video") {
        this.previewIcon.className = "fas fa-video";
      } else {
        this.previewIcon.className = "fas fa-music";
      }
    }
  }

  _updateFileInfo(path) {
    if (!path) {
      if (this.trackName) this.trackName.textContent = "—";
      return;
    }
    const fileName = path.split("/").pop();
    if (this.trackName) this.trackName.textContent = this._escape(fileName);
  }

  async _loadVideoPreview(path) {
    if (!this.previewImg || !this.previewIcon) return;
    this.previewImg.style.display = "none";
    this.previewIcon.style.display = "flex";
    try {
      const thumbnailUrl = `/api/thumbnail?path=${encodeURIComponent(path)}`;
      const response = await fetch(thumbnailUrl);
      const data = await response.json();
      if (data.success && data.thumbnail) {
        this.previewImg.src = data.thumbnail;
        this.previewImg.style.display = "block";
        this.previewIcon.style.display = "none";
      }
    } catch (error) {}
  }

  async _loadAlbumCover(filePath) {
    if (!this.previewImg || !this.previewIcon) return;
    this.previewImg.style.display = "none";
    this.previewIcon.style.display = "flex";
    this.previewIcon.className = "fas fa-music";
    if (!this.musicApi) return;
    try {
      const metadata = await this.musicApi.getFileMetadata(filePath);
      if (
        metadata &&
        metadata.data &&
        metadata.data.file &&
        metadata.data.file.cover
      ) {
        this.previewImg.src = metadata.data.file.cover;
        this.previewImg.style.display = "block";
        this.previewIcon.style.display = "none";
        return;
      }
      let artist = "",
        title = "";
      if (metadata && metadata.data && metadata.data.database) {
        artist = metadata.data.database.artist || "";
        title = metadata.data.database.album || "";
      }
      if (!title) {
        const pathParts = filePath.split("/");
        if (pathParts.length >= 2) {
          title = pathParts[pathParts.length - 2];
        }
      }
      if (title) {
        let albumArtUrl = `/api/music/albumart/album/${encodeURIComponent(title)}`;
        if (artist) {
          albumArtUrl += `?artist=${encodeURIComponent(artist)}`;
        }
        const coverResponse = await fetch(albumArtUrl);
        if (coverResponse.ok) {
          const blob = await coverResponse.blob();
          const coverUrl = URL.createObjectURL(blob);
          this.previewImg.src = coverUrl;
          this.previewImg.style.display = "block";
          this.previewIcon.style.display = "none";
          return;
        }
      }
      const encodedPath = encodeURIComponent(filePath).replace(/%2F/g, "/");
      const fileArtUrl = `/api/music/albumart/${encodedPath}`;
      const fileResponse = await fetch(fileArtUrl);
      if (fileResponse.ok) {
        const blob = await fileResponse.blob();
        const coverUrl = URL.createObjectURL(blob);
        this.previewImg.src = coverUrl;
        this.previewImg.style.display = "block";
        this.previewIcon.style.display = "none";
      }
    } catch (error) {}
  }

  _startProgressPolling() {
    if (this._progressInterval || this._isPollingStarted) return;
    this._isPollingStarted = true;
    this._progressInterval = setInterval(async () => {
      if (this._isDestroyed) return;
      try {
        if (this.mediaType === "video") {
          const response = await this.api.get("/api/video/status");
          if (response.success) {
            const newPlaying = response.playing && !response.paused;
            if (this.isPlaying !== newPlaying && !this._ignorePollingUpdate) {
              this.isPlaying = newPlaying;
              this._updatePlayPauseButton(this.isPlaying);
            }
            this._currentTime = response.currentTime || 0;
            this._duration = response.duration || 0;
            this._updateProgressBar(this._currentTime, this._duration);
            this._updateTimeDisplay(this._currentTime, this._duration);
            if (response.currentFile && !this.currentFile) {
              this.currentFile = response.currentFile;
              this._updateFileInfo(this.currentFile);
            }
          }
        }
        if (this.mediaType === "audio" && this.playerApi) {
          const timeInfo = await this.playerApi.getCurrentTime();
          if (timeInfo && timeInfo.success && timeInfo.data) {
            this._currentTime = timeInfo.data.currentTime || 0;
            this._duration = timeInfo.data.duration || 0;
            this._updateProgressBar(this._currentTime, this._duration);
            this._updateTimeDisplay(this._currentTime, this._duration);
          }
          const state = await this.playerApi.getPlaybackState();
          if (state && state.success && state.data) {
            const wasPlaying = this.isPlaying;
            this.isPlaying = state.data.isPlaying || false;
            if (wasPlaying !== this.isPlaying) {
              this._updatePlayPauseButton(this.isPlaying);
            }
            if (
              state.data.currentTrack &&
              state.data.currentTrack !== this.currentFile
            ) {
              this.currentFile = state.data.currentTrack;
              this._updateFileInfo(this.currentFile);
              await this._loadAlbumCover(this.currentFile);
            }
            if (
              this.trackCount &&
              state.data.currentIndex !== undefined &&
              state.data.totalTracks !== undefined
            ) {
              this.trackCount.textContent = `${state.data.currentIndex + 1}/${state.data.totalTracks}`;
            }
            if (
              (!state.data.currentTrack || state.data.totalTracks === 0) &&
              this.currentFile
            ) {
              this.currentFile = null;
              if (this.trackName) this.trackName.textContent = "—";
              if (this.trackArtist) this.trackArtist.textContent = "";
              if (this.trackCount) this.trackCount.textContent = "";
              if (this.progressFill) this.progressFill.style.width = "0%";
              if (this.timeCurrent) this.timeCurrent.textContent = "0:00";
              if (this.timeTotal) this.timeTotal.textContent = "0:00";
            }
          }
        }
      } catch (error) {}
    }, 500);
  }

  _updateProgressBar(currentTime, duration) {
    if (this.progressFill && duration > 0) {
      this.progressFill.style.width = `${(currentTime / duration) * 100}%`;
    }
  }

  _updateTimeDisplay(currentTime, duration) {
    if (this.timeCurrent) {
      this.timeCurrent.textContent = this._formatTime(currentTime);
    }
    if (this.timeTotal) {
      this.timeTotal.textContent =
        duration > 0 ? this._formatTime(duration) : "0:00";
    }
  }

  _updatePlayPauseButton(playing) {
    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML = playing
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    }
  }

  async _handleProgressClick(e) {
    if (!this.progressBar || this._duration === 0) return;
    const rect = this.progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const seekTime = this._duration * percent;
    await this._seekTo(seekTime);
  }

  async _seekTo(time) {
    if (this.mediaType === "video") {
      try {
        const response = await this.api.post("/api/mpv/seek", { time: time });
        if (response.success) {
          this._currentTime = response.time;
          this._updateProgressBar(this._currentTime, this._duration);
          this._updateTimeDisplay(this._currentTime, this._duration);
        }
      } catch (error) {
        Utils.showNotification("Ошибка перемотки", "error");
      }
    } else if (this.playerApi) {
      await this.playerApi.seek(time);
      this._currentTime = time;
      this._updateProgressBar(this._currentTime, this._duration);
      this._updateTimeDisplay(this._currentTime, this._duration);
    }
  }

  async _togglePlayPause() {
    console.log("[DEBUG] _togglePlayPause called", {
      mediaType: this.mediaType,
      isPlaying: this.isPlaying,
      currentFile: this.currentFile,
      ignorePollingUpdate: this._ignorePollingUpdate,
    });
    if (this.mediaType === "video") {
      if (this.currentFile) {
        try {
          const status = await this.api.get("/api/video/status");
          console.log("[DEBUG] Video status:", status);
          if (!status.success || status.reason === "process_dead") {
            Utils.showNotification(
              "Видео не загружено или процесс завершён",
              "error",
            );
            return;
          }
          const command = this.isPlaying ? "pause" : "play";
          console.log("[DEBUG] Sending command:", command);
          const response = await this.api.post("/api/mpv/control", {
            command: command,
          });
          console.log("[DEBUG] Control response:", response);
          if (response.success) {
            this._ignorePollingUpdate = true;
            const oldState = this.isPlaying;
            this.isPlaying = !this.isPlaying;
            console.log("[DEBUG] State changed:", {
              oldState,
              newState: this.isPlaying,
            });
            this._updatePlayPauseButton(this.isPlaying);
            setTimeout(() => {
              this._ignorePollingUpdate = false;
              console.log("[DEBUG] Ignore flag reset");
            }, 500);
          } else {
            Utils.showNotification("Ошибка управления видео", "error");
          }
        } catch (error) {
          console.log("[DEBUG] Error:", error);
          Utils.showNotification("Ошибка связи с сервером", "error");
        }
      } else {
        Utils.showNotification("Нет активного видео", "info");
      }
    } else if (this.playerApi) {
      const state = await this.playerApi.getPlaybackState();
      if (state && state.data && state.data.totalTracks > 0) {
        if (this.isPlaying) {
          await this.playerApi.pause();
        } else {
          await this.playerApi.play();
        }
        this.isPlaying = !this.isPlaying;
        this._updatePlayPauseButton(this.isPlaying);
      } else {
        Utils.showNotification("Плейлист пуст", "info");
      }
    }
  }

  async _updateVideoProgress() {
    if (this.mediaType !== "video") return;
    try {
      const response = await this.api.get("/api/video/status");
      if (response.success && response.playing) {
        this._currentTime = response.currentTime || 0;
        this._duration = response.duration || 0;
        this._updateProgressBar(this._currentTime, this._duration);
        this._updateTimeDisplay(this._currentTime, this._duration);
      }
    } catch (error) {}
  }

  async _previous() {
    if (this.playerApi) {
      await this.playerApi.previous();
    }
    this.events.emit("playback:previous");
  }

  async _next() {
    if (this.playerApi) {
      await this.playerApi.next();
    }
    this.events.emit("playback:next");
  }

  stop() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
      this._isPollingStarted = false;
    }
    if (this.mediaType === "video") {
      try {
        this.api.post("/api/video/close").catch(() => {});
      } catch (error) {}
    } else if (this.playerApi) {
      this.playerApi.stop().catch(() => {});
    }
    this.currentFile = null;
    this.isPlaying = false;
    this._duration = 0;
    this._currentTime = 0;
    if (this.trackName) this.trackName.textContent = "—";
    if (this.trackArtist) this.trackArtist.textContent = "";
    if (this.trackCount) this.trackCount.textContent = "";
    if (this.progressFill) this.progressFill.style.width = "0%";
    if (this.timeCurrent) this.timeCurrent.textContent = "0:00";
    if (this.timeTotal) this.timeTotal.textContent = "0:00";
    if (this.previewImg) {
      this.previewImg.src = "";
      this.previewImg.style.display = "none";
    }
    if (this.previewIcon) {
      this.previewIcon.style.display = "flex";
      this.previewIcon.className = "fas fa-play-circle";
    }
    this._startProgressPolling();
  }

  _toggleFullscreen() {
    if (this.mediaType === "video") {
      this.api.post("/api/mpv/control", { command: "fullscreen" });
    } else {
      if (!document.fullscreenElement) {
        this.element.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  }

  _toggleMinimize() {
    this._isMinimized = !this._isMinimized;
    if (this._isMinimized) {
      this.element.classList.add("minimized");
      if (this.minimizeBar) {
        this.minimizeBar.innerHTML = '<i class="fas fa-chevron-up"></i>';
      }
    } else {
      this.element.classList.remove("minimized");
      if (this.minimizeBar) {
        this.minimizeBar.innerHTML = '<i class="fas fa-chevron-down"></i>';
      }
    }
  }

  _toggleSettings() {
    this._settingsCollapsed = !this._settingsCollapsed;
    if (this.settingsContainer) {
      if (this._settingsCollapsed) {
        this.settingsContainer.classList.add("collapsed");
      } else {
        this.settingsContainer.classList.remove("collapsed");
      }
    }
    if (this.settingsToggle) {
      if (this._settingsCollapsed) {
        this.settingsToggle.classList.add("collapsed");
      } else {
        this.settingsToggle.classList.remove("collapsed");
      }
    }
  }

  async _changeVolume(delta) {
    const newVolume = Math.min(100, Math.max(0, this._currentVolume + delta));
    if (newVolume === this._currentVolume) return;
    this._currentVolume = newVolume;
    this._updateVolumeUI();
    try {
      await this.api.post("/api/audio/volume", {
        volume: this._currentVolume,
      });
      if (this._isMuted && newVolume > 0) {
        this._isMuted = false;
        if (this.volumeMute) {
          this.volumeMute.innerHTML = '<i class="fas fa-volume-up"></i>';
          this.volumeMute.classList.remove("muted");
        }
      }
    } catch (error) {}
  }

  async _toggleMute() {
    try {
      const response = await this.api.post("/api/audio/volume/mute");
      if (response.success && response.data) {
        this._isMuted = response.data.muted;
        if (this.volumeMute) {
          if (this._isMuted) {
            this.volumeMute.innerHTML = '<i class="fas fa-volume-mute"></i>';
            this.volumeMute.classList.add("muted");
          } else {
            this.volumeMute.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.volumeMute.classList.remove("muted");
          }
        }
      }
    } catch (error) {}
  }

  async _switchToSpeakers() {
    try {
      const response = await this.api.post("/api/audio/output/speakers");
      if (response.success) {
        this._currentOutput = "speakers";
        this._updateOutputUI();
      }
    } catch (error) {}
  }

  async _switchToHeadphones() {
    try {
      const response = await this.api.post("/api/audio/output/headphones");
      if (response.success) {
        this._currentOutput = "headphones";
        this._updateOutputUI();
      }
    } catch (error) {}
  }

  _updateVolumeUI() {
    if (this.volumeValue) {
      this.volumeValue.textContent = this._isMuted
        ? "0%"
        : `${this._currentVolume}%`;
    }
    if (this.volumeFill) {
      const percent = this._isMuted ? 0 : this._currentVolume;
      this.volumeFill.style.width = `${percent}%`;
      this.volumeFill.classList.remove("animate");
      void this.volumeFill.offsetWidth;
      this.volumeFill.classList.add("animate");
    }
    if (this.volumeMute) {
      const icon = this.volumeMute.querySelector("i");
      if (this._isMuted || this._currentVolume === 0) {
        icon.className = "fas fa-volume-mute";
        this.volumeMute.title = "Включить звук";
        this.volumeMute.classList.add("muted");
      } else if (this._currentVolume < 30) {
        icon.className = "fas fa-volume-off";
        this.volumeMute.title = "Выключить звук";
        this.volumeMute.classList.remove("muted");
      } else if (this._currentVolume < 70) {
        icon.className = "fas fa-volume-down";
        this.volumeMute.title = "Выключить звук";
        this.volumeMute.classList.remove("muted");
      } else {
        icon.className = "fas fa-volume-up";
        this.volumeMute.title = "Выключить звук";
        this.volumeMute.classList.remove("muted");
      }
    }
  }

  _updateOutputUI() {
    if (this.speakersBtn) {
      if (this._currentOutput === "speakers") {
        this.speakersBtn.classList.add("active");
      } else {
        this.speakersBtn.classList.remove("active");
      }
    }
    if (this.headphonesBtn) {
      if (this._currentOutput === "headphones") {
        this.headphonesBtn.classList.add("active");
      } else {
        this.headphonesBtn.classList.remove("active");
      }
    }
  }

  async _loadInitialVolume() {
    try {
      const response = await this.api.get("/api/audio/volume");
      if (
        response.success &&
        response.data &&
        typeof response.data.volume === "number"
      ) {
        this._currentVolume = response.data.volume;
        this._updateVolumeUI();
      }
    } catch (error) {}
  }

  _startVolumePolling() {
    if (this._volumePollInterval) clearInterval(this._volumePollInterval);
    this._volumePollInterval = setInterval(async () => {
      if (this._isDestroyed) return;
      try {
        const response = await this.api.get("/api/audio/volume");
        if (response.success && response.data) {
          let updated = false;
          if (
            response.data.volume !== undefined &&
            this._currentVolume !== response.data.volume
          ) {
            this._currentVolume = response.data.volume;
            updated = true;
          }
          if (
            response.data.muted !== undefined &&
            this._isMuted !== response.data.muted
          ) {
            this._isMuted = response.data.muted;
            updated = true;
          }
          if (updated) {
            this._updateVolumeUI();
          }
        }
        const outputResponse = await this.api.get("/api/audio/output");
        if (
          outputResponse.success &&
          outputResponse.data &&
          outputResponse.data.current !== this._currentOutput
        ) {
          this._currentOutput = outputResponse.data.current;
          this._updateOutputUI();
        }
      } catch (error) {}
    }, 2000);
  }

  async _loadInitialAudioOutput() {
    try {
      const response = await this.api.get("/api/audio/output");
      if (response.success && response.data && response.data.current) {
        this._currentOutput = response.data.current;
        this._updateOutputUI();
      }
    } catch (error) {}
  }

  _startAutoUpdate() {
    setInterval(async () => {
      if (this._isDestroyed || !this.currentFile) return;
      try {
        if (this.mediaType === "video") {
          const response = await this.api.get("/api/video/status");
          if (response.success && response.playing) {
            this._currentTime = response.currentTime || 0;
            this._duration = response.duration || 0;
            this._updateProgressBar(this._currentTime, this._duration);
            this._updateTimeDisplay(this._currentTime, this._duration);
          }
        }
      } catch (e) {}
    }, 1000);
  }

  show() {
    console.log("[UNIVERSAL] show() called", {
      elementExists: !!this.element,
      currentFile: this.currentFile,
    });
    if (this.element) {
      this.element.classList.add("active");
      this.element.style.display = "flex";
      console.log("[UNIVERSAL] Player shown, display: flex");
      if (this._adjustBottomPadding) {
        this._adjustBottomPadding();
      }
      if (
        window.MediaCenter &&
        window.MediaCenter.videoLibrary &&
        window.MediaCenter.videoLibrary._adjustBottomPadding
      ) {
        setTimeout(
          () => window.MediaCenter.videoLibrary._adjustBottomPadding(),
          50,
        );
      }
    } else {
      console.error("[UNIVERSAL] show() failed - element is null");
    }
  }

  _adjustBottomPadding() {
    const scrollable = document.querySelector(".scrollable-content");
    if (scrollable) {
      scrollable.style.paddingBottom = "80px";
    }
    if (window.innerWidth <= 768 && scrollable) {
      scrollable.style.paddingBottom = "100px";
    }
  }

  hide() {
    if (this.element) {
      this.element.classList.remove("active");
      this.element.style.display = "none";
      if (
        window.MediaCenter &&
        window.MediaCenter.videoLibrary &&
        window.MediaCenter.videoLibrary._adjustBottomPadding
      ) {
        setTimeout(
          () => window.MediaCenter.videoLibrary._adjustBottomPadding(),
          50,
        );
      }
    }
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  destroy() {
    this._isDestroyed = true;
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
    if (this.element) {
      this.element.remove();
    }
  }

  async _seekBackward() {
    if (this.mediaType === "video") {
      const seekTime = Math.max(0, this._currentTime - 10);
      await this._seekTo(seekTime);
    } else if (this.playerApi) {
      await this.playerApi.previous();
      this.events.emit("playback:previous");
    }
  }

  async _seekForward() {
    if (this.mediaType === "video") {
      const seekTime = Math.min(this._duration, this._currentTime + 10);
      await this._seekTo(seekTime);
    } else if (this.playerApi) {
      await this.playerApi.next();
      this.events.emit("playback:next");
    }
  }
}

if (typeof window !== "undefined") {
  window.universalPlayerInstance = null;
}
