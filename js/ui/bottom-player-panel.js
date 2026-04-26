class BottomPlayerPanel {
  constructor(playbackController, events, musicApi) {
    this.playback = playbackController;
    this.events = events;
    this.musicApi = musicApi;
    this.element = null;
    this._isAudioPage = false;
    this._pendingTrackPath = null;
    this._currentDisplayedTrack = null;
    this._createPanel();
    this._initElements();
    this._attachEvents();
    this._subscribeToEvents();
    this._startAutoUpdate();
    this._listenToPageChanges();
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
    console.log("_extractTrackNameFromPath:", filePath, "->", fileName);
    return fileName;
  }

  _startAutoUpdate() {
    setInterval(async () => {
      try {
        if (!this._isAudioPage || !this.element) return;
        const timeRes = await fetch("/api/currentTime");
        const timeData = await timeRes.json();
        if (timeData.data && timeData.data.duration > 0) {
          const percent =
            (timeData.data.currentTime / timeData.data.duration) * 100;
          const progressFill = document.getElementById("panelProgressFill");
          if (progressFill) progressFill.style.width = `${percent}%`;
          const timeCurrent = document.getElementById("panelTimeCurrent");
          const timeTotal = document.getElementById("panelTimeTotal");
          if (timeCurrent) {
            const mins = Math.floor(timeData.data.currentTime / 60);
            const secs = Math.floor(timeData.data.currentTime % 60);
            timeCurrent.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
          }
          if (timeTotal && timeData.data.duration) {
            const mins = Math.floor(timeData.data.duration / 60);
            const secs = Math.floor(timeData.data.duration % 60);
            timeTotal.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
          }
          const state = await this.playback.api.getPlaybackState();
          if (state?.data?.currentTrack && this.trackName) {
            const currentTrack = state.data.currentTrack;
            if (this._currentDisplayedTrack !== currentTrack) {
              this._updateTrackNameWithMetadata(currentTrack);
            }
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
