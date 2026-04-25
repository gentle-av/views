class BottomPlayerPanel {
  constructor(playbackController, events) {
    this.playback = playbackController;
    this.events = events;
    this.element = null;
    this._isAudioPage = false;
    this._createPanel();
    this._initElements();
    this._attachEvents();
    this._subscribeToEvents();
    this._startAutoUpdate();
    this._listenToPageChanges();
  }

  _listenToPageChanges() {
    this.events.on("page:changed", (page) => {
      this._isAudioPage = page === "audio";
      if (this.element) {
        if (this._isAudioPage) {
          // Используем класс вместо inline style
          this.element.classList.add('active');
          this.element.style.removeProperty('display');
          this.forceUpdate();
        } else {
          this.element.classList.remove('active');
          this.element.style.display = 'none';
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
      this.playPauseBtn.addEventListener("click", () => this.playback.togglePlayPause());
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
    this.events.on("trackChanged", ({ album, trackIndex }) => this._showTrack(album, trackIndex));
    this.events.on("playlistCleared", () => this._onPlaylistCleared());
  }

  _startAutoUpdate() {
    setInterval(async () => {
      try {
        if (!this._isAudioPage || !this.element) return;
        const stateRes = await fetch("/api/playbackState");
        const stateData = await stateRes.json();
        const state = stateData.data;
        if (state) {
          const trackCountEl = document.getElementById("panelTrackCount");
          const playPauseBtn = document.getElementById("panelPlayPauseBtn");
          if (trackCountEl) {
            trackCountEl.textContent = `${(state.currentIndex || 0) + 1}/${state.totalTracks || 0}`;
          }
          if (playPauseBtn) {
            playPauseBtn.innerHTML = state.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
          }
        }
        const res = await fetch("/api/currentTrack");
        const data = await res.json();
        if (data.success && data.data) {
          const trackNameEl = document.getElementById("panelTrackName");
          if (trackNameEl && data.data.track) {
            trackNameEl.textContent = data.data.track;
          }
        }
        const timeRes = await fetch("/api/currentTime");
        const timeData = await timeRes.json();
        if (timeData.data && timeData.data.duration > 0) {
          const percent = (timeData.data.currentTime / timeData.data.duration) * 100;
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

  _updateFromState(state) {
    if (!this.element || !this._isAudioPage) return;
    if (!state) return;
    if (this.trackCount) {
      this.trackCount.textContent = `${(state.currentIndex || 0) + 1}/${state.totalTracks || 0}`;
    }
    let trackNameText = "—";
    if (state.totalTracks > 0) {
      trackNameText = state.track || "—";
    }
    if (this.trackName) this.trackName.textContent = trackNameText;
    const timeInfo = this.playback.api.getCurrentTime ? await this.playback.api.getCurrentTime() : null;
    if (timeInfo?.data && state.totalTracks > 0) {
      const current = timeInfo.data.currentTime || 0;
      const duration = timeInfo.data.duration || 0;
      if (this.timeCurrent) this.timeCurrent.textContent = this._formatTime(current);
      if (this.timeTotal) this.timeTotal.textContent = this._formatTime(duration);
      if (this.progressFill && duration > 0) {
        this.progressFill.style.width = `${(current / duration) * 100}%`;
      }
    }
    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML = state.isPlaying && state.totalTracks > 0
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
    if (this.playPauseBtn) this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
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
