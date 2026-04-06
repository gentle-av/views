const AudioPlayer = {
  currentAlbum: null,
  currentTrackIndex: -1,
  tracks: [],
  isPlaying: false,
  audioElement: null,
  playlist: [],
  musiumUrl: null,
  musiumAvailable: false,
  pendingAction: null,
  panelUpdateInterval: null,
  lastPlaylistLength: 0,
  lastCurrentFilePath: null,
  initialized: false,

  getServerUrl() {
    return `http://${window.location.hostname}:${window.location.port}`;
  },

  getMusiumUrl() {
    if (this.musiumUrl) return this.musiumUrl;
    return `http://${window.location.hostname}:8084`;
  },

  async checkMusiumAvailable() {
    console.log(
      "[DEBUG] checkMusiumAvailable called, URL:",
      this.getMusiumUrl(),
    );
    try {
      const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      console.log(
        "[DEBUG] checkMusiumAvailable response status:",
        response.status,
      );
      if (response.ok) {
        const data = await response.json();
        console.log("[DEBUG] checkMusiumAvailable data:", data);
        this.musiumAvailable = data.success === true;
        if (this.musiumAvailable && this.pendingAction) {
          const action = this.pendingAction;
          this.pendingAction = null;
          await action();
        }
        return this.musiumAvailable;
      }
    } catch (error) {
      console.log("[DEBUG] Musium not running, error:", error.message);
    }
    this.musiumAvailable = false;
    return false;
  },

  async waitForMusium(timeoutMs) {
    console.log("[DEBUG] waitForMusium started, timeout:", timeoutMs);
    const startTime = Date.now();
    let attempt = 0;
    while (Date.now() - startTime < timeoutMs) {
      attempt++;
      console.log(`[DEBUG] waitForMusium attempt ${attempt}`);
      try {
        const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
          const data = await response.json();
          console.log("[DEBUG] waitForMusium response:", data);
          if (data.success === true) {
            this.musiumAvailable = true;
            console.log("[DEBUG] Musium is now available!");
            return true;
          }
        }
      } catch (error) {
        console.log(
          `[DEBUG] waitForMusium attempt ${attempt} failed:`,
          error.message,
        );
      }
      await this.delay(1000);
    }
    console.log("[DEBUG] waitForMusium timeout, Musium not started");
    return false;
  },

  async launchMusiumWithTracks(tracks) {
    console.log(
      "[DEBUG] launchMusiumWithTracks called, tracks count:",
      tracks.length,
    );
    console.log("[DEBUG] First track path:", tracks[0]?.path);
    try {
      Utils.showNotification("Запуск аудиоплеера...", "info");
      const url = `${this.getServerUrl()}/api/music/open`;
      console.log("[DEBUG] Launch URL:", url);
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: tracks.map((t) => t.path) }),
      });
      console.log("[DEBUG] Launch response status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log("[DEBUG] Launch response data:", data);
      if (data.status === "success") {
        if (data.musiumUrl) {
          this.musiumUrl = data.musiumUrl;
          console.log("[DEBUG] Musium URL from response:", this.musiumUrl);
        }
        const started = await this.waitForMusium(15000);
        if (started) {
          Utils.showNotification("Аудиоплеер запущен", "success");
          return true;
        } else {
          Utils.showNotification("Аудиоплеер не запустился", "error");
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error("[ERROR] Error launching Musium:", error);
      Utils.showNotification(
        "Ошибка запуска аудиоплеера: " + error.message,
        "error",
      );
      return false;
    }
  },

  async ensureMusiumRunning(tracks) {
    console.log("[DEBUG] ensureMusiumRunning called");
    const isAvailable = await this.checkMusiumAvailable();
    console.log("[DEBUG] Musium available:", isAvailable);
    if (isAvailable) return true;
    console.log("[DEBUG] Launching Musium...");
    const launched = await this.launchMusiumWithTracks(tracks);
    if (launched) {
      await this.delay(1500);
      const nowAvailable = await this.checkMusiumAvailable();
      console.log("[DEBUG] Musium available after delay:", nowAvailable);
      return nowAvailable;
    }
    return false;
  },

  async sendToMusium(endpoint, data, method = "POST") {
    console.log(`[DEBUG] sendToMusium: ${endpoint}, data:`, data);
    if (!this.musiumAvailable) {
      console.log("[DEBUG] Musium not available, skipping request");
      return null;
    }
    try {
      const url = `${this.getMusiumUrl()}${endpoint}`;
      const options = {
        method: method,
        headers: { "Content-Type": "application/json" },
      };
      if (method === "POST" && data) {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(url, options);
      const result = await response.json();
      console.log(`[DEBUG] sendToMusium response from ${endpoint}:`, result);
      return result;
    } catch (error) {
      console.error(`Musium API error: ${endpoint}`, error);
      this.musiumAvailable = false;
      return null;
    }
  },

  async getMusiumPlaylist() {
    return await this.sendToMusium("/api/getPlaylist", null, "GET");
  },

  async getMusiumStatus() {
    return await this.sendToMusium("/api/getStatus", null, "GET");
  },

  async addToPlaylist(album, trackIndex = null) {
    console.log(
      "[DEBUG] addToPlaylist called, album:",
      album?.title,
      "trackIndex:",
      trackIndex,
    );
    const tracksToAdd =
      trackIndex !== null ? [album.tracks[trackIndex]] : album.tracks;
    console.log("[DEBUG] tracksToAdd count:", tracksToAdd.length);
    this.pendingTracks = tracksToAdd;
    const started = await this.ensureMusiumRunning(tracksToAdd);
    if (!started) {
      Utils.showNotification("Не удалось запустить аудиоплеер", "error");
      return;
    }
    await this.delay(500);
    let addedCount = 0;
    for (const track of tracksToAdd) {
      const result = await this.sendToMusium("/api/add", { path: track.path });
      if (result && result.success) {
        addedCount++;
      }
      await this.delay(100);
    }
    Utils.showNotification(
      `Добавлено ${addedCount} из ${tracksToAdd.length} треков в плейлист`,
      "success",
    );
    if (typeof PlaylistViewer !== "undefined") {
      await this.delay(500);
      PlaylistViewer.refresh();
    }
    await this.delay(300);
    await this.updateUI();
  },

  async verifyMusiumConnection() {
    if (!this.musiumAvailable) {
      await this.checkMusiumAvailable();
    }
    return this.musiumAvailable;
  },

  async replacePlaylist(album, trackIndex = null) {
    console.log("[REPLACE_PLAYLIST] ========== START ==========");
    console.log("[REPLACE_PLAYLIST] album:", album?.title);
    console.log("[REPLACE_PLAYLIST] trackIndex:", trackIndex);
    const tracksToReplace =
      trackIndex !== null ? [album.tracks[trackIndex]] : album.tracks;
    console.log(
      "[REPLACE_PLAYLIST] tracksToReplace count:",
      tracksToReplace.length,
    );
    if (tracksToReplace.length > 0) {
      console.log("[REPLACE_PLAYLIST] first track:", tracksToReplace[0].name);
    }
    console.log("[REPLACE_PLAYLIST] Calling ensureMusiumRunning...");
    const started = await this.ensureMusiumRunning(tracksToReplace);
    console.log("[REPLACE_PLAYLIST] ensureMusiumRunning result:", started);
    if (!started) {
      Utils.showNotification("Не удалось запустить аудиоплеер", "error");
      console.log("[REPLACE_PLAYLIST] FAILED: Musium not started");
      return;
    }
    console.log("[REPLACE_PLAYLIST] Waiting 500ms...");
    await this.delay(500);
    const trackPaths = tracksToReplace.map((t) => t.path);
    console.log(
      "[REPLACE_PLAYLIST] Sending replacePlaylist with",
      trackPaths.length,
      "paths",
    );
    console.log("[REPLACE_PLAYLIST] First path:", trackPaths[0]);
    const result = await this.sendToMusium("/api/replacePlaylist", {
      tracks: trackPaths,
      noAutoPlay: false,
    });
    console.log("[REPLACE_PLAYLIST] sendToMusium result:", result);
    if (result && result.success) {
      Utils.showNotification(
        `Плейлист заменен ${tracksToReplace.length} треками`,
        "success",
      );
      console.log("[REPLACE_PLAYLIST] SUCCESS: Playlist replaced");
    } else {
      Utils.showNotification("Ошибка при замене плейлиста", "error");
      console.log("[REPLACE_PLAYLIST] ERROR: Replace failed");
    }
    console.log("[REPLACE_PLAYLIST] Waiting 500ms after replace...");
    await this.delay(500);
    console.log("[REPLACE_PLAYLIST] Calling updateUI...");
    await this.updateUI();
    if (typeof PlaylistViewer !== "undefined") {
      console.log("[REPLACE_PLAYLIST] Calling PlaylistViewer.refresh...");
      PlaylistViewer.refresh();
    }
    console.log("[REPLACE_PLAYLIST] ========== END ==========");
  },

  async addAfterCurrent(album, trackIndex) {
    console.log(
      "[DEBUG] addAfterCurrent called, album:",
      album?.title,
      "trackIndex:",
      trackIndex,
    );
    const track = album.tracks[trackIndex];
    if (!track) {
      console.error("[DEBUG] Track not found");
      return;
    }
    console.log("[DEBUG] Track to add:", track.name, track.path);
    const started = await this.ensureMusiumRunning([track]);
    if (!started) {
      Utils.showNotification("Не удалось запустить аудиоплеер", "error");
      return;
    }
    await this.delay(500);
    const result = await this.sendToMusium("/api/addAfterCurrent", {
      path: track.path,
    });
    if (result && result.success) {
      Utils.showNotification(
        `Трек "${track.name}" добавлен после текущего`,
        "success",
      );
    } else {
      console.log("[DEBUG] addAfterCurrent failed, trying regular add");
      await this.sendToMusium("/api/add", { path: track.path });
      Utils.showNotification(
        `Трек "${track.name}" добавлен в конец плейлиста`,
        "success",
      );
    }
    if (typeof PlaylistViewer !== "undefined") {
      await this.delay(500);
      PlaylistViewer.refresh();
    }
    await this.delay(300);
    await this.updateUI();
  },

  async clearPlaylist() {
    await this.sendToMusium("/api/clear");
    if (typeof PlaylistViewer !== "undefined") {
      PlaylistViewer.refresh();
    }
    Utils.showNotification("Плейлист очищен", "success");
    await this.delay(300);
    await this.updateUI();
  },

  async playTrackInMusium(album, trackIndex) {
    const track = album.tracks[trackIndex];
    const started = await this.ensureMusiumRunning([track]);
    if (!started) return;
    await this.sendToMusium("/api/replacePlaylist", { tracks: [track.path] });
    await this.delay(300);
    await this.sendToMusium("/api/play", {});
    Utils.showNotification(`Воспроизведение: ${track.name}`, "success");
    await this.delay(300);
    await this.updateUI();
  },

  async playSingleTrack(album, trackIndex) {
    console.log("[DEBUG] playSingleTrack called, trackIndex:", trackIndex);
    const track = album.tracks[trackIndex];
    const started = await this.ensureMusiumRunning([track]);
    if (!started) return;
    const playlist = await this.getMusiumPlaylist();
    console.log("[DEBUG] Current playlist:", playlist);
    if (
      !playlist ||
      !playlist.data ||
      !playlist.data.playlist ||
      playlist.data.playlist.length === 0
    ) {
      console.log("[DEBUG] Playlist empty, replacing");
      await this.sendToMusium("/api/replacePlaylist", { tracks: [track.path] });
      await this.delay(300);
      await this.sendToMusium("/api/play", {});
      Utils.showNotification(`Воспроизведение: ${track.name}`, "success");
    } else {
      let trackIndexInPlaylist = -1;
      for (let i = 0; i < playlist.data.playlist.length; i++) {
        if (playlist.data.playlist[i].path === track.path) {
          trackIndexInPlaylist = i;
          break;
        }
      }
      if (trackIndexInPlaylist >= 0) {
        console.log(
          "[DEBUG] Track found in playlist at index:",
          trackIndexInPlaylist,
        );
        await this.sendToMusium("/api/playIndex", {
          index: trackIndexInPlaylist,
        });
      } else {
        console.log("[DEBUG] Track not in playlist, adding after current");
        await this.sendToMusium("/api/addAfterCurrent", { path: track.path });
        const newPlaylist = await this.getMusiumPlaylist();
        if (newPlaylist && newPlaylist.data && newPlaylist.data.playlist) {
          for (let i = 0; i < newPlaylist.data.playlist.length; i++) {
            if (newPlaylist.data.playlist[i].path === track.path) {
              await this.sendToMusium("/api/playIndex", { index: i });
              break;
            }
          }
        }
      }
      Utils.showNotification(`Воспроизведение: ${track.name}`, "success");
    }
    this.currentAlbum = album;
    this.tracks = [...album.tracks];
    this.currentTrackIndex = trackIndex;
    const albumArt = document.getElementById("playerAlbumArt");
    const albumTitle = document.getElementById("playerAlbum");
    const artistName = document.getElementById("playerArtist");
    const playerBar = document.getElementById("audioPlayerBar");
    if (albumArt) {
      albumArt.src = album.coverUrl || "";
      albumArt.onerror = () => {
        albumArt.src = "";
      };
    }
    if (albumTitle) albumTitle.textContent = album.title;
    if (artistName) artistName.textContent = album.artist;
    if (playerBar) playerBar.style.display = "flex";
    await this.delay(300);
    await this.updateUI();
  },

  async playAlbumInMusium(album) {
    console.log("[DEBUG] playAlbumInMusium called, album:", album.title);
    const started = await this.ensureMusiumRunning(album.tracks);
    if (!started) return;
    const trackPaths = album.tracks.map((t) => t.path);
    await this.sendToMusium("/api/replacePlaylist", { tracks: trackPaths });
    await this.delay(300);
    await this.sendToMusium("/api/play", {});
    Utils.showNotification(
      `Воспроизведение альбома: ${album.title}`,
      "success",
    );
    await this.delay(300);
    await this.updateUI();
  },

  async pauseMusium() {
    if (!this.musiumAvailable) return;
    await this.sendToMusium("/api/pause", {});
    this.isPlaying = false;
    await this.updateUI();
  },

  async playMusium() {
    if (!this.musiumAvailable) return;
    await this.sendToMusium("/api/play", {});
    this.isPlaying = true;
    await this.updateUI();
  },

  async stopMusium() {
    if (!this.musiumAvailable) return;
    await this.sendToMusium("/api/stop", {});
    await this.updateUI();
  },

  init() {
    console.log("[AudioPlayer] init called, initialized:", this.initialized);
    if (this.initialized) {
      console.log("[AudioPlayer] Already initialized, skipping");
      return;
    }
    if (this.initialized) return;
    this.initialized = true;
    console.log("[DEBUG] AudioPlayer.init called");
    this.setupEventListeners();
    this.createAudioElement();
    this.initUI();
    setTimeout(() => {
      this.checkMusiumAvailable().then(() => {
        if (this.musiumAvailable) {
          this.updateUI();
        }
      });
    }, 1000);
  },

  createAudioElement() {
    this.audioElement = new Audio();
    this.audioElement.addEventListener("ended", () => {
      this.nextTrack();
      setTimeout(() => this.updateUI(), 100);
    });
    this.audioElement.addEventListener("timeupdate", () =>
      this.updateProgress(),
    );
    this.audioElement.addEventListener("play", () => {
      this.isPlaying = true;
      this.updatePlayerUI();
    });
    this.audioElement.addEventListener("pause", () => {
      this.isPlaying = false;
      this.updatePlayerUI();
    });
  },

  setupEventListeners() {
    const playBtn = document.getElementById("playerPlayBtn");
    const prevBtn = document.getElementById("playerPrevBtn");
    const nextBtn = document.getElementById("playerNextBtn");
    const stopBtn = document.getElementById("playerStopBtn");
    const volumeSlider = document.getElementById("volumeSlider");
    if (playBtn)
      playBtn.addEventListener("click", () => this.togglePlayPause());
    if (prevBtn) prevBtn.addEventListener("click", () => this.previousTrack());
    if (nextBtn) nextBtn.addEventListener("click", () => this.nextTrack());
    if (stopBtn) stopBtn.addEventListener("click", () => this.stop());
    if (volumeSlider)
      volumeSlider.addEventListener("click", (e) => this.setVolume(e));
  },

  async loadAlbum(album) {
    await this.playAlbumInMusium(album);
    this.currentAlbum = album;
    this.tracks = [...album.tracks];
    this.currentTrackIndex = 0;
    const albumArt = document.getElementById("playerAlbumArt");
    const albumTitle = document.getElementById("playerAlbum");
    const artistName = document.getElementById("playerArtist");
    const playerBar = document.getElementById("audioPlayerBar");
    if (albumArt) {
      albumArt.src = album.coverUrl || "";
      albumArt.onerror = () => {
        albumArt.src = "";
      };
    }
    if (albumTitle) albumTitle.textContent = album.title;
    if (artistName) artistName.textContent = album.artist;
    if (playerBar) playerBar.style.display = "flex";
  },

  async playTrack(index) {
    if (this.currentAlbum) {
      await this.playTrackInMusium(this.currentAlbum, index);
    }
    if (index < 0 || index >= this.tracks.length) return;
    this.currentTrackIndex = index;
    const track = this.tracks[index];
    const trackUrl = `${this.getServerUrl()}${track.path}`;
    this.audioElement.src = trackUrl;
    this.audioElement.play().catch((e) => console.error("Play error:", e));
    this.isPlaying = true;
    this.updatePlayerUI();
  },

  async togglePlayPause() {
    if (this.musiumAvailable) {
      const status = await this.getMusiumStatus();
      if (status && status.data) {
        if (status.data.isPlaying) {
          await this.pauseMusium();
        } else {
          await this.playMusium();
        }
      } else if (this.isPlaying) {
        await this.pauseMusium();
      } else {
        await this.playMusium();
      }
    } else if (!this.audioElement.src) {
      return;
    } else if (this.isPlaying) {
      this.audioElement.pause();
      this.isPlaying = false;
    } else {
      this.audioElement.play();
      this.isPlaying = true;
    }
    this.updatePlayerUI();
  },

  async nextTrack() {
    if (this.musiumAvailable) {
      await this.nextTrackMusium();
    } else if (this.currentTrackIndex + 1 < this.tracks.length) {
      await this.playTrack(this.currentTrackIndex + 1);
    } else {
      this.stop();
    }
  },

  async previousTrack() {
    if (this.musiumAvailable) {
      await this.previousTrackMusium();
    } else if (this.currentTrackIndex - 1 >= 0) {
      await this.playTrack(this.currentTrackIndex - 1);
    } else {
      this.audioElement.currentTime = 0;
    }
  },

  async stop() {
    if (this.musiumAvailable) {
      await this.stopMusium();
    }
    this.audioElement.pause();
    this.audioElement.src = "";
    this.isPlaying = false;
    this.currentTrackIndex = -1;
    this.updatePlayerUI();
    const playerBar = document.getElementById("audioPlayerBar");
    if (playerBar) playerBar.style.display = "none";
    if (typeof PlaylistViewer !== "undefined") {
      PlaylistViewer.refresh();
    }
  },

  setVolume(event) {
    const slider = event.currentTarget;
    const rect = slider.getBoundingClientRect();
    const percent = Math.min(
      100,
      Math.max(0, ((event.clientX - rect.left) / rect.width) * 100),
    );
    const volumeProgress = document.getElementById("volumeProgress");
    if (volumeProgress) volumeProgress.style.width = percent + "%";
    this.audioElement.volume = percent / 100;
  },

  updateProgress() {
    if (this.audioElement.duration) {
      const percent =
        (this.audioElement.currentTime / this.audioElement.duration) * 100;
    }
  },

  updatePlayerUI() {
    const playBtn = document.getElementById("playerPlayBtn");
    if (playBtn) {
      playBtn.innerHTML = this.isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    }
  },

  addAlbumToPlaylist(album) {
    this.addToPlaylist(album);
    setTimeout(() => {
      const playlistSection = document.getElementById("playlistSection");
      if (playlistSection && playlistSection.style.display === "none") {
        playlistSection.style.display = "block";
      }
      if (typeof PlaylistViewer !== "undefined") {
        PlaylistViewer.refresh();
      }
      playlistSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  },

  replacePlaylistWithAlbum(album) {
    console.log("[DEBUG] replacePlaylistWithAlbum called");
    this.replacePlaylist(album);
  },

  replacePlaylistWithTrack(album, trackIndex) {
    this.replacePlaylist(album, trackIndex);
  },

  addTrackAfterCurrent(album, trackIndex) {
    this.addAfterCurrent(album, trackIndex);
  },

  showPlaylist() {
    if (this.musiumAvailable) {
      this.getMusiumPlaylist().then((data) => {
        if (data && data.success && data.data && data.data.playlist) {
          const playlist = data.data.playlist;
          if (playlist.length === 0) {
            Utils.showNotification("Плейлист пуст", "info");
            return;
          }
          let playlistText = "Плейлист:\n";
          playlist.forEach((track, idx) => {
            playlistText += `${idx + 1}. ${track.name}\n`;
          });
          alert(playlistText);
        } else {
          Utils.showNotification("Не удалось загрузить плейлист", "info");
        }
      });
    } else if (this.playlist.length === 0) {
      Utils.showNotification("Плейлист пуст", "info");
      return;
    } else {
      let playlistText = "Плейлист:\n";
      this.playlist.forEach((track, idx) => {
        playlistText += `${idx + 1}. ${track.name}\n`;
      });
      alert(playlistText);
    }
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
    this.lastCurrentFilePath = null;
    if (this.panelPlayPauseBtn)
      this.panelPlayPauseBtn.addEventListener("click", () =>
        this.togglePlayPause(),
      );
    if (this.panelPrevBtn)
      this.panelPrevBtn.addEventListener("click", () => this.previousTrack());
    if (this.panelNextBtn)
      this.panelNextBtn.addEventListener("click", () => this.nextTrack());
    if (this.panelStopBtn)
      this.panelStopBtn.addEventListener("click", () => this.stop());
    if (this.panelClearBtn)
      this.panelClearBtn.addEventListener("click", () => this.clearPlaylist());
    if (this.panelProgressBar)
      this.panelProgressBar.addEventListener("click", (e) => this.seekTo(e));
    const panel = document.getElementById("audioPlayerControlPanel");
    if (panel) panel.classList.remove("active");
    if (this.panelTrackName) this.panelTrackName.textContent = "Плейлист пуст";
    if (this.panelTrackArtist) this.panelTrackArtist.textContent = "";
    this.lastPlaylistLength = 0;
    if (this.panelUpdateInterval) {
      clearInterval(this.panelUpdateInterval);
    }
    this.panelUpdateInterval = setInterval(() => this.updateUI(), 1000);
    setTimeout(() => {
      this.checkMusiumAvailable().then(() => {
        if (this.musiumAvailable) {
          this.updateUI();
        }
      });
    }, 500);
  },

  async previousTrackMusium() {
    if (!this.musiumAvailable) return;
    await this.sendToMusium("/api/previous", {});
    await this.delay(200);
    await this.updateUI();
  },

  async nextTrackMusium() {
    if (!this.musiumAvailable) return;
    await this.sendToMusium("/api/next", {});
    await this.delay(200);
    await this.updateUI();
  },

  seekTo(e) {
    if (!this.panelProgressBar) return;
    const rect = this.panelProgressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (this.musiumAvailable) {
      this.sendToMusium("/api/seek", { position: percent }).then(() => {
        setTimeout(() => this.updateUI(), 100);
      });
    }
  },

  async updateUI() {
    if (!this.musiumAvailable) {
      const panel = document.getElementById("audioPlayerControlPanel");
      if (panel && panel.classList.contains("active")) {
        panel.classList.remove("active");
      }
      if (this.panelTrackName)
        this.panelTrackName.textContent = "Аудиоплеер не запущен";
      if (this.panelTrackArtist) this.panelTrackArtist.textContent = "";
      return;
    }
    const stateResponse = await this.sendToMusium(
      "/api/playbackState",
      null,
      "GET",
    );
    if (!stateResponse || !stateResponse.success) {
      return;
    }
    if (
      stateResponse.data &&
      typeof stateResponse.data.isPlaying !== "undefined"
    ) {
      this.isPlaying = stateResponse.data.isPlaying;
    }
    const hasTracks =
      stateResponse.data.hasTrack || stateResponse.data.playlistSize > 0;
    const panel = document.getElementById("audioPlayerControlPanel");
    if (!hasTracks) {
      if (panel && panel.classList.contains("active")) {
        panel.classList.remove("active");
      }
      if (this.panelTrackName)
        this.panelTrackName.textContent = "Плейлист пуст";
      if (this.panelTrackArtist) this.panelTrackArtist.textContent = "";
      this.lastPlaylistLength = 0;
      this.lastCurrentFilePath = null;
      return;
    }
    if (panel && !panel.classList.contains("active")) {
      panel.classList.add("active");
    }
    const trackResponse = await this.sendToMusium(
      "/api/currentTrack",
      null,
      "GET",
    );
    const timeResponse = await this.sendToMusium(
      "/api/currentTime",
      null,
      "GET",
    );
    let trackPath = "";
    if (trackResponse && trackResponse.success && trackResponse.data.path) {
      trackPath = trackResponse.data.path;
    } else if (this.lastCurrentFilePath) {
      trackPath = this.lastCurrentFilePath;
    } else {
      const playlistData = await this.getMusiumPlaylist();
      if (
        playlistData &&
        playlistData.data &&
        playlistData.data.playlist &&
        playlistData.data.playlist.length > 0
      ) {
        const currentIndex = playlistData.data.currentIndex || 0;
        if (playlistData.data.playlist[currentIndex]) {
          trackPath = playlistData.data.playlist[currentIndex].path;
        } else if (playlistData.data.playlist.length > 0) {
          trackPath = playlistData.data.playlist[0].path;
        }
      }
    }
    if (trackPath) {
      const metadata = await this.fetchTrackMetadata(trackPath);
      let trackName = "";
      let trackArtist = "";
      if (metadata) {
        trackName = metadata.name || "";
        trackArtist = metadata.artist || "";
      } else {
        trackName = trackPath.split("/").pop() || "";
        trackArtist = "";
      }
      if (this.panelTrackName)
        this.panelTrackName.textContent = trackName || "—";
      if (this.panelTrackArtist)
        this.panelTrackArtist.textContent = trackArtist || "";
      this.lastCurrentFilePath = trackPath;
    } else {
      if (this.panelTrackName) this.panelTrackName.textContent = "—";
      if (this.panelTrackArtist) this.panelTrackArtist.textContent = "";
    }
    if (timeResponse && timeResponse.success) {
      if (this.panelTimeCurrent)
        this.panelTimeCurrent.textContent = this.formatTime(
          timeResponse.data.position || 0,
        );
      if (this.panelTimeTotal)
        this.panelTimeTotal.textContent = this.formatTime(
          timeResponse.data.duration || 0,
        );
      if (this.panelProgressFill && timeResponse.data.duration > 0) {
        const percent = timeResponse.data.progressPercent || 0;
        this.panelProgressFill.style.width = percent + "%";
      } else if (this.panelProgressFill) {
        this.panelProgressFill.style.width = "0%";
      }
    }
    if (stateResponse && stateResponse.data) {
      if (this.panelPlayPauseBtn) {
        if (stateResponse.data.isPlaying) {
          this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
          this.panelPlayPauseBtn.title = "Пауза";
        } else {
          this.panelPlayPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
          this.panelPlayPauseBtn.title = "Воспроизвести";
        }
      }
    }
    this.lastPlaylistLength = stateResponse.data.playlistSize || 0;
  },

  async fetchTrackMetadata(path) {
    try {
      const url = `${this.getServerUrl()}/api/music/list`;
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.status === "success" && data.files) {
        for (const file of data.files) {
          if (file.path === path) {
            return {
              name: file.title || file.filename,
              artist: file.artist || "Unknown",
              track: file.track,
            };
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error fetching metadata:", error);
      return null;
    }
  },

  formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },
};
