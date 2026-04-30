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
    this._isMinimized = false;
    this._settingsCollapsed = true;
    this.element = null;
    this._currentAlbumArt = null;
    this._createPanel();
    this._initElements();
    this._attachEvents();
    this._subscribeToEvents();
    this._startAutoUpdate();
    this._loadInitialVolume();
    this._loadInitialAudioOutput();
    this._startProgressPolling();
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
    this.speakersBtn = document.getElementById("universalBottomSpeakersBtn");
    this.headphonesBtn = document.getElementById(
      "universalBottomHeadphonesBtn",
    );
    console.log("[UniversalPlayer] Elements initialized:", {
      element: !!this.element,
      trackName: !!this.trackName,
      trackArtist: !!this.trackArtist,
      trackCount: !!this.trackCount,
      progressBar: !!this.progressBar,
    });
  }

  _attachEvents() {
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener("click", () =>
        this._togglePlayPause(),
      );
    }
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this._previous());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this._next());
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
    console.log("[UniversalPlayer] Subscribing to events");
    this.events.on("playback:videoStart", (path) =>
      this.startPlayback(path, "video"),
    );
    this.events.on("playback:audioStart", (path) =>
      this.startPlayback(path, "audio"),
    );
    this.events.on("playback:videoStopped", () => this.stop());
    this.events.on("playback:audioStopped", () => this.stop());
    this.events.on("stateChange", (state) => {
      console.log("[UniversalPlayer] stateChange event received:", state);
      this._updateFromState(state);
    });
    this.events.on("trackChanged", ({ album, trackIndex }) => {
      console.log("[UniversalPlayer] trackChanged event received:", {
        album,
        trackIndex,
      });
      if (album && album.tracks && album.tracks[trackIndex]) {
        const track = album.tracks[trackIndex];
        console.log("[UniversalPlayer] Track data:", track);
        this._updateTrackInfo(track.displayName || track.title, album.artist);
        if (track.path) {
          this.currentFile = track.path;
          this._loadAlbumCover(this.currentFile);
        }
      }
    });
    this.events.on("page:changed", (page) => {
      if (page === "video" || page === "audio") {
        this.show();
      } else {
        this.hide();
      }
    });
  }

  _updateFromState(state) {
    console.log("[UniversalPlayer] _updateFromState:", state);
    if (!state) return;
    if (state.currentTrack) {
      this.currentFile = state.currentTrack;
      const fileName = this.currentFile.split("/").pop();
      if (this.trackName) {
        this.trackName.textContent = this._escape(fileName);
        console.log("[UniversalPlayer] Track name set to:", fileName);
      }
    }
    this.isPlaying = state.isPlaying || false;
    this._updatePlayPauseButton(this.isPlaying);
    if (state.currentIndex !== undefined && state.totalTracks !== undefined) {
      if (this.trackCount) {
        this.trackCount.textContent = `${state.currentIndex + 1}/${state.totalTracks}`;
        console.log(
          "[UniversalPlayer] Track count set to:",
          `${state.currentIndex + 1}/${state.totalTracks}`,
        );
      }
    }
  }

  _updateTrackInfo(title, artist) {
    console.log("[UniversalPlayer] _updateTrackInfo:", { title, artist });
    if (this.trackName) this.trackName.textContent = this._escape(title || "—");
    if (this.trackArtist)
      this.trackArtist.textContent = this._escape(artist || "");
  }

  setMediaType(type) {
    this.mediaType = type;
    this._updateMediaIcon();
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
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
    return false;
  }

  async startPlayback(path, type) {
    console.log("[UniversalPlayer] startPlayback called:", { path, type });
    this.mediaType = type;
    this.currentFile = path;
    this._updateFileInfo(path);
    this._updateMediaIcon();
    if (type === "video") {
      await this._loadVideoPreview(path);
      if (this.trackArtist) this.trackArtist.textContent = "Видео";
      try {
        const response = await this.api.post("/api/open", { path });
        if (!response.success) {
          console.error("Failed to open video:", response.error);
          Utils.showNotification(
            response.error || "Ошибка воспроизведения",
            "error",
          );
        } else {
          this.show();
          this._startProgressPolling();
          this._updatePlayPauseButton(true);
        }
      } catch (error) {
        console.error("Error calling /api/open:", error);
        Utils.showNotification("Ошибка запуска видео", "error");
      }
    } else {
      console.log("[UniversalPlayer] Starting audio playback");
      await this._loadAlbumCover(path);
      this.show();
      this._startProgressPolling();
      this._updatePlayPauseButton(true);
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
    const fileName = path.split("/").pop();
    console.log("[UniversalPlayer] _updateFileInfo:", fileName);
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
    } catch (error) {
      console.error("Failed to load preview:", error);
    }
  }

  async _loadAlbumCover(filePath) {
    console.log("[UniversalPlayer] _loadAlbumCover:", filePath);
    if (!this.previewImg || !this.previewIcon) return;
    this.previewImg.style.display = "none";
    this.previewIcon.style.display = "flex";
    this.previewIcon.className = "fas fa-music";
    if (!this.musicApi) {
      console.log("[UniversalPlayer] No musicApi, skipping album cover");
      return;
    }
    try {
      const metadata = await this.musicApi.getFileMetadata(filePath);
      console.log("[UniversalPlayer] Metadata response:", metadata);
      if (
        metadata &&
        metadata.data &&
        metadata.data.file &&
        metadata.data.file.cover
      ) {
        this.previewImg.src = metadata.data.file.cover;
        this.previewImg.style.display = "block";
        this.previewIcon.style.display = "none";
        console.log("[UniversalPlayer] Album cover loaded from file metadata");
        return;
      }
      let artist = "",
        title = "";
      if (metadata && metadata.data && metadata.data.database) {
        artist = metadata.data.database.artist || "";
        title = metadata.data.database.title || "";
      }
      if (!title) {
        const fileName = filePath.split("/").pop();
        title = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
      }
      console.log("[UniversalPlayer] Looking for cover for:", {
        title,
        artist,
      });
      const coverUrl = await this.musicApi.fetchAlbumCover(title, artist);
      if (coverUrl) {
        this.previewImg.src = coverUrl;
        this.previewImg.style.display = "block";
        this.previewIcon.style.display = "none";
        console.log("[UniversalPlayer] Album cover loaded from API");
      }
    } catch (error) {
      console.error("Failed to load album cover:", error);
    }
  }

  _startProgressPolling() {
    if (this._progressInterval) clearInterval(this._progressInterval);
    console.log(
      "[UniversalPlayer] Starting progress polling for mediaType:",
      this.mediaType,
    );
    this._progressInterval = setInterval(async () => {
      if (this._isDestroyed) return;
      try {
        if (this.mediaType === "video") {
          const response = await this.api.get("/api/video/status");
          if (response.success && response.playing) {
            this.isPlaying = !response.paused;
            this._currentTime = response.currentTime || 0;
            this._duration = response.duration || 0;
            this._updateProgressBar(this._currentTime, this._duration);
            this._updateTimeDisplay(this._currentTime, this._duration);
            this._updatePlayPauseButton(this.isPlaying);
          } else if (
            response.success &&
            !response.playing &&
            this.currentFile
          ) {
            if (response.reason === "process_dead") this.stop();
          }
        }
        if (this.playerApi) {
          const timeInfo = await this.playerApi.getCurrentTime();
          if (timeInfo && timeInfo.data) {
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
            if (state.data.currentTrackName && this.trackArtist) {
              this.trackArtist.textContent = state.data.currentTrackName;
            }
          }
        }
      } catch (error) {
        console.error("Failed to get status:", error);
      }
    }, 500);
  }

  _updateProgressBar(currentTime, duration) {
    console.log(
      "[UniversalPlayer] _updateProgressBar called - currentTime:",
      currentTime,
      "duration:",
      duration,
    );
    if (this.progressFill && duration > 0) {
      const percent = (currentTime / duration) * 100;
      console.log(
        "[UniversalPlayer] Setting progress width to:",
        percent + "%",
      );
      this.progressFill.style.width = `${percent}%`;
    } else if (this.progressFill) {
      console.log(
        "[UniversalPlayer] Duration is 0, cannot update progress bar",
      );
    } else {
      console.log("[UniversalPlayer] progressFill element not found");
    }
  }

  _updateTimeDisplay(currentTime, duration) {
    console.log(
      "[UniversalPlayer] _updateTimeDisplay called - currentTime:",
      currentTime,
      "duration:",
      duration,
    );
    if (this.timeCurrent) {
      const formattedCurrent = this._formatTime(currentTime);
      console.log(
        "[UniversalPlayer] Setting current time to:",
        formattedCurrent,
      );
      this.timeCurrent.textContent = formattedCurrent;
    } else {
      console.log("[UniversalPlayer] timeCurrent element not found");
    }
    if (this.timeTotal) {
      if (duration > 0) {
        const formattedDuration = this._formatTime(duration);
        console.log(
          "[UniversalPlayer] Setting total time to:",
          formattedDuration,
        );
        this.timeTotal.textContent = formattedDuration;
      } else {
        console.log(
          "[UniversalPlayer] Duration is 0, setting total time to 0:00",
        );
        this.timeTotal.textContent = "0:00";
      }
    } else {
      console.log("[UniversalPlayer] timeTotal element not found");
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
        console.error("Seek failed:", error);
      }
    } else if (this.playerApi) {
      await this.playerApi.seek(time);
      this._currentTime = time;
      this._updateProgressBar(this._currentTime, this._duration);
      this._updateTimeDisplay(this._currentTime, this._duration);
    }
  }

  async _togglePlayPause() {
    if (!this.currentFile) return;
    if (this.mediaType === "video") {
      const command = this.isPlaying ? "pause" : "play";
      await this.api.post("/api/mpv/control", { command: command });
      this.isPlaying = !this.isPlaying;
      this._updatePlayPauseButton(this.isPlaying);
    } else if (this.playerApi) {
      if (this.isPlaying) {
        await this.playerApi.pause();
      } else {
        await this.playerApi.play();
      }
      this.isPlaying = !this.isPlaying;
      this._updatePlayPauseButton(this.isPlaying);
    }
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

  async stop() {
    if (this._progressInterval) {
      clearInterval(this._progressInterval);
      this._progressInterval = null;
    }
    if (this.mediaType === "video") {
      try {
        await this.api.post("/api/video/close");
      } catch (error) {
        console.error("Failed to close video:", error);
      }
    } else if (this.playerApi) {
      await this.playerApi.stop();
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
    this.hide();
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
      await this.api.post("/api/simple/volume", {
        volume: this._currentVolume,
      });
      if (this._isMuted && newVolume > 0) {
        this._isMuted = false;
        if (this.volumeMute) {
          this.volumeMute.innerHTML = '<i class="fas fa-volume-up"></i>';
          this.volumeMute.classList.remove("muted");
        }
      }
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  }

  async _toggleMute() {
    try {
      const response = await this.api.post("/api/simple/volume/mute");
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
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  }

  async _switchToSpeakers() {
    try {
      const response = await this.api.post("/api/audio/output/speakers");
      if (response.success) {
        this._currentOutput = "speakers";
        this._updateOutputUI();
      }
    } catch (error) {
      console.error("Error switching to speakers:", error);
    }
  }

  async _switchToHeadphones() {
    try {
      const response = await this.api.post("/api/audio/output/headphones");
      if (response.success) {
        this._currentOutput = "headphones";
        this._updateOutputUI();
      }
    } catch (error) {
      console.error("Error switching to headphones:", error);
    }
  }

  _updateVolumeUI() {
    if (this.volumeValue) {
      this.volumeValue.textContent = this._currentVolume + "%";
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
      const response = await this.api.get("/api/simple/volume");
      if (
        response.success &&
        response.data &&
        typeof response.data.volume === "number"
      ) {
        this._currentVolume = response.data.volume;
        this._updateVolumeUI();
      }
    } catch (error) {
      console.error("Failed to load volume:", error);
    }
  }

  async _loadInitialAudioOutput() {
    try {
      const response = await this.api.get("/api/audio/output");
      if (response.success && response.data && response.data.current) {
        this._currentOutput = response.data.current;
        this._updateOutputUI();
      }
    } catch (error) {
      console.error("Failed to load audio output:", error);
    }
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
      } catch (e) {
        console.error("Auto update error:", e);
      }
    }, 1000);
  }

  show() {
    console.log("[UniversalPlayer] show() called");
    if (this.element) {
      this.element.classList.add("active");
      this.element.style.display = "flex";
      console.log("[UniversalPlayer] Panel shown");
    } else {
      console.error("[UniversalPlayer] element is null!");
    }
  }

  hide() {
    if (this.element) {
      this.element.classList.remove("active");
      this.element.style.display = "none";
    }
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0)
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
}
