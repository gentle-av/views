const PlayerManager = {
    currentFile: null,
    currentPlaylist: [],
    currentIndex: -1,
    isPlaying: false,
    isFullscreen: false,
    statusCheckInterval: null,
    playerActive: false,
    isMobile: false,
    serverHost: window.location.hostname,
    serverPort: window.location.port,
    fullscreenRetryInterval: null,
    currentMediaType: 'video',
    updatingStatus: false,
    init() {
        this.setupEventListeners();
        this.checkMobile();
        console.log('PlayerManager initialized, server port:', this.serverPort);
        this.checkPlayerAvailability();
    },
    getPlayerUrl() {
        return `http://${this.serverHost}:8082`;
    },
    getServerUrl() {
        return `http://${this.serverHost}:${this.serverPort}`;
    },
    checkMobile() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    setupEventListeners() {
        const elements = {
            playPauseBtn: 'playPauseBtn',
            seekForwardBtn: 'seekForwardBtn',
            seekBackwardBtn: 'seekBackwardBtn',
            closeFileBtn: 'closeFileBtn',
            closeControlPage: 'close-control-page',
            deleteFileBtn: 'deleteFileBtn',
            fullscreenBtn: 'fullscreenBtn'
        };
        for (const [key, id] of Object.entries(elements)) {
            const element = document.getElementById(id);
            if (element) {
                const handler = this[key === 'closeControlPage' ? 'closeFile' :
                                   key === 'playPauseBtn' ? 'togglePlayPause' :
                                   key === 'seekForwardBtn' ? 'seekForward' :
                                   key === 'seekBackwardBtn' ? 'seekBackward' :
                                   key === 'closeFileBtn' ? 'closeFile' :
                                   key === 'deleteFileBtn' ? 'deleteFile' :
                                   key === 'fullscreenBtn' ? 'toggleFullscreen' : null];
                if (handler) element.addEventListener('click', () => handler.call(this));
            }
        }
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    },
    async checkPlayerAvailability() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${this.getPlayerUrl()}/api/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const status = await response.json();
                if (status && status.available === true) {
                    console.log('Player is available, checking current playback');
                    await this.checkCurrentPlayback();
                } else {
                    console.log('Player not available');
                    this.showLibrary();
                }
            } else {
                console.log('Player not responding');
                this.showLibrary();
            }
        } catch (error) {
            console.log('Player not running, will start on first file click');
            this.showLibrary();
        }
    },
    showLibrary() {
        const pageContainer = document.querySelector('.page-container');
        const audioPlayerBar = document.getElementById('audioPlayerBar');
        if (pageContainer) pageContainer.style.display = 'flex';
        if (audioPlayerBar) audioPlayerBar.style.display = 'none';
        this.playerActive = false;
        this.currentFile = null;
    },
    hideLibrary() {
        const pageContainer = document.querySelector('.page-container');
        const audioPlayerBar = document.getElementById('audioPlayerBar');
        if (pageContainer) pageContainer.style.display = 'none';
        if (audioPlayerBar) audioPlayerBar.style.display = 'none';
    },
    async callPlayerApi(endpoint, data = {}) {
        if (!this.playerActive) return null;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const url = `${this.getPlayerUrl()}${endpoint}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return await response.json();
        } catch (error) {
            console.error(`API error on ${endpoint}:`, error);
            this.handlePlayerDisconnected();
            return null;
        }
    },
    handlePlayerDisconnected() {
        console.log('Player disconnected, returning to library');
        this.playerActive = false;
        this.hideControl();
        this.showLibrary();
        // Utils.showNotification('Плеер закрыт, возврат в библиотеку', 'info');
    },
    async seekForward() {
        if (!this.playerActive) return;
        const result = await this.callPlayerApi('/api/seekforward', { seconds: 10 });
        if (result && result.success) {
            // Utils.showNotification('Вперед 10 секунд', 'success');
        } else if (result === null) {
            this.handlePlayerDisconnected();
        } else {
            Utils.showNotification('Ошибка перемотки', 'error');
        }
    },
    async seekBackward() {
        if (!this.playerActive) return;
        const result = await this.callPlayerApi('/api/seekbackward', { seconds: 10 });
        if (result && result.success) {
            // Utils.showNotification('Назад 10 секунд', 'success');
        } else if (result === null) {
            this.handlePlayerDisconnected();
        } else {
            Utils.showNotification('Ошибка перемотки', 'error');
        }
    },
    async toggleFullscreen() {
        if (!this.playerActive) return;
        const newState = !this.isFullscreen;
        const result = await this.callPlayerApi('/api/fullscreen', { fullscreen: newState });
        if (result && result.success) {
            this.isFullscreen = newState;
            this.updateFullscreenButton();
            // Utils.showNotification(newState ? 'Полноэкранный режим включен' : 'Полноэкранный режим выключен', 'success');
        } else if (result === null) {
            this.handlePlayerDisconnected();
        }
    },
    updateFullscreenButton() {
        const fullscreenBtn = document.getElementById('fullscreenBtn');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = this.isFullscreen ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
        }
    },
    updatePlayPauseButton() {
        const btn = document.getElementById('playPauseBtn');
        if (btn) {
            btn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
    },
    async togglePlayPause() {
        if (!this.playerActive) return;
        if (this.updatingStatus) return;
        try {
            this.updatingStatus = true;
            const result = await this.callPlayerApi('/api/playpause');
            if (result && result.success) {
                this.isPlaying = !this.isPlaying;
                this.updatePlayPauseButton();
                this.updatePlaybackStatus(this.isPlaying);
            } else if (result === null) {
                this.handlePlayerDisconnected();
            }
        } catch (error) {
            console.error('Toggle play/pause error:', error);
        } finally {
            setTimeout(() => { this.updatingStatus = false; }, 500);
        }
    },
    async closeFile() {
        if (!this.playerActive) {
            this.hideControl();
            this.showLibrary();
            return;
        }
        const result = await this.callPlayerApi('/api/close');
        if (result && result.success) {
            // Utils.showNotification('Файл закрыт', 'success');
        }
        this.hideControl();
        this.showLibrary();
    },
    async deleteFile() {
        if (!this.playerActive) {
            this.hideControl();
            this.showLibrary();
            return;
        }
        if (!confirm('Вы уверены, что хотите переместить файл в корзину?')) return;
        const result = await this.callPlayerApi('/api/closefile');
        if (result && result.success) {
            if (typeof VideoExplorer !== 'undefined' && VideoExplorer.currentPath) {
                VideoExplorer.loadDirectory(VideoExplorer.currentPath);
            }
        } else if (result === null) {
            Utils.showNotification('Плеер закрыт, файл не удалён', 'info');
        } else {
            Utils.showNotification(result?.error || 'Ошибка при удалении', 'error');
        }
        this.hideControl();
        this.showLibrary();
    },
    async getStatus() {
      if (!this.playerActive) return false;
      try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const url = `${this.getPlayerUrl()}/api/status`;
          const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
              signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (!response.ok) {
              console.log('Status response not ok:', response.status);
              return true;
          }
          const status = await response.json();
          if (status && status.available === true) {
              this.isPlaying = status.isPlaying === true;
              this.isFullscreen = status.isFullScreen === "true" || status.isFullScreen === true;
              if (status.currentFile && status.currentFile.available) {
                  const newFile = status.currentFile.path;
                  if (this.currentFile !== newFile) {
                      this.currentFile = newFile;
                      this.currentMediaType = 'video';
                      this.updatePlaybackStatus(this.isPlaying);
                  }
              }
              this.updatePlayPauseButton();
              this.updateFullscreenButton();
              return true;
          } else if (status && status.available === false) {
              console.log('Player reported unavailable');
              return this.checkPlayerRunning();
          }
      } catch (error) {
          console.log('Status check failed, keeping player active if we have a file');
          return true;
      }
      return true;
    },
    handlePlayerDisconnected() {
        console.log('Player possibly disconnected, checking...');
        setTimeout(async () => {
            const isRunning = await this.checkPlayerRunning();
            if (!isRunning && this.playerActive) {
                console.log('Player confirmed disconnected, returning to library');
                this.playerActive = false;
                this.hideControl();
                this.showLibrary();
                Utils.showNotification('Плеер закрыт', 'info');
            } else if (isRunning) {
                console.log('Player is still running, keeping active');
            }
        }, 1000);
    },

    startStatusPolling() {
        this.stopStatusPolling();
        this.statusCheckInterval = setInterval(() => this.getStatus(), 5000);
    },

    async checkCurrentPlayback() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${this.getPlayerUrl()}/api/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                console.log('Status check failed, but player might still be running');
                return false;
            }
            const status = await response.json();
            if (status && status.available === true) {
                console.log('Player is running, current status:', status);
                this.playerActive = true;
                this.isPlaying = status.isPlaying === true;
                this.isFullscreen = status.isFullScreen === "true" || status.isFullScreen === true;
                if (status.currentFile && status.currentFile.available) {
                    this.currentFile = status.currentFile.path;
                    this.currentMediaType = 'video';
                }
                this.hideLibrary();
                this.showControl();
                this.updatePlaybackStatus(this.isPlaying);
                this.updatePlayPauseButton();
                this.updateFullscreenButton();
                this.startStatusPolling();
                return true;
            } else {
                console.log('Player not running or no file playing');
                return false;
            }
        } catch (error) {
            console.log('Player not running');
            return false;
        }
    },
    async checkCurrentPlayback() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(`${this.getPlayerUrl()}/api/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                this.showLibrary();
                return false;
            }
            const status = await response.json();
            if (status && status.available === true) {
                console.log('Player is running, current status:', status);
                this.playerActive = true;
                this.isPlaying = status.isPlaying === true;
                this.isFullscreen = status.isFullScreen === "true" || status.isFullScreen === true;
                if (status.currentFile && status.currentFile.available) {
                    this.currentFile = status.currentFile.path;
                    this.currentMediaType = 'video';
                }
                this.hideLibrary();
                this.showControl();
                this.updatePlaybackStatus(this.isPlaying);
                this.updatePlayPauseButton();
                this.updateFullscreenButton();
                this.startStatusPolling();
                if (!this.isFullscreen) {
                    setTimeout(() => this.toggleFullscreen(), 1000);
                }
                return true;
            } else {
                console.log('Player not running');
                this.playerActive = false;
                this.hideControl();
                this.showLibrary();
                return false;
            }
        } catch (error) {
            console.log('Player not running');
            this.playerActive = false;
            this.hideControl();
            this.showLibrary();
            return false;
        }
    },
    async playMedia(path) {
        console.log('PlayerManager.playMedia called with path:', path);
        try {
            const isAvailable = await this.checkPlayerRunning();
            console.log('Player running check result:', isAvailable);
            if (!isAvailable) {
                console.log('Player not running, launching...');
                const launchResult = await this.launchPlayerWithFile(path);
                console.log('Launch result:', launchResult);
                if (!launchResult) throw new Error('Failed to launch player');
                await this.waitForPlayer(15000);
            } else {
                console.log('Player running, opening file...');
                const openResult = await this.callPlayerApi('/api/openfile', { path: path });
                console.log('Open result:', openResult);
                if (!openResult || !openResult.success) throw new Error(openResult?.error || 'Failed to open file');
                await this.delay(2000);
            }
            const newStatus = await this.checkPlayerRunningWithStatus();
            console.log('New status after opening:', newStatus);
            if (newStatus && newStatus.available === true) {
                this.playerActive = true;
                this.currentFile = newStatus.currentFile?.path || path;
                this.isPlaying = newStatus.isPlaying === true;
                this.isFullscreen = newStatus.isFullScreen === "true" || newStatus.isFullScreen === true;
                this.hideLibrary();
                this.showControl();
                this.updatePlaybackStatus(this.isPlaying);
                this.updatePlayPauseButton();
                this.updateFullscreenButton();
                this.startStatusPolling();
                if (!this.isFullscreen) setTimeout(() => this.toggleFullscreen(), 1500);
                // Utils.showNotification(`Воспроизведение: ${path.split('/').pop()}`, 'success');
            } else {
                throw new Error('Player did not load the file');
            }
        } catch (error) {
            console.error('Error playing media:', error);
            Utils.showNotification(error.message || 'Ошибка воспроизведения', 'error');
            this.hideControl();
            this.showLibrary();
        }
    },
    async checkPlayerRunning() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${this.getPlayerUrl()}/api/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const data = await response.json();
                return data.available === true;
            }
        } catch (error) {}
        return false;
    },
    async checkPlayerRunningWithStatus() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${this.getPlayerUrl()}/api/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {}
        return null;
    },
    async waitForPlayer(timeoutMs) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            const isRunning = await this.checkPlayerRunning();
            if (isRunning) {
                console.log('Player is now running');
                await this.delay(2000);
                return true;
            }
            await this.delay(1000);
        }
        throw new Error('Player did not start within timeout');
    },
    async launchPlayerWithFile(path) {
        try {
            const response = await fetch(`${this.getServerUrl()}/api/open`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path })
            });
            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Error launching player:', error);
            return false;
        }
    },
    showControl() {
        const playerControlPage = document.getElementById('playerControlPage');
        if (playerControlPage) playerControlPage.style.display = 'flex';
    },
    hideControl() {
        const playerControlPage = document.getElementById('playerControlPage');
        if (playerControlPage) playerControlPage.style.display = 'none';
        this.currentFile = null;
        this.stopStatusPolling();
        this.playerActive = false;
        this.isFullscreen = false;
        this.updateFullscreenButton();
        if (this.fullscreenRetryInterval) {
            clearInterval(this.fullscreenRetryInterval);
            this.fullscreenRetryInterval = null;
        }
    },
    startStatusPolling() {
        this.stopStatusPolling();
        this.statusCheckInterval = setInterval(() => this.getStatus(), 3000);
    },
    stopStatusPolling() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    },
    handleKeyPress(e) {
        if (!this.playerActive) return;
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.seekBackward();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.seekForward();
                break;
            case 'KeyF':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'Escape':
                if (this.isFullscreen) this.toggleFullscreen();
                break;
        }
    },
    updatePlaybackStatus(isPlaying) {
        this.isPlaying = isPlaying;
        const placeholder = document.querySelector('.player-placeholder');
        if (!placeholder) return;
        const fileName = this.currentFile ? this.currentFile.split('/').pop() : 'Файл';
        const statusText = isPlaying ? 'Воспроизводится' : 'На паузе';
        const statusIcon = isPlaying ? '<i class="fas fa-play-circle" style="color: var(--green); font-size: 60px;"></i>' : '<i class="fas fa-pause-circle" style="color: var(--orange); font-size: 60px;"></i>';
        placeholder.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="margin-bottom: 20px;">${statusIcon}</div>
                <div style="font-size: 1.3rem; font-weight: 500; color: var(--fg0); margin-bottom: 10px; text-align: center; max-width: 80vw; word-break: break-word;">${this.escapeHtml(fileName)}</div>
                <div style="font-size: 1rem; color: ${isPlaying ? 'var(--green)' : 'var(--orange)'}; margin-bottom: 5px;">${statusText}</div>
                <div style="font-size: 0.9rem; color: var(--fg3);">Видео</div>
            </div>
        `;
    },
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
