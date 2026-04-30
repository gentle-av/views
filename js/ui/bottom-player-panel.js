class BottomPlayerPanel {
  constructor(playbackController, events, musicApi) {
    this.playback = playbackController;
    this.events = events;
    this.musicApi = musicApi;
    this.element = null;
    this._isAudioPage = false;
    this._pendingTrackPath = null;
    this._currentDisplayedTrack = null;
    this._volume = 50;
    this._isMuted = false;
    this._currentOutput = "speakers";
    this._audioSettingsCollapsed = this._loadSettingsState();
    this._createPanel();
    this._initElements();
    this._attachEvents();
    this._subscribeToEvents();
    this._startAutoUpdate();
    this._listenToPageChanges();
    this._loadInitialVolume();
    this._loadInitialAudioOutput();
  }

  _loadSettingsState() {
    try {
      const saved = localStorage.getItem("audioSettingsCollapsed");
      return saved === "true";
    } catch (e) {
      return false;
    }
  }

  _saveSettingsState() {
    try {
      localStorage.setItem(
        "audioSettingsCollapsed",
        this._audioSettingsCollapsed,
      );
    } catch (e) {}
  }

  async _loadInitialVolume() {
    try {
      const response = await fetch("/api/simple/volume");
      const data = await response.json();
      if (data.success && data.data && typeof data.data.volume === "number") {
        this._volume = data.data.volume;
        this._isMuted = false;
        this._updateVolumeUI();
      }
    } catch (error) {
      console.error("Failed to load volume:", error);
    }
  }

  async _loadInitialAudioOutput() {
    try {
      const response = await fetch("/api/audio/output");
      const data = await response.json();
      if (data.success && data.data && data.data.current) {
        this._currentOutput = data.data.current;
        this._updateOutputUI();
      }
    } catch (error) {
      console.error("Failed to load audio output:", error);
    }
  }

  async _updateTrackNameWithMetadata(filePath) {
    if (this._currentDisplayedTrack === filePath) return;
    this._pendingTrackPath = filePath;
    const metadataTitle = await this._fetchTrackMetadata(filePath);
    if (this._pendingTrackPath !== filePath) return;
    if (metadataTitle && this.trackName) {
      this.trackName.textContent = metadataTitle;
      this._currentDisplayedTrack = filePath;
    } else if (this.trackName && this._currentDisplayedTrack !== filePath) {
      const pathName = this._extractTrackNameFromPath(filePath);
      this.trackName.textContent = pathName;
      this._currentDisplayedTrack = filePath;
    }
    this._pendingTrackPath = null;
  }

  async _fetchTrackMetadata(filePath) {
    if (!this.musicApi) return null;
    try {
      const response = await this.musicApi.getFileMetadata(filePath);
      if (
        response &&
        response.data &&
        response.data.file &&
        response.data.file.title
      ) {
        return response.data.file.title;
      }
      if (
        response &&
        response.data &&
        response.data.database &&
        response.data.database.title
      ) {
        const dbTitle = response.data.database.title;
        if (dbTitle && dbTitle !== "Unknown") {
          return dbTitle;
        }
      }
    } catch (error) {
      console.error("Failed to fetch metadata:", error);
    }
    return null;
  }

  _listenToPageChanges() {
    this.events.on("page:changed", (page) => {
      this._isAudioPage = page === "audio";
      if (this.element) {
        if (this._isAudioPage) {
          this.element.classList.add("active");
          this.element.style.removeProperty("display");
          this.forceUpdate();
        } else {
          this.element.classList.remove("active");
          this.element.style.display = "none";
        }
      }
    });
  }

  _initElements() {
    this.element = document.getElementById("audioPlayerControlPanel");
    if (!this.element) return;
    this.playPauseBtn = document.getElementById("panelPlayPauseBtn");
    this.prevBtn = document.getElementById("panelPrevBtn");
    this.nextBtn = document.getElementById("panelNextBtn");
    this.stopBtn = document.getElementById("panelStopBtn");
    this.progressBar = document.getElementById("panelProgressBar");
    this.progressFill = document.getElementById("panelProgressFill");
    this.trackName = document.getElementById("panelTrackName");
    this.trackArtist = document.getElementById("panelTrackArtist");
    this.timeCurrent = document.getElementById("panelTimeCurrent");
    this.timeTotal = document.getElementById("panelTimeTotal");
    this.trackCount = document.getElementById("panelTrackCount");
    this.volumeDownBtn = document.getElementById("panelVolumeDownBtn");
    this.volumeUpBtn = document.getElementById("panelVolumeUpBtn");
    this.volumeValue = document.getElementById("panelVolumeValue");
    this.volumeMuteBtn = document.getElementById("panelVolumeMuteBtn");
    this.speakersBtn = document.getElementById("panelSpeakersBtn");
    this.headphonesBtn = document.getElementById("panelHeadphonesBtn");
    this.settingsToggleBtn = document.getElementById("panelSettingsToggleBtn");
    this.audioSettingsContainer = document.getElementById("panelAudioSettings");
  }

  _createPanel() {
    if (document.getElementById("audioPlayerControlPanel")) return;
    this.element = document.createElement("div");
    this.element.id = "audioPlayerControlPanel";
    this.element.className = "audio-player-control-panel";
    this.element.innerHTML = `
      <div class="player-panel-content">
        <div class="player-panel-info">
          <div class="player-panel-track-info">
            <div id="panelTrackName" class="player-panel-track-name">—</div>
            <div id="panelTrackArtist" class="player-panel-track-artist"></div>
          </div>
          <div class="player-panel-progress">
            <span id="panelTimeCurrent" class="player-panel-time-current">0:00</span>
            <div id="panelProgressBar" class="player-panel-progress-bar">
              <div id="panelProgressFill" class="player-panel-progress-fill"></div>
            </div>
            <span id="panelTimeTotal" class="player-panel-time-total">0:00</span>
            <span id="panelTrackCount" class="player-panel-track-count">0/0</span>
          </div>
        </div>
        <div class="player-panel-controls">
          <button id="panelPrevBtn" class="player-panel-btn" title="Предыдущий"><i class="fas fa-backward"></i></button>
          <button id="panelPlayPauseBtn" class="player-panel-btn player-panel-play" title="Play/Pause"><i class="fas fa-play"></i></button>
          <button id="panelStopBtn" class="player-panel-btn" title="Стоп"><i class="fas fa-stop"></i></button>
          <button id="panelNextBtn" class="player-panel-btn" title="Следующий"><i class="fas fa-forward"></i></button>
          <button id="panelSettingsToggleBtn" class="player-panel-btn player-panel-settings-toggle" title="Настройки аудио"><i class="fas fa-sliders-h"></i></button>
        </div>
      </div>
      <div id="panelAudioSettings" class="player-panel-audio-settings ${this._audioSettingsCollapsed ? "collapsed" : ""}">
        <div class="player-panel-volume-section">
          <div class="player-panel-volume-controls">
            <button id="panelVolumeDownBtn" class="player-panel-volume-btn" title="Уменьшить громкость"><i class="fas fa-minus"></i></button>
            <button id="panelVolumeMuteBtn" class="player-panel-volume-mute" title="Мьют"><i class="fas fa-volume-up"></i></button>
            <button id="panelVolumeUpBtn" class="player-panel-volume-btn" title="Увеличить громкость"><i class="fas fa-plus"></i></button>
            <span id="panelVolumeValue" class="player-panel-volume-value">50%</span>
          </div>
        </div>
        <div class="player-panel-output-section">
          <span class="player-panel-output-label"><i class="fas fa-exchange-alt"></i> Аудиовыход:</span>
          <button id="panelSpeakersBtn" class="player-panel-output-btn speakers-btn" title="Колонки">
            <i class="fas fa-volume-up"></i><span>Колонки</span>
          </button>
          <button id="panelHeadphonesBtn" class="player-panel-output-btn headphones-btn" title="Наушники">
            <i class="fas fa-headphones"></i><span>Наушники</span>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(this.element);
  }

  _attachEvents() {
    if (!this.element) return;
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener("click", () =>
        this.playback.togglePlayPause(),
      );
    }
    if (this.prevBtn) {
      this.prevBtn.addEventListener("click", () => this.playback.previous());
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener("click", () => this.playback.next());
    }
    if (this.stopBtn) {
      this.stopBtn.addEventListener("click", () => this.playback.stop());
    }
    if (this.progressBar) {
      this.progressBar.addEventListener("click", async (e) => {
        const rect = this.progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const timeInfo = await this.playback.api.getCurrentTime();
        if (timeInfo?.data?.duration) {
          const seekTime = timeInfo.data.duration * percent;
          await this.playback.api.seek(seekTime);
        }
      });
    }
    if (this.volumeDownBtn) {
      this.volumeDownBtn.addEventListener("click", () =>
        this._changeVolume(-5),
      );
    }
    if (this.volumeUpBtn) {
      this.volumeUpBtn.addEventListener("click", () => this._changeVolume(5));
    }
    if (this.volumeMuteBtn) {
      this.volumeMuteBtn.addEventListener("click", () => this._toggleMute());
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
    if (this.settingsToggleBtn) {
      this.settingsToggleBtn.addEventListener("click", () =>
        this._toggleAudioSettings(),
      );
    }
  }

  async _changeVolume(delta) {
    const newVolume = Math.min(100, Math.max(0, this._volume + delta));
    if (newVolume === this._volume) return;
    this._volume = newVolume;
    this._updateVolumeUI();
    try {
      const response = await fetch("/api/simple/volume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: this._volume }),
      });
      const data = await response.json();
      if (!data.success) {
        console.error("Failed to set volume:", data.message);
      }
      if (this._isMuted && newVolume > 0) {
        this._isMuted = false;
        if (this.volumeMuteBtn) {
          this.volumeMuteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
      }
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  }

  async _toggleMute() {
    try {
      const response = await fetch("/api/simple/volume/mute", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success && data.data) {
        this._isMuted = data.data.muted;
        if (this.volumeMuteBtn) {
          if (this._isMuted) {
            this.volumeMuteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
            this.volumeMuteBtn.classList.add("muted");
          } else {
            this.volumeMuteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
            this.volumeMuteBtn.classList.remove("muted");
          }
        }
      }
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  }

  async _switchToSpeakers() {
    try {
      const response = await fetch("/api/audio/output/speakers", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        this._currentOutput = "speakers";
        this._updateOutputUI();
        this._showNotification("Переключено на колонки");
      }
    } catch (error) {
      console.error("Error switching to speakers:", error);
    }
  }

  async _switchToHeadphones() {
    try {
      const response = await fetch("/api/audio/output/headphones", {
        method: "POST",
      });
      const data = await response.json();
      if (data.success) {
        this._currentOutput = "headphones";
        this._updateOutputUI();
        this._showNotification("Переключено на наушники");
      }
    } catch (error) {
      console.error("Error switching to headphones:", error);
    }
  }

  _updateVolumeUI() {
    if (this.volumeValue) {
      this.volumeValue.textContent = this._volume + "%";
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

  _toggleAudioSettings() {
    this._audioSettingsCollapsed = !this._audioSettingsCollapsed;
    this._saveSettingsState();
    if (this.audioSettingsContainer) {
      if (this._audioSettingsCollapsed) {
        this.audioSettingsContainer.classList.add("collapsed");
      } else {
        this.audioSettingsContainer.classList.remove("collapsed");
      }
    }
    if (this.settingsToggleBtn) {
      if (this._audioSettingsCollapsed) {
        this.settingsToggleBtn.classList.add("collapsed");
      } else {
        this.settingsToggleBtn.classList.remove("collapsed");
      }
    }
  }

  _showNotification(message) {
    const notification = document.createElement("div");
    notification.className = "player-panel-notification";
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => {
      notification.classList.add("fade-out");
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  _subscribeToEvents() {
    this.events.on("stateChange", (state) => this._updateFromState(state));
    this.events.on("albumChanged", (album) => this._showAlbum(album));
    this.events.on("trackChanged", ({ album, trackIndex }) =>
      this._showTrack(album, trackIndex),
    );
    this.events.on("playlistCleared", () => this._onPlaylistCleared());
  }

  _extractTrackNameFromPath(filePath) {
    if (!filePath) return null;
    const parts = filePath.split("/");
    let fileName = parts[parts.length - 1];
    fileName = fileName.replace(/\.(flac|mp3|m4a|wav|ogg|aac)$/i, "");
    return fileName;
  }

  _startAutoUpdate() {
    setInterval(async () => {
      try {
        if (!this._isAudioPage || !this.element) return;
        const state = await this.playback.api.getPlaybackState();
        if (state?.data) {
          const currentTrack = state.data.currentTrack;
          if (
            this.trackName &&
            currentTrack &&
            this._currentDisplayedTrack !== currentTrack
          ) {
            this._updateTrackNameWithMetadata(currentTrack);
          }
          if (this.trackCount) {
            this.trackCount.textContent = `${(state.data.currentIndex || 0) + 1}/${state.data.totalTracks || 0}`;
          }
          if (this.playPauseBtn) {
            const isPlaying =
              state.data.isPlaying && state.data.totalTracks > 0;
            this.playPauseBtn.innerHTML = isPlaying
              ? '<i class="fas fa-pause"></i>'
              : '<i class="fas fa-play"></i>';
          }
        }
        const timeInfo = await this.playback.api.getCurrentTime();
        if (timeInfo?.data) {
          const current = timeInfo.data.currentTime || 0;
          const duration = timeInfo.data.duration || 0;
          if (this.timeCurrent)
            this.timeCurrent.textContent = this._formatTime(current);
          if (this.timeTotal)
            this.timeTotal.textContent = this._formatTime(duration);
          if (this.progressFill && duration > 0) {
            this.progressFill.style.width = `${(current / duration) * 100}%`;
          }
        }
      } catch (e) {
        console.error("Auto update error:", e);
      }
    }, 1000);
  }

  _updateFromState(state) {
    if (!this.element || !this._isAudioPage) return;
    if (!state) return;
    if (this.trackCount) {
      this.trackCount.textContent = `${(state.currentIndex || 0) + 1}/${state.totalTracks || 0}`;
    }
    if (
      this.trackName &&
      state.currentTrack &&
      this._currentDisplayedTrack !== state.currentTrack
    ) {
      this._updateTrackNameWithMetadata(state.currentTrack);
    }
    if (
      state.currentTime !== undefined &&
      state.duration !== undefined &&
      state.totalTracks > 0
    ) {
      const current = state.currentTime || 0;
      const duration = state.duration || 0;
      if (this.timeCurrent)
        this.timeCurrent.textContent = this._formatTime(current);
      if (this.timeTotal)
        this.timeTotal.textContent = this._formatTime(duration);
      if (this.progressFill && duration > 0) {
        this.progressFill.style.width = `${(current / duration) * 100}%`;
      }
    }
    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML =
        state.isPlaying && state.totalTracks > 0
          ? '<i class="fas fa-pause"></i>'
          : '<i class="fas fa-play"></i>';
    }
  }

  _showAlbum(album) {
    if (!this.element || !this._isAudioPage) return;
    if (this.trackName) this.trackName.textContent = album.title;
    if (this.trackArtist) this.trackArtist.textContent = album.artist;
  }

  _showTrack(album, trackIndex) {
    if (!this.element || !this._isAudioPage) return;
    const track = album.tracks[trackIndex];
    if (track && track.displayName) {
      if (this.trackName) this.trackName.textContent = track.displayName;
      if (this.trackArtist) this.trackArtist.textContent = album.artist;
      if (track.path) this._currentDisplayedTrack = track.path;
    }
  }

  _onPlaylistCleared() {
    if (!this.element || !this._isAudioPage) return;
    if (this.trackName) this.trackName.textContent = "—";
    if (this.trackArtist) this.trackArtist.textContent = "";
    if (this.trackCount) this.trackCount.textContent = "0/0";
    if (this.timeCurrent) this.timeCurrent.textContent = "0:00";
    if (this.timeTotal) this.timeTotal.textContent = "0:00";
    if (this.progressFill) this.progressFill.style.width = "0%";
    if (this.playPauseBtn)
      this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    this._currentDisplayedTrack = null;
    this._pendingTrackPath = null;
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  forceUpdate() {
    if (!this.element || !this._isAudioPage) return;
    this.element.style.display = "flex";
    this.element.classList.add("active");
  }
}
