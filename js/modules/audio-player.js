const AudioPlayer = {
  currentAlbum: null,
  currentTrackIndex: -1,
  tracks: [],
  isPlaying: false,
  serverUrl: null,
  playerAvailable: false,
  panelUpdateInterval: null,
  lastTrackPath: null,
  manuallyStopped: false,
  isSwitching: false,
  initialized: false,
  panelPlayPauseBtn: null,
  panelPrevBtn: null,
  panelNextBtn: null,
  panelStopBtn: null,
  panelClearBtn: null,
  panelProgressBar: null,
  panelTrackName: null,
  panelTrackArtist: null,
  panelTimeCurrent: null,
  panelTimeTotal: null,
  panelProgressFill: null,
  panelTrackCount: null,

  getServerUrl() {
    if (!this.serverUrl) {
      this.serverUrl = `http://${window.location.hostname}:${window.location.port}`;
    }
    return this.serverUrl;
  },

  async checkPlayerAvailable() {
    try {
      const response = await fetch(`${this.getServerUrl()}/api/playbackState`);
      if (response.ok) {
        const data = await response.json();
        this.playerAvailable = data.success === true;
        return this.playerAvailable;
      }
    } catch (error) {
      console.log("[AudioPlayer] Player not available:", error.message);
    }
    this.playerAvailable = false;
    return false;
  },

  async sendToPlayer(endpoint, data = null, method = "POST") {
    if (!this.playerAvailable) {
      await this.checkPlayerAvailable();
      if (!this.playerAvailable) return null;
    }
    try {
      const url = `${this.getServerUrl()}${endpoint}`;
      const options = {
        method: method,
        headers: { "Content-Type": "application/json" },
      };
      if (data && method === "POST") {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(url, options);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`Player API error: ${endpoint}`, error);
      this.playerAvailable = false;
      return null;
    }
  },

  async getPlaybackState() {
    return await this.sendToPlayer("/api/playbackState", null, "GET");
  },

  async getPlaylist() {
    return await this.sendToPlayer("/api/getPlaylist", null, "GET");
  },

  async getCurrentTime() {
    return await this.sendToPlayer("/api/currentTime", null, "GET");
  },

  async play() {
    if (this.isSwitching) return null;
    return await this.sendToPlayer("/api/play");
  },

  async pause() {
    if (this.isSwitching) return null;
    return await this.sendToPlayer("/api/pause");
  },

  async stop() {
    this.manuallyStopped = true;
    const result = await this.sendToPlayer("/api/stop");
    setTimeout(() => {
      this.manuallyStopped = false;
    }, 500);
    return result;
  },

  async previous() {
    if (this.isSwitching) return null;
    this.isSwitching = true;
    const result = await this.sendToPlayer("/api/previous");
    if (result && result.success) {
      await this.delay(300);
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    this.isSwitching = false;
    return result;
  },

  async next() {
    if (this.isSwitching) return null;
    this.isSwitching = true;
    const state = await this.getPlaybackState();
    if (state && state.data) {
      if (state.data.currentIndex + 1 >= state.data.totalTracks) {
        await this.stop();
        if (this.panelTrackName)
          this.panelTrackName.textContent = "Воспроизведение завершено";
        if (this.panelPlayPauseBtn)
          this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        this.isSwitching = false;
        return null;
      }
    }
    const result = await this.sendToPlayer("/api/next");
    if (result && result.success) {
      await this.delay(500);
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    this.isSwitching = false;
    return result;
  },

  async setPlaylist(tracks) {
    this.manuallyStopped = false;
    const result = await this.sendToPlayer("/api/setPlaylist", {
      tracks: tracks,
    });
    if (result && result.success) {
      await this.delay(300);
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    return result;
  },

  async clearPlaylist() {
    this.manuallyStopped = false;
    const result = await this.sendToPlayer("/api/clear");
    if (result && result.success) {
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
      await this.updateUI();
    }
    return result;
  },

  async playIndex(index) {
    if (this.isSwitching) return null;
    this.isSwitching = true;
    const result = await this.sendToPlayer("/api/playIndex", { index: index });
    if (result && result.success) {
      await this.delay(300);
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    this.isSwitching = false;
    return result;
  },

  async playSingleTrack(album, trackIndex) {
    this.manuallyStopped = false;
    const track = album.tracks[trackIndex];
    const started = await this.checkPlayerAvailable();
    if (!started) return;
    await this.stop();
    await this.delay(100);
    const result = await this.setPlaylist([track.path]);
    if (result && result.success) {
      this.currentAlbum = album;
      this.tracks = [...album.tracks];
      this.currentTrackIndex = trackIndex;
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
  },

  async replacePlaylistWithAlbum(album) {
    this.manuallyStopped = false;
    const started = await this.checkPlayerAvailable();
    if (!started) return;
    await this.stop();
    await this.delay(100);
    const trackPaths = album.tracks.map((t) => t.path);
    const result = await this.setPlaylist(trackPaths);
    if (result && result.success) {
      this.currentAlbum = album;
      this.tracks = [...album.tracks];
      this.currentTrackIndex = 0;
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
      await this.updateUI();
    }
  },

  async togglePlayPause() {
    if (this.isSwitching) return;
    const state = await this.getPlaybackState();
    if (state && state.data) {
      if (state.data.isPlaying) {
        await this.pause();
      } else {
        await this.play();
      }
    }
    await this.updateUI();
  },

  async stopPlayback() {
    await this.stop();
    this.isPlaying = false;
    if (this.panelPlayPauseBtn) {
      this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    if (this.panelTrackName)
      this.panelTrackName.textContent = "Воспроизведение остановлено";
    if (this.panelTrackArtist) this.panelTrackArtist.textContent = "";
    if (this.panelTimeCurrent) this.panelTimeCurrent.textContent = "0:00";
    if (this.panelTimeTotal) this.panelTimeTotal.textContent = "0:00";
    if (this.panelProgressFill) this.panelProgressFill.style.width = "0%";
    if (typeof PlaylistViewer !== "undefined") {
      PlaylistViewer.refresh();
    }
  },

  async fetchTrackMetadata(filePath) {
    try {
      const response = await fetch(
        `${this.getServerUrl()}/api/music/file-metadata?path=${encodeURIComponent(filePath)}`,
      );
      const data = await response.json();
      if (data.status === "success" && data.data) {
        const dbData = data.data.database;
        const fileData = data.data.file;
        return {
          duration: dbData?.duration || fileData?.duration || 0,
          title: dbData?.title || fileData?.title || "",
          artist: dbData?.artist || fileData?.artist || "",
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching metadata:", error);
      return null;
    }
  },

  async seekTo(e) {
    if (!this.panelProgressBar) return;
    const rect = this.panelProgressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const timeInfo = await this.getCurrentTime();
    if (!timeInfo || !timeInfo.success || !timeInfo.data) return;
    const duration = timeInfo.data.duration;
    if (duration <= 0) return;
    const seekTime = duration * percent;
    await this.sendToPlayer("/api/seek", { position: seekTime }, "POST");
    setTimeout(() => this.updateUI(), 100);
  },

  formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  disablePanel(disabled) {
    const btns = [
      this.panelPlayPauseBtn,
      this.panelPrevBtn,
      this.panelNextBtn,
      this.panelStopBtn,
    ];
    btns.forEach((btn) => {
      if (btn) {
        btn.disabled = disabled;
        btn.style.opacity = disabled ? "0.5" : "1";
        btn.style.cursor = disabled ? "not-allowed" : "pointer";
      }
    });
    if (this.panelProgressBar) {
      this.panelProgressBar.style.cursor = disabled ? "not-allowed" : "pointer";
      this.panelProgressBar.style.opacity = disabled ? "0.5" : "1";
    }
  },

  async updateUI() {
    this.panelProgressFill = document.getElementById("panelProgressFill");
    this.panelProgressBar = document.getElementById("panelProgressBar");
    this.panelTimeCurrent = document.getElementById("panelTimeCurrent");
    this.panelTimeTotal = document.getElementById("panelTimeTotal");
    this.panelTrackName = document.getElementById("panelTrackName");
    this.panelTrackArtist = document.getElementById("panelTrackArtist");
    this.panelPlayPauseBtn = document.getElementById("panelPlayPauseBtn");
    this.panelTrackCount = document.getElementById("panelTrackCount");
    if (!this.playerAvailable) {
      await this.checkPlayerAvailable();
      if (!this.playerAvailable) {
        this.disablePanel(true);
        return;
      }
    }
    const state = await this.getPlaybackState();
    if (!state || !state.success) {
      this.disablePanel(true);
      return;
    }
    const panel = document.getElementById("audioPlayerControlPanel");
    const hasTracks = state.data && state.data.totalTracks > 0;
    if (panel) {
      if (hasTracks) {
        panel.classList.add("active");
      } else {
        panel.classList.remove("active");
      }
    }
    if (!hasTracks) {
      this.disablePanel(true);
      if (this.panelTrackName)
        this.panelTrackName.textContent = "Нет треков в плейлисте";
      if (this.panelTrackArtist) this.panelTrackArtist.textContent = "";
      if (this.panelTimeCurrent) this.panelTimeCurrent.textContent = "0:00";
      if (this.panelTimeTotal) this.panelTimeTotal.textContent = "0:00";
      if (this.panelProgressFill) {
        this.panelProgressFill.style.width = "0%";
      }
      if (this.panelPlayPauseBtn)
        this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      return;
    }
    if (this.manuallyStopped) return;
    this.disablePanel(false);
    let trackName = "—";
    let trackArtist = "";
    if (state.data.currentTrack) {
      const metadata = await this.fetchTrackMetadata(state.data.currentTrack);
      if (metadata && metadata.title) {
        trackName = metadata.title;
        trackArtist = metadata.artist || "";
      } else {
        trackName = state.data.currentTrack.split("/").pop();
      }
    }
    if (this.panelTrackName) this.panelTrackName.textContent = trackName;
    if (this.panelTrackArtist) this.panelTrackArtist.textContent = trackArtist;
    let currentTime = 0;
    let duration = 0;
    const timeInfo = await this.getCurrentTime();
    if (timeInfo && timeInfo.success && timeInfo.data) {
      currentTime = timeInfo.data.currentTime || 0;
      duration = timeInfo.data.duration || 0;
    }
    if (duration === 0 && state.data.currentTrack) {
      const metadata = await this.fetchTrackMetadata(state.data.currentTrack);
      if (metadata && metadata.duration) {
        duration = metadata.duration;
      }
    }
    if (this.panelTimeCurrent)
      this.panelTimeCurrent.textContent = this.formatTime(currentTime);
    if (this.panelTimeTotal)
      this.panelTimeTotal.textContent = this.formatTime(duration);
    if (this.panelProgressFill && duration > 0) {
      const percent = (currentTime / duration) * 100;
      const widthPercent = Math.min(percent, 100) + "%";
      this.panelProgressFill.style.width = widthPercent;
    } else if (this.panelProgressFill) {
      this.panelProgressFill.style.width = "0%";
    }
    if (this.panelPlayPauseBtn) {
      if (state.data.isPlaying && state.data.currentTrack) {
        this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    }
    if (this.panelTrackCount) {
      this.panelTrackCount.textContent = `${(state.data.currentIndex || 0) + 1}/${state.data.totalTracks || 0}`;
    }
  },

  createPanelIfNeeded() {
    let panel = document.getElementById("audioPlayerControlPanel");
    if (!panel) {
      console.log("[AudioPlayer] Creating control panel");
      panel = document.createElement("div");
      panel.id = "audioPlayerControlPanel";
      panel.className = "audio-player-control-panel";
      panel.innerHTML = `
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
            <button id="panelClearBtn" class="player-panel-btn" title="Очистить плейлист"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
    }
    return panel;
  },

  setupEventListeners() {
    const playBtn = document.getElementById("playerPlayBtn");
    const prevBtn = document.getElementById("playerPrevBtn");
    const nextBtn = document.getElementById("playerNextBtn");
    const stopBtn = document.getElementById("playerStopBtn");
    if (playBtn) {
      const newBtn = playBtn.cloneNode(true);
      playBtn.parentNode.replaceChild(newBtn, playBtn);
      newBtn.addEventListener("click", () => this.togglePlayPause());
    }
    if (prevBtn) {
      const newBtn = prevBtn.cloneNode(true);
      prevBtn.parentNode.replaceChild(newBtn, prevBtn);
      newBtn.addEventListener("click", () => this.previous());
    }
    if (nextBtn) {
      const newBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newBtn, nextBtn);
      newBtn.addEventListener("click", () => this.next());
    }
    if (stopBtn) {
      const newBtn = stopBtn.cloneNode(true);
      stopBtn.parentNode.replaceChild(newBtn, stopBtn);
      newBtn.addEventListener("click", () => this.stopPlayback());
    }
  },

  initUI() {
    this.createPanelIfNeeded();
    this.panelPlayPauseBtn = document.getElementById("panelPlayPauseBtn");
    this.panelPrevBtn = document.getElementById("panelPrevBtn");
    this.panelNextBtn = document.getElementById("panelNextBtn");
    this.panelStopBtn = document.getElementById("panelStopBtn");
    this.panelClearBtn = document.getElementById("panelClearBtn");
    this.panelProgressBar = document.getElementById("panelProgressBar");
    this.panelTrackName = document.getElementById("panelTrackName");
    this.panelTrackArtist = document.getElementById("panelTrackArtist");
    this.panelTimeCurrent = document.getElementById("panelTimeCurrent");
    this.panelTimeTotal = document.getElementById("panelTimeTotal");
    this.panelProgressFill = document.getElementById("panelProgressFill");
    this.panelTrackCount = document.getElementById("panelTrackCount");
    if (this.panelProgressBar) {
      this.panelProgressBar.style.position = "relative";
      this.panelProgressBar.style.overflow = "hidden";
      this.panelProgressBar.style.backgroundColor = "var(--bg3)";
      this.panelProgressBar.style.height = "6px";
      this.panelProgressBar.style.borderRadius = "3px";
      this.panelProgressBar.style.cursor = "pointer";
    }
    if (this.panelProgressFill) {
      this.panelProgressFill.style.setProperty(
        "position",
        "absolute",
        "important",
      );
      this.panelProgressFill.style.setProperty("left", "0", "important");
      this.panelProgressFill.style.setProperty("top", "0", "important");
      this.panelProgressFill.style.setProperty("width", "0%", "important");
      this.panelProgressFill.style.setProperty("height", "100%", "important");
      this.panelProgressFill.style.setProperty(
        "background-color",
        "var(--yellow)",
        "important",
      );
      this.panelProgressFill.style.setProperty(
        "border-radius",
        "3px",
        "important",
      );
      this.panelProgressFill.style.setProperty(
        "transition",
        "width 0.1s linear",
        "important",
      );
    }
    if (this.panelPlayPauseBtn) {
      const newBtn = this.panelPlayPauseBtn.cloneNode(true);
      this.panelPlayPauseBtn.parentNode.replaceChild(
        newBtn,
        this.panelPlayPauseBtn,
      );
      this.panelPlayPauseBtn = newBtn;
      this.panelPlayPauseBtn.addEventListener("click", () => {
        if (!this.panelPlayPauseBtn.disabled) this.togglePlayPause();
      });
    }
    if (this.panelPrevBtn) {
      const newBtn = this.panelPrevBtn.cloneNode(true);
      this.panelPrevBtn.parentNode.replaceChild(newBtn, this.panelPrevBtn);
      this.panelPrevBtn = newBtn;
      this.panelPrevBtn.addEventListener("click", () => {
        if (!this.panelPrevBtn.disabled) this.previous();
      });
    }
    if (this.panelNextBtn) {
      const newBtn = this.panelNextBtn.cloneNode(true);
      this.panelNextBtn.parentNode.replaceChild(newBtn, this.panelNextBtn);
      this.panelNextBtn = newBtn;
      this.panelNextBtn.addEventListener("click", () => {
        if (!this.panelNextBtn.disabled) this.next();
      });
    }
    if (this.panelStopBtn) {
      const newBtn = this.panelStopBtn.cloneNode(true);
      this.panelStopBtn.parentNode.replaceChild(newBtn, this.panelStopBtn);
      this.panelStopBtn = newBtn;
      this.panelStopBtn.addEventListener("click", () => {
        if (!this.panelStopBtn.disabled) this.stopPlayback();
      });
    }
    if (this.panelClearBtn) {
      const newBtn = this.panelClearBtn.cloneNode(true);
      this.panelClearBtn.parentNode.replaceChild(newBtn, this.panelClearBtn);
      this.panelClearBtn = newBtn;
      this.panelClearBtn.addEventListener("click", () => this.clearPlaylist());
    }
    if (this.panelProgressBar) {
      const newBar = this.panelProgressBar.cloneNode(true);
      this.panelProgressBar.parentNode.replaceChild(
        newBar,
        this.panelProgressBar,
      );
      this.panelProgressBar = newBar;
      this.panelProgressBar.addEventListener("click", (e) => {
        if (this.panelProgressBar.style.cursor !== "not-allowed")
          this.seekTo(e);
      });
    }
  },

  startStatusPolling() {
    if (this.panelUpdateInterval) clearInterval(this.panelUpdateInterval);
    this.panelUpdateInterval = setInterval(() => {
      if (!this.isSwitching) {
        this.updateUI();
      }
    }, 2000);
  },

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    this.createPanelIfNeeded();
    await this.checkPlayerAvailable();
    this.setupEventListeners();
    this.initUI();
    await this.updateUI();
    if (this.playerAvailable) {
      this.startStatusPolling();
    }
  },
};
