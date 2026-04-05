const PlaylistViewer = {
  musiumUrl: null,
  musiumAvailable: false,
  playlist: [],
  currentIndex: -1,
  updateInterval: null,
  mediaServerUrl: null,
  initialized: false,

  getMusiumUrl() {
    if (this.musiumUrl) return this.musiumUrl;
    if (typeof AudioPlayer !== "undefined" && AudioPlayer.musiumUrl) {
      this.musiumUrl = AudioPlayer.musiumUrl;
      return this.musiumUrl;
    }
    return `http://${window.location.hostname}:8084`;
  },

  setMusiumUrl(url) {
    this.musiumUrl = url;
    console.log("PlaylistViewer: Musium URL set to", url);
  },

  getMediaServerUrl() {
    if (this.mediaServerUrl) return this.mediaServerUrl;
    return `http://${window.location.hostname}:${window.location.port}`;
  },

  async fetchTrackMetadata(path) {
    try {
      const url = `${this.getMediaServerUrl()}/api/music/list`;
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
              duration: file.duration || 0,
            };
          }
        }
      }
    } catch (error) {
      console.error("Error fetching metadata:", error);
    }
    return null;
  },

  async enrichPlaylistWithMetadata(playlistData) {
    if (!playlistData || !playlistData.playlist) return playlistData;
    for (let i = 0; i < playlistData.playlist.length; i++) {
      const track = playlistData.playlist[i];
      if (
        !track.artist ||
        track.artist === "Unknown" ||
        !track.title ||
        !track.duration
      ) {
        const metadata = await this.fetchTrackMetadata(track.path);
        if (metadata) {
          track.title = metadata.name || track.title;
          if (track.title && track.title.match(/\.(flac|mp3|m4a|wav)$/i)) {
            track.title = track.title.replace(/\.(flac|mp3|m4a|wav)$/i, "");
          }
          track.name = metadata.name || track.name;
          track.artist = metadata.artist || track.artist;
          if (metadata.track) track.track = metadata.track;
          if (metadata.duration) track.duration = metadata.duration;
        }
      } else if (track.title && track.title.match(/\.(flac|mp3|m4a|wav)$/i)) {
        track.title = track.title.replace(/\.(flac|mp3|m4a|wav)$/i, "");
        track.name = track.title;
      }
    }
    return playlistData;
  },

  async checkMusiumAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        const data = await response.json();
        this.musiumAvailable = data.success === true;
        if (this.musiumAvailable) {
          this.startAutoUpdate();
          this.retryCount = 0;
        } else {
          this.stopAutoUpdate();
        }
        return this.musiumAvailable;
      }
    } catch (error) {
      console.log("Musium not running:", error.message);
    }
    this.musiumAvailable = false;
    this.stopAutoUpdate();
    return false;
  },

  async refresh() {
    console.log("PlaylistViewer.refresh called");
    const available = await this.checkMusiumAvailable();
    if (available) {
      await this.updateDisplay();
      if (typeof AudioPlayer !== "undefined") {
        setTimeout(() => {
          AudioPlayer.updateUI();
        }, 100);
      }
    } else {
      const container = document.getElementById("playlistContainer");
      if (container) {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          container.innerHTML = `<div class="playlist-empty"><i class="fas fa-spinner fa-spin"></i><p>Подключение к аудиоплееру... (${this.retryCount}/${this.maxRetries})</p></div>`;
          setTimeout(() => this.refresh(), 2000);
        } else {
          container.innerHTML = `<div class="playlist-empty"><i class="fas fa-exclamation-triangle"></i><p>Аудиоплеер не запущен</p><p class="playlist-empty-hint">Нажмите "Добавить в плейлист" чтобы запустить</p></div>`;
        }
      }
      if (typeof AudioPlayer !== "undefined") {
        setTimeout(() => {
          AudioPlayer.updateUI();
        }, 100);
      }
    }
  },

  async fetchPlaylist() {
    if (!this.musiumAvailable) return null;
    try {
      const response = await fetch(`${this.getMusiumUrl()}/api/getPlaylist`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        this.playlist = data.data.playlist || [];
        this.currentIndex = data.data.currentIndex || -1;
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching playlist:", error);
      this.musiumAvailable = false;
      return null;
    }
  },

  async fetchStatus() {
    if (!this.musiumAvailable) return null;
    try {
      const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error("Error fetching status:", error);
      return null;
    }
  },

  async sendCommand(endpoint, data = {}) {
    if (!this.musiumAvailable) return null;
    try {
      console.log(`Sending command to ${endpoint}:`, data);
      const response = await fetch(`${this.getMusiumUrl()}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      console.log(`Response from ${endpoint}:`, result);
      return result;
    } catch (error) {
      console.error(`Error sending command ${endpoint}:`, error);
      this.musiumAvailable = false;
      this.stopAutoUpdate();
      return null;
    }
  },

  async playTrack(index) {
    console.log(`Play track at index: ${index}`);
    await this.sendCommand("/api/playIndex", { index: index });
    await this.delay(200);
    await this.updateDisplay();
    if (typeof AudioPlayer !== "undefined") {
      AudioPlayer.updateUI();
    }
  },

  async removeTrack(index) {
    console.log(`Remove track at index: ${index}`);
    const trackElement = document.getElementById(`track-${index}`);
    let scrollPosition = 0;
    if (trackElement) {
      scrollPosition = trackElement.offsetTop;
    }
    await this.sendCommand("/api/remove", { index: index });
    await this.fetchPlaylist();
    await this.updateDisplay();
    const container = document.getElementById("playlistContainer");
    if (container && scrollPosition > 0) {
      container.scrollTop = scrollPosition;
    }
  },

  async clearPlaylist() {
    console.log("Clear playlist");
    await this.sendCommand("/api/clear");
    await this.fetchPlaylist();
    await this.updateDisplay();
  },

  async previousTrack() {
    console.log("Previous track");
    await this.sendCommand("/api/previous");
    await this.delay(200);
    await this.updateDisplay();
    if (typeof AudioPlayer !== "undefined") {
      AudioPlayer.updateUI();
    }
  },

  async nextTrack() {
    console.log("Next track");
    await this.sendCommand("/api/next");
    await this.delay(200);
    await this.updateDisplay();
    if (typeof AudioPlayer !== "undefined") {
      AudioPlayer.updateUI();
    }
  },

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  async playPause() {
    console.log("playPause called");
    const status = await this.fetchStatus();
    console.log("Current status:", status);
    if (status && status.isPlaying) {
      console.log("Currently playing, sending pause");
      await this.sendCommand("/api/pause");
    } else {
      console.log("Currently paused, sending play");
      await this.sendCommand("/api/play");
    }
    const newStatus = await this.fetchStatus();
    console.log("New status after command:", newStatus);
    await this.updateProgress();
  },

  async stopPlayback() {
    console.log("Stop playback");
    await this.sendCommand("/api/stop");
    await this.refresh();
  },

  formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  },

  escapeHtml(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  async updateDisplay() {
    console.log("updateDisplay called");
    const container = document.getElementById("playlistContainer");
    if (!container) {
      console.log("playlistContainer not found");
      return;
    }
    const savedScrollTop = container.scrollTop;
    let playlistData = await this.fetchPlaylist();
    const status = await this.fetchStatus();
    if (!playlistData || playlistData.playlist.length === 0) {
      container.innerHTML = `<div class="playlist-empty"><i class="fas fa-music"></i><p>Плейлист пуст</p><p class="playlist-empty-hint">Добавьте треки из библиотеки</p></div>`;
      return;
    }
    playlistData = await this.enrichPlaylistWithMetadata(playlistData);
    let currentTrackNumber = "";
    let currentTrackDisplay = "—";
    let currentArtistName = "";
    let currentTrackId = null;
    if (
      playlistData.currentIndex >= 0 &&
      playlistData.playlist[playlistData.currentIndex]
    ) {
      const currentTrack = playlistData.playlist[playlistData.currentIndex];
      let trackName =
        currentTrack.title || currentTrack.name || currentTrack.filename || "—";
      if (trackName && trackName.match(/\.(flac|mp3|m4a|wav)$/i)) {
        trackName = trackName.replace(/\.(flac|mp3|m4a|wav)$/i, "");
      }
      currentTrackDisplay = trackName;
      if (currentTrack.artist && currentTrack.artist !== "Unknown")
        currentArtistName = currentTrack.artist;
      currentTrackId = `track-${playlistData.currentIndex}`;
    }
    let html = `<div class="playlist-controls"><button class="playlist-control-btn" id="playlistPlayPauseBtn" title="${status && status.isPlaying ? "Пауза" : "Воспроизвести"}"><i class="fas ${status && status.isPlaying ? "fa-pause" : "fa-play"}"></i></button><button class="playlist-control-btn" id="playlistPrevBtn" title="Предыдущий"><i class="fas fa-step-backward"></i></button><button class="playlist-control-btn" id="playlistNextBtn" title="Следующий"><i class="fas fa-step-forward"></i></button><button class="playlist-control-btn" id="playlistStopBtn" title="Стоп"><i class="fas fa-stop"></i></button><button class="playlist-control-btn" id="playlistClearBtn" title="Очистить плейлист"><i class="fas fa-trash-alt"></i></button></div><div class="playlist-info"><div class="playlist-current-track"><i class="fas fa-headphones"></i><div class="playlist-current-info"><div class="playlist-current-name" id="playlistCurrentName">${this.escapeHtml(currentTrackDisplay)}</div>${currentArtistName ? `<div class="playlist-current-artist" id="playlistCurrentArtist">${this.escapeHtml(currentArtistName)}</div>` : ""}</div></div><div class="playlist-progress"><span id="playlistCurrentTime">${this.formatTime(status ? status.position : 0)}</span><div class="progress-bar" id="playlistProgressBar"><div class="progress-fill" id="playlistProgressFill" style="width: ${status && status.duration ? (status.position / status.duration) * 100 : 0}%"></div></div><span id="playlistTotalTime">${this.formatTime(status ? status.duration : 0)}</span></div></div><div class="playlist-tracks" id="playlistTracksList">`;
    const tracksByArtist = new Map();
    for (let idx = 0; idx < playlistData.playlist.length; idx++) {
      const track = playlistData.playlist[idx];
      const artist =
        track.artist && track.artist !== "Unknown" ? track.artist : "Разное";
      if (!tracksByArtist.has(artist)) {
        tracksByArtist.set(artist, []);
      }
      tracksByArtist.get(artist).push({ idx, track });
    }
    let globalTrackIndex = 0;
    for (const [artist, tracks] of tracksByArtist) {
      html += `<div class="playlist-artist-group"><div class="playlist-artist-header" data-artist="${this.escapeHtml(artist)}"><i class="fas fa-chevron-right group-arrow"></i><i class="fas fa-user group-icon"></i><span class="playlist-artist-name">${this.escapeHtml(artist)}</span><span class="playlist-artist-count">${tracks.length} ${this.getTracksWord(tracks.length)}</span></div><div class="playlist-artist-tracks">`;
      for (const { idx, track } of tracks) {
        const isCurrent = idx === playlistData.currentIndex;
        const trackNumber = track.track || globalTrackIndex + 1;
        const trackName =
          track.title ||
          track.name ||
          track.filename ||
          `Трек ${globalTrackIndex + 1}`;
        const trackDuration = track.duration || 0;
        const currentClass = isCurrent ? "current" : "";
        html += `<div class="playlist-track ${currentClass}" data-index="${idx}" id="track-${idx}">
            <div class="playlist-track-number">${trackNumber}</div>
            <div class="playlist-track-name" title="${this.escapeHtml(trackName)}">${this.escapeHtml(trackName)}</div>
            <div class="playlist-track-duration">${this.formatTime(trackDuration)}</div>
            <div class="playlist-track-controls">
                <button class="playlist-track-play" data-index="${idx}" title="Воспроизвести"><i class="fas fa-play"></i></button>
                <button class="playlist-track-remove" data-index="${idx}" title="Удалить"><i class="fas fa-trash-alt"></i></button>
            </div>
        </div>`;
        globalTrackIndex++;
      }
      html += `</div></div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
    if (currentTrackId) {
      const currentTrackElement = document.getElementById(currentTrackId);
      if (currentTrackElement) {
        currentTrackElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    } else if (savedScrollTop > 0) {
      container.scrollTop = savedScrollTop;
    }
    this.attachEventListeners();
    this.attachGroupToggleListeners();
    console.log("updateDisplay finished");
  },

  attachGroupToggleListeners() {
    document.querySelectorAll(".playlist-artist-header").forEach((header) => {
      header.removeEventListener("click", this.handleGroupToggle);
      this.handleGroupToggle = (e) => {
        e.stopPropagation();
        header.classList.toggle("collapsed");
        const tracksContainer = header.nextElementSibling;
        if (
          tracksContainer &&
          tracksContainer.classList.contains("playlist-artist-tracks")
        ) {
          tracksContainer.classList.toggle("collapsed");
        }
        const arrow = header.querySelector(".group-arrow");
        if (arrow) {
          arrow.classList.toggle("rotated");
        }
      };
      header.addEventListener("click", this.handleGroupToggle);
      const tracksContainer = header.nextElementSibling;
      const isCurrentGroup =
        tracksContainer &&
        tracksContainer.querySelector(".playlist-track.current");
      if (!isCurrentGroup) {
        header.classList.add("collapsed");
        if (tracksContainer) tracksContainer.classList.add("collapsed");
        const arrow = header.querySelector(".group-arrow");
        if (arrow) arrow.classList.add("rotated");
      }
    });
  },

  getTracksWord(count) {
    if (count % 10 === 1 && count % 100 !== 11) return "трек";
    if (
      count % 10 >= 2 &&
      count % 10 <= 4 &&
      (count % 100 < 10 || count % 100 >= 20)
    )
      return "трека";
    return "треков";
  },

  attachEventListeners() {
    const playPauseBtn = document.getElementById("playlistPlayPauseBtn");
    if (playPauseBtn) {
      playPauseBtn.addEventListener("click", () => this.playPause());
    }
    const prevBtn = document.getElementById("playlistPrevBtn");
    if (prevBtn) {
      prevBtn.addEventListener("click", () => this.previousTrack());
    }
    const nextBtn = document.getElementById("playlistNextBtn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this.nextTrack());
    }
    const stopBtn = document.getElementById("playlistStopBtn");
    if (stopBtn) {
      stopBtn.addEventListener("click", () => this.stopPlayback());
    }
    const clearBtn = document.getElementById("playlistClearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearPlaylist());
    }
    document.querySelectorAll(".playlist-track-play").forEach((btn) => {
      btn.removeEventListener("click", this.handlePlayClick);
      this.handlePlayClick = async (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        await this.playTrack(index);
      };
      btn.addEventListener("click", this.handlePlayClick);
    });
    document.querySelectorAll(".playlist-track-remove").forEach((btn) => {
      btn.removeEventListener("click", this.handleRemoveClick);
      this.handleRemoveClick = async (e) => {
        e.stopPropagation();
        const index = parseInt(btn.dataset.index);
        await this.removeTrack(index);
      };
      btn.addEventListener("click", this.handleRemoveClick);
    });
    document.querySelectorAll(".playlist-track").forEach((track) => {
      track.removeEventListener("click", this.handleTrackClick);
      this.handleTrackClick = async () => {
        const index = parseInt(track.dataset.index);
        await this.playTrack(index);
      };
      track.addEventListener("click", this.handleTrackClick);
    });
  },

  async updateProgress() {
    const status = await this.fetchStatus();
    if (!status) return;
    const currentTimeSpan = document.getElementById("playlistCurrentTime");
    const totalTimeSpan = document.getElementById("playlistTotalTime");
    const progressFill = document.getElementById("playlistProgressFill");
    const playPauseBtn = document.getElementById("playlistPlayPauseBtn");
    if (currentTimeSpan) {
      currentTimeSpan.textContent = this.formatTime(status.position);
    }
    if (totalTimeSpan) {
      totalTimeSpan.textContent = this.formatTime(status.duration);
    }
    if (progressFill && status.duration > 0) {
      const percent = (status.position / status.duration) * 100;
      progressFill.style.width = percent + "%";
    }
    if (playPauseBtn) {
      if (status.isPlaying) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playPauseBtn.title = "Пауза";
      } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        playPauseBtn.title = "Воспроизвести";
      }
    }
  },

  startAutoUpdate() {
    this.stopAutoUpdate();
    this.updateInterval = setInterval(() => {
      this.updateProgress();
      this.updateCurrentTrackHighlight();
    }, 500);
  },

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  },

  async updateCurrentTrackHighlight() {
    const status = await this.fetchStatus();
    if (!status) return;
    const currentIndex = status.currentIndex;
    document.querySelectorAll(".playlist-track").forEach((track) => {
      track.classList.remove("current");
    });
    const currentTrack = document.querySelector(
      `.playlist-track[data-index="${currentIndex}"]`,
    );
    if (currentTrack) {
      currentTrack.classList.add("current");
    }
    const playlistData = await this.fetchPlaylist();
    if (
      playlistData &&
      playlistData.playlist &&
      playlistData.playlist[currentIndex]
    ) {
      const currentTrackData = playlistData.playlist[currentIndex];
      let trackName =
        currentTrackData.title ||
        currentTrackData.name ||
        currentTrackData.filename ||
        "—";
      if (trackName && trackName.match(/\.(flac|mp3|m4a|wav)$/i)) {
        trackName = trackName.replace(/\.(flac|mp3|m4a|wav)$/i, "");
      }
      const trackArtist =
        currentTrackData.artist && currentTrackData.artist !== "Unknown"
          ? currentTrackData.artist
          : "";
      const currentTrackNameEl = document.querySelector(
        ".playlist-current-name",
      );
      const currentTrackArtistEl = document.querySelector(
        ".playlist-current-artist",
      );
      if (currentTrackNameEl) {
        currentTrackNameEl.textContent = trackName;
      }
      if (currentTrackArtistEl) {
        if (trackArtist) {
          currentTrackArtistEl.textContent = trackArtist;
          currentTrackArtistEl.style.display = "block";
        } else {
          currentTrackArtistEl.style.display = "none";
        }
      }
    }
  },

  reset() {
    this.initialized = false;
    this.musiumAvailable = false;
    this.playlist = [];
    this.currentIndex = -1;
  },

  async init() {
    console.log("[PlaylistViewer] init called, initialized:", this.initialized);
    if (this.initialized) {
      console.log("[PlaylistViewer] Already initialized, skipping");
      return;
    }
    if (this.initialized) return;
    this.initialized = true;
    console.log("PlaylistViewer.init called");
    if (typeof AudioPlayer !== "undefined" && AudioPlayer.musiumUrl) {
      this.setMusiumUrl(AudioPlayer.musiumUrl);
    }
    await this.refresh();
  },
};
