const AudioPlayer = {
  currentAlbum: null,
  currentTrackIndex: -1,
  tracks: [],
  isPlaying: false,
  audioElement: null,
  playlist: [],
  serverUrl: null,
  playerAvailable: false,
  pendingAction: null,
  panelUpdateInterval: null,
  lastPlaylistLength: 0,
  lastCurrentFilePath: null,
  initialized: false,
  currentTrackDuration: 0,
  lastTrackPath: null,

  async stopPlayback() {
    await this.stop();
    await this.updateUI();
    if (this.panelPlayPauseBtn) {
      this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
  },

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
    const result = await this.sendToPlayer("/api/getPlaylist", null, "GET");
    console.log("[AudioPlayer] getPlaylist result:", result);
    return result;
  },

  async getCurrentTime() {
    return await this.sendToPlayer("/api/currentTime", null, "GET");
  },

  async play() {
    const result = await this.sendToPlayer("/api/play");
    console.log("[AudioPlayer] play result:", result);
    return result;
  },

  async pause() {
    return await this.sendToPlayer("/api/pause");
  },

  async stop() {
    return await this.sendToPlayer("/api/stop");
  },

  async next() {
    const result = await this.sendToPlayer("/api/next");
    if (result && result.success) {
      await this.delay(200);
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    return result;
  },

  async previous() {
    const result = await this.sendToPlayer("/api/previous");
    if (result && result.success) {
      await this.delay(200);
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    return result;
  },

  async setPlaylist(tracks) {
    const result = await this.sendToPlayer("/api/setPlaylist", {
      tracks: tracks,
    });
    if (result && result.success) {
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    return result;
  },

  async addTrackAfterCurrent(album, trackIndex) {
    const track = album.tracks[trackIndex];
    const started = await this.ensurePlayerRunning();
    if (!started) return;
    const result = await this.addAfterCurrent(track.path);
    if (result && result.success) {
      Utils.showNotification(
        `Трек "${track.title}" добавлен после текущего`,
        "success",
      );
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
  },

  async clearPlaylist() {
    const result = await this.sendToPlayer("/api/clear");
    if (result && result.success) {
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
      Utils.showNotification("Плейлист очищен", "success");
      await this.updateUI();
    }
    return result;
  },

  async playIndex(index) {
    return await this.sendToPlayer("/api/playIndex", { index: index });
  },

  async ensurePlayerRunning() {
    const available = await this.checkPlayerAvailable();
    if (available) return true;
    Utils.showNotification("Плеер недоступен, проверьте подключение", "error");
    return false;
  },

  async playSingleTrack(album, trackIndex) {
    const track = album.tracks[trackIndex];
    const started = await this.ensurePlayerRunning();
    if (!started) return;
    await this.stop();
    await this.delay(100);
    const result = await this.replacePlaylistWithTrack(track.path);
    if (result && result.success) {
      Utils.showNotification(`Воспроизведение: ${track.title}`, "success");
      this.currentAlbum = album;
      this.tracks = [...album.tracks];
      this.currentTrackIndex = trackIndex;
      await this.updateUI();
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
    this.currentTrackDuration = 0;
  },

  async addAlbumToPlaylist(album) {
    console.log(
      "[AudioPlayer] addAlbumToPlaylist called for album:",
      album.title,
    );
    const started = await this.ensurePlayerRunning();
    if (!started) return;
    const playlistData = await this.getPlaylist();
    let playlist = [];
    if (playlistData && playlistData.success && playlistData.data) {
      playlist = playlistData.data;
    }
    const wasEmpty = playlist.length === 0;
    let addedCount = 0;
    for (const track of album.tracks) {
      const result = await this.addToPlaylist(track.path);
      if (result && result.success) addedCount++;
    }
    Utils.showNotification(
      `Добавлено ${addedCount} треков из альбома "${album.title}"`,
      "success",
    );
    if (wasEmpty && addedCount > 0) {
      await this.play();
      await this.updateUI();
    }
    if (typeof PlaylistViewer !== "undefined") {
      await PlaylistViewer.refresh();
    }
  },

  async addAlbumToPlaylist(album) {
    console.log(
      "[AudioPlayer] addAlbumToPlaylist called for album:",
      album.title,
    );
    const started = await this.ensurePlayerRunning();
    if (!started) return;
    const playlistData = await this.getPlaylist();
    let playlist = [];
    if (playlistData && playlistData.success && playlistData.data) {
      playlist = playlistData.data;
    }
    const wasEmpty = playlist.length === 0;
    const trackPaths = album.tracks.map((t) => t.path);
    const result = await this.sendToPlayer("/api/setPlaylist", {
      tracks: trackPaths,
    });
    if (result && result.success) {
      Utils.showNotification(
        `Добавлено ${trackPaths.length} треков из альбома "${album.title}"`,
        "success",
      );
      if (wasEmpty) {
        await this.play();
        await this.updateUI();
      }
      if (typeof PlaylistViewer !== "undefined") {
        await PlaylistViewer.refresh();
      }
    }
  },

  async replacePlaylistWithAlbum(album) {
    const started = await this.ensurePlayerRunning();
    if (!started) return;
    await this.stop();
    const trackPaths = album.tracks.map((t) => t.path);
    const result = await this.setPlaylist(trackPaths);
    if (result && result.success) {
      Utils.showNotification(`Плейлист заменен: ${album.title}`, "success");
      this.currentAlbum = album;
      this.tracks = [...album.tracks];
      this.currentTrackIndex = 0;
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
      await this.updateUI();
    }
  },

  async replacePlaylistWithTrack(album, trackIndex) {
    const track = album.tracks[trackIndex];
    const started = await this.ensurePlayerRunning();
    if (!started) return;
    await this.stop();
    const result = await this.replacePlaylistWithTrack(track.path);
    if (result && result.success) {
      Utils.showNotification(
        `Плейлист заменен треком: ${track.title}`,
        "success",
      );
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
  },

  async addTrackAfterCurrent(album, trackIndex) {
    const track = album.tracks[trackIndex];
    const started = await this.ensurePlayerRunning();
    if (!started) return;
    const result = await this.addAfterCurrent(track.path);
    if (result && result.success) {
      Utils.showNotification(`Трек добавлен: ${track.name}`, "success");
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
    }
  },

  async togglePlayPause() {
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

  async nextTrack() {
    await this.next();
  },

  async previousTrack() {
    await this.previous();
  },

  async stopPlayback() {
    await this.stop();
    await this.updateUI();
  },

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    await this.checkPlayerAvailable();
    this.setupEventListeners();
    this.initUI();
    await this.updateUI();
    if (this.playerAvailable) {
      this.startStatusPolling();
    }
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
      newBtn.addEventListener("click", () => this.previousTrack());
    }
    if (nextBtn) {
      const newBtn = nextBtn.cloneNode(true);
      nextBtn.parentNode.replaceChild(newBtn, nextBtn);
      newBtn.addEventListener("click", () => this.nextTrack());
    }
    if (stopBtn) {
      const newBtn = stopBtn.cloneNode(true);
      stopBtn.parentNode.replaceChild(newBtn, stopBtn);
      newBtn.addEventListener("click", () => this.stopPlayback());
    }
  },

  startStatusPolling() {
    if (this.panelUpdateInterval) clearInterval(this.panelUpdateInterval);
    this.panelUpdateInterval = setInterval(() => this.updateUI(), 1000);
  },

  async updateUI() {
    if (!this.playerAvailable) {
      await this.checkPlayerAvailable();
      if (!this.playerAvailable) {
        const panel = document.getElementById("audioPlayerControlPanel");
        if (panel) panel.classList.remove("active");
        return;
      }
    }
    const state = await this.getPlaybackState();
    console.log("[AudioPlayer] updateUI state:", state);
    if (!state || !state.success) return;
    const hasTracks = state.data && state.data.currentTrack;
    const panel = document.getElementById("audioPlayerControlPanel");
    if (!hasTracks) {
      if (panel) panel.classList.remove("active");
      if (this.panelTrackName) this.panelTrackName.textContent = "Нет треков";
      if (this.panelTrackArtist) this.panelTrackArtist.textContent = "";
      if (this.panelTimeCurrent) this.panelTimeCurrent.textContent = "0:00";
      if (this.panelTimeTotal) this.panelTimeTotal.textContent = "0:00";
      const progressFill = document.getElementById("panelProgressFill");
      if (progressFill) progressFill.style.width = "0%";
      if (this.panelPlayPauseBtn) {
        this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
      return;
    }
    if (panel && !panel.classList.contains("active")) {
      panel.classList.add("active");
    }
    if (
      state.data.currentTrack &&
      state.data.currentTrack !== this.lastTrackPath
    ) {
      this.lastTrackPath = state.data.currentTrack;
      this.currentTrackDuration = 0;
      const metadata = await this.fetchTrackMetadata(state.data.currentTrack);
      if (metadata && metadata.duration) {
        this.currentTrackDuration = metadata.duration;
      }
    }
    const timeInfo = await this.getCurrentTime();
    console.log("[AudioPlayer] timeInfo:", timeInfo);
    const trackName = state.data.currentTrack
      ? state.data.currentTrack.split("/").pop()
      : "—";
    if (this.panelTrackName) this.panelTrackName.textContent = trackName;
    let currentTime = 0;
    let duration = this.currentTrackDuration;
    if (timeInfo && timeInfo.success && timeInfo.data) {
      currentTime = timeInfo.data.currentTime || 0;
      console.log("[AudioPlayer] currentTime from server:", currentTime);
      if (timeInfo.data.duration && timeInfo.data.duration > 0) {
        duration = timeInfo.data.duration;
        this.currentTrackDuration = duration;
      }
    }
    if (this.panelTimeCurrent) {
      this.panelTimeCurrent.textContent = this.formatTime(currentTime);
    }
    if (this.panelTimeTotal) {
      this.panelTimeTotal.textContent = this.formatTime(duration);
    }
    const progressFill = document.getElementById("panelProgressFill");
    if (progressFill && duration > 0) {
      const percent = (currentTime / duration) * 100;
      progressFill.style.width = Math.min(percent, 100) + "%";
      progressFill.style.backgroundColor = "var(--yellow)";
      console.log("[AudioPlayer] progress percent:", percent);
    }
    if (this.panelPlayPauseBtn) {
      console.log("[AudioPlayer] isPlaying:", state.data.isPlaying);
      if (state.data.isPlaying) {
        this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
      } else {
        this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
      }
    }
    if (this.panelTrackCount) {
      this.panelTrackCount.textContent = `${(state.data.currentIndex || 0) + 1}/${state.data.totalTracks || 0}`;
    }
  },

  async fetchTrackMetadata(filePath) {
    try {
      const response = await fetch(
        `${this.getServerUrl()}/api/music/file-metadata?path=${encodeURIComponent(filePath)}`,
      );
      const data = await response.json();
      if (data.status === "success" && data.data && data.data.file) {
        return {
          duration: data.data.file.duration || 0,
          title: data.data.file.title,
          artist: data.data.file.artist,
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching metadata:", error);
      return null;
    }
  },

  initUI() {
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
    if (this.panelPlayPauseBtn) {
      const newBtn = this.panelPlayPauseBtn.cloneNode(true);
      this.panelPlayPauseBtn.parentNode.replaceChild(
        newBtn,
        this.panelPlayPauseBtn,
      );
      this.panelPlayPauseBtn = newBtn;
      this.panelPlayPauseBtn.addEventListener("click", () =>
        this.togglePlayPause(),
      );
    }
    if (this.panelPrevBtn) {
      const newBtn = this.panelPrevBtn.cloneNode(true);
      this.panelPrevBtn.parentNode.replaceChild(newBtn, this.panelPrevBtn);
      this.panelPrevBtn = newBtn;
      this.panelPrevBtn.addEventListener("click", () => this.previousTrack());
    }
    if (this.panelNextBtn) {
      const newBtn = this.panelNextBtn.cloneNode(true);
      this.panelNextBtn.parentNode.replaceChild(newBtn, this.panelNextBtn);
      this.panelNextBtn = newBtn;
      this.panelNextBtn.addEventListener("click", () => this.nextTrack());
    }
    if (this.panelStopBtn) {
      const newBtn = this.panelStopBtn.cloneNode(true);
      this.panelStopBtn.parentNode.replaceChild(newBtn, this.panelStopBtn);
      this.panelStopBtn = newBtn;
      this.panelStopBtn.addEventListener("click", () => this.stopPlayback());
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
      this.panelProgressBar.addEventListener("click", (e) => this.seekTo(e));
    }
    if (this.playerAvailable) {
      this.startStatusPolling();
    }
  },

  async seekTo(e) {
    if (!this.panelProgressBar) return;
    const rect = this.panelProgressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const state = await this.getPlaybackState();
    if (state && state.data && state.data.totalTracks) {
      const timeInfo = await this.getCurrentTime();
      if (
        timeInfo &&
        timeInfo.success &&
        timeInfo.data &&
        timeInfo.data.duration
      ) {
        const newTime = timeInfo.data.duration * percent;
        Utils.showNotification(
          `Перемотка на ${this.formatTime(newTime)} пока не реализована`,
          "info",
        );
      }
    }
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
};
