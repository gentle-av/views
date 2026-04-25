class BottomPlayerPanel {
  constructor(playbackController, events) {
    this.playback = playbackController;
    this.events = events;
    this.element = null;
    this._isAudioPage = false;
    this._initElements();
    this._listenToPageChanges();
    this._startAutoUpdate();
  }

  _listenToPageChanges() {
    this.events.on("page:changed", (page) => {
      this._isAudioPage = page === "audio";
      if (this._isAudioPage) {
        this._createPanelIfNeeded();
        if (this.element) {
          this.element.classList.add("active");
        }
      } else {
        this._removePanel();
      }
    });
  }

  _createPanelIfNeeded() {
    if (this.element && document.body.contains(this.element)) {
      return;
    }
    this._createPanel();
    this._initElements();
    this._attachEvents();
    this._subscribeToEvents();
  }

  _removePanel() {
    if (this.element && this.element.remove) {
      this.element.remove();
    }
    this.element = null;
    this.playPauseBtn = null;
    this.prevBtn = null;
    this.nextBtn = null;
    this.stopBtn = null;
    this.progressBar = null;
    this.progressFill = null;
    this.trackName = null;
    this.trackArtist = null;
    this.timeCurrent = null;
    this.timeTotal = null;
    this.trackCount = null;
  }

  _initElements() {
    this.element = document.getElementById("audioPlayerControlPanel");
    if (!this.element && this._isAudioPage) {
      this._createPanel();
    }
    if (!this.element) return;
    this.element.classList.add("active");
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
    this._attachEvents();
    this._subscribeToEvents();
  }

  _createPanel() {
    if (this.element) return;
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

  _startAutoUpdate() {
    let lastTrack = "";
    setInterval(async () => {
      try {
        const panel = document.getElementById("audioPlayerControlPanel");
        if (!panel || !this._isAudioPage) {
          return;
        }
        const res = await fetch("/api/currentTrack");
        const data = await res.json();
        if (data.success && data.data) {
          let trackName = data.data.track || "—";
          if (trackName !== lastTrack) {
            lastTrack = trackName;
            const trackNameEl = document.getElementById("panelTrackName");
            if (trackNameEl) {
              trackNameEl.textContent = trackName;
            }
          }
        }
        const stateRes = await fetch("/api/playbackState");
        const stateData = await stateRes.json();
        const state = stateData.data;
        if (state) {
          const trackCountEl = document.getElementById("panelTrackCount");
          const playPauseBtn = document.getElementById("panelPlayPauseBtn");
          if (trackCountEl)
            trackCountEl.textContent = `${(state.currentIndex || 0) + 1}/${state.totalTracks || 0}`;
          if (playPauseBtn)
            playPauseBtn.innerHTML = state.isPlaying
              ? '<i class="fas fa-pause"></i>'
              : '<i class="fas fa-play"></i>';
          if (panel)
            panel.style.display = state.totalTracks > 0 ? "flex" : "none";
        }
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
          if (timeTotal) {
            const mins = Math.floor(timeData.data.duration / 60);
            const secs = Math.floor(timeData.data.duration % 60);
            timeTotal.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
          }
        }
      } catch (e) {
        console.error("Auto update error:", e);
      }
    }, 500);
  }

  async _updateFromState(state) {
    if (!this.element || !this._isAudioPage) return;
    if (!state) return;
    if (this.trackCount) {
      this.trackCount.textContent = `${(state.currentIndex || 0) + 1}/${state.totalTracks || 0}`;
    }
    let trackNameText = "—";
    if (state.totalTracks > 0) {
      trackNameText = state.track || "—";
    }
    const timeInfo = await this.playback.api.getCurrentTime();
    if (timeInfo?.data && state.totalTracks > 0) {
      const current = timeInfo.data.currentTime || 0;
      const duration = timeInfo.data.duration || 0;
      if (this.timeCurrent)
        this.timeCurrent.textContent = this._formatTime(current);
      if (this.timeTotal)
        this.timeTotal.textContent = this._formatTime(duration);
      if (this.progressFill && duration > 0) {
        this.progressFill.style.width = `${(current / duration) * 100}%`;
      }
    } else {
      if (this.timeCurrent) this.timeCurrent.textContent = "0:00";
      if (this.timeTotal) this.timeTotal.textContent = "0:00";
      if (this.progressFill) this.progressFill.style.width = "0%";
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
    if (this.trackName) this.trackName.textContent = track.displayName;
    if (this.trackArtist) this.trackArtist.textContent = album.artist;
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
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}
