class BottomPlayerPanel {
  constructor(playbackController, events) {
    this.playback = playbackController;
    this.events = events;
    this.element = null;
    this._progressInterval = null;
    this._initElements();
  }

  _initElements() {
    this.element = document.getElementById("audioPlayerControlPanel");
    if (!this.element) this._createPanel();

    this.playPauseBtn = document.getElementById("panelPlayPauseBtn");
    this.prevBtn = document.getElementById("panelPrevBtn");
    this.nextBtn = document.getElementById("panelNextBtn");
    this.stopBtn = document.getElementById("panelStopBtn");
    this.clearBtn = document.getElementById("panelClearBtn");
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
          <button id="panelClearBtn" class="player-panel-btn" title="Очистить"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `;
    document.body.appendChild(this.element);
    this._initElements();
  }

  _attachEvents() {
    this.playPauseBtn?.addEventListener("click", () =>
      this.playback.togglePlayPause(),
    );
    this.prevBtn?.addEventListener("click", () => this.playback.previous());
    this.nextBtn?.addEventListener("click", () => this.playback.next());
    this.stopBtn?.addEventListener("click", () => this.playback.stop());
    this.clearBtn?.addEventListener("click", () =>
      this.playback.api.clearPlaylist(),
    );
    this.progressBar?.addEventListener("click", async (e) => {
      const rect = this.progressBar.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      await this.playback.seek(percent, this.progressBar);
    });
  }

  _subscribeToEvents() {
    this.events.on("stateChange", (state) => this._updateFromState(state));
    this.events.on("albumChanged", (album) => this._showAlbum(album));
    this.events.on("trackChanged", ({ album, trackIndex }) =>
      this._showTrack(album, trackIndex),
    );
  }

  async _updateFromState(state) {
    if (!state) return;

    if (state.totalTracks > 0) {
      this.element.classList.add("active");
    } else {
      this.element.classList.remove("active");
      return;
    }

    if (this.trackCount) {
      this.trackCount.textContent = `${(state.currentIndex || 0) + 1}/${state.totalTracks || 0}`;
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

    if (this.playPauseBtn) {
      this.playPauseBtn.innerHTML = state.isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    }
  }

  _showAlbum(album) {
    if (this.trackName) this.trackName.textContent = album.title;
    if (this.trackArtist) this.trackArtist.textContent = album.artist;
  }

  _showTrack(album, trackIndex) {
    const track = album.tracks[trackIndex];
    if (this.trackName) this.trackName.textContent = track.displayName;
    if (this.trackArtist) this.trackArtist.textContent = album.artist;
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}
