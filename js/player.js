const PlayerManager = {
    currentFile: null,
    isPlaying: false,
    isFullscreen: false,
    statusCheckInterval: null,
    apiAvailable: false,
    maxRetries: 30,
    retryDelay: 2000,
    playerActive: false,
    isMobile: false,
    serverHost: window.location.hostname, // Сохраняем хост сервера

    init() {
        this.setupEventListeners();
        this.setPlayerActive(false);
        this.checkMobile();
        console.log('Server host:', this.serverHost);
        console.log('Server URL:', this.getServerUrl());
        console.log('Player URL:', this.getPlayerUrl());
    },

    getServerUrl() {
        return `http://${this.serverHost}:${CONFIG.SERVER_PORT}`;
    },

    getPlayerUrl() {
        return `http://${this.serverHost}:${CONFIG.PLAYER_PORT}`;
    },

    checkMobile() {
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('Mobile device:', this.isMobile);
    },

    setupEventListeners() {
        document.getElementById('playPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('exitFullscreenBtn').addEventListener('click', () => this.exitFullscreen());
        document.getElementById('closeFileBtn').addEventListener('click', () => this.closeFile());
        document.querySelector('.close-control-page').addEventListener('click', () => this.hideControl());

        document.getElementById('topPlayPauseBtn').addEventListener('click', () => this.togglePlayPause());
        document.getElementById('topFullscreenBtn').addEventListener('click', () => this.toggleFullscreen());
        document.getElementById('topCloseFileBtn').addEventListener('click', () => this.closeFile());

        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    },

    setPlayerActive(active) {
        this.playerActive = active;
        const topPlayBtn = document.getElementById('topPlayPauseBtn');
        const topFullscreenBtn = document.getElementById('topFullscreenBtn');
        const topCloseBtn = document.getElementById('topCloseFileBtn');

        if (active) {
            topPlayBtn.classList.add('active');
            topFullscreenBtn.classList.add('active');
            topCloseBtn.classList.add('active');
            if (this.isPlaying) {
                topPlayBtn.classList.add('playing');
            }
            this.updateFullscreenButton();
        } else {
            topPlayBtn.classList.remove('active', 'playing');
            topFullscreenBtn.classList.remove('active');
            topCloseBtn.classList.remove('active');
            topPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
            topFullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    },

    updateTopBar() {
        if (!this.playerActive || !this.currentFile) return;

        const topPlayBtn = document.getElementById('topPlayPauseBtn');
        topPlayBtn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';

        if (this.isPlaying) {
            topPlayBtn.classList.add('playing');
        } else {
            topPlayBtn.classList.remove('playing');
        }
    },

    updateFullscreenButton() {
        const topFullscreenBtn = document.getElementById('topFullscreenBtn');
        const exitFullscreenBtn = document.getElementById('exitFullscreenBtn');

        if (this.isFullscreen) {
            topFullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            topFullscreenBtn.classList.add('active');
            exitFullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        } else {
            topFullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            topFullscreenBtn.classList.remove('active');
            exitFullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        }
    },

    async launchPlayerWithFile(path) {
        console.log('Launching player with file:', path);

        try {
            // Используем правильный URL для сервера
            const url = `${this.getServerUrl()}/api/open`;
            console.log('Launch URL:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: path })
            });

            const data = await response.json();
            console.log('Launch response:', data);

            if (data.success) {
                return true;
            } else {
                throw new Error(data.error || 'Failed to launch player');
            }
        } catch (error) {
            console.error('Error launching player:', error);
            throw error;
        }
    },

    async checkApiAvailability() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const url = `${this.getPlayerUrl()}/api/status`;
            console.log('Checking API at:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                console.log('API check result:', data);
                return data && data.available === true;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('API check timeout');
            } else {
                console.log('API not available yet:', error.message);
            }
        }
        return false;
    },

    async checkFullscreenStatus() {
        if (!this.currentFile) return false;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const url = `${this.getPlayerUrl()}/api/status`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) return false;

            const data = await response.json();
            console.log('Fullscreen status check raw data:', data);

            if (data && data.available) {
                const isFullScreen = data.isFullScreen === true ||
                                     data.isFullScreen === "true" ||
                                     data.isFullScreen === 1;

                console.log('Parsed fullscreen status:', isFullScreen, 'from value:', data.isFullScreen);

                const wasFullscreen = this.isFullscreen;
                this.isFullscreen = isFullScreen;

                if (wasFullscreen !== this.isFullscreen) {
                    console.log('Fullscreen status changed to:', this.isFullscreen);
                    this.updateFullscreenButton();

                    if (this.isFullscreen) {
                        document.querySelector('.status-indicator')?.style.setProperty('background', 'var(--green)');
                    } else {
                        document.querySelector('.status-indicator')?.style.setProperty('background', 'var(--yellow)');
                    }
                }

                return this.isFullscreen;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Fullscreen status check timeout');
            } else {
                console.log('Error checking fullscreen status:', error.message);
            }
        }
        return false;
    },

    async waitForApi(maxAttempts = 40) {
        console.log('Waiting for player API to become available...');
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            this.updateProgressBar(attempt, maxAttempts);

            try {
                const isAvailable = await this.checkApiAvailability();

                if (isAvailable) {
                    this.hideProgressBar();
                    console.log('Player API is now available');
                    return true;
                }
            } catch (error) {
                lastError = error;
            }

            console.log(`Attempt ${attempt}/${maxAttempts}: API not ready, waiting ${this.retryDelay}ms...`);
            await Utils.delay(this.retryDelay);
        }

        this.hideProgressBar();
        console.log('Player API did not become available after', maxAttempts, 'attempts');
        if (lastError) {
            console.log('Last error:', lastError);
        }
        return false;
    },

    updateProgressBar(attempt, maxAttempts) {
        const progressBar = document.getElementById('loadingProgress');
        const progressFill = progressBar.querySelector('.loading-progress-bar');
        progressBar.classList.add('active');
        progressFill.style.width = (attempt / maxAttempts * 100) + '%';

        const placeholder = document.querySelector('.player-placeholder');
        if (placeholder && this.currentFile) {
            const secondsPassed = (attempt * this.retryDelay / 1000);
            const totalSeconds = (maxAttempts * this.retryDelay / 1000);

            placeholder.innerHTML = `
                <i class="fas fa-spinner fa-spin" style="font-size: 60px;"></i>
                <div>Запуск Mediateka на сервере ${this.serverHost}...</div>
                <div style="font-size: 0.9rem; margin-top: 10px; color: var(--fg3);">
                    Попытка ${attempt} из ${maxAttempts}
                </div>
                <div style="font-size: 0.8rem; margin-top: 5px; color: var(--fg4);">
                    Прошло: ${secondsPassed}с / ~${totalSeconds}с
                </div>
                <div style="font-size: 0.8rem; margin-top: 20px; color: var(--fg4);">
                    Плеер запускается на сервере, пожалуйста подождите...
                </div>
            `;
        }
    },

    hideProgressBar() {
        const progressBar = document.getElementById('loadingProgress');
        progressBar.classList.remove('active');
        progressBar.querySelector('.loading-progress-bar').style.width = '0%';
    },

  async playVideo(path) {
    try {
        this.currentFile = path;
        const fileName = path.split('/').pop();

        document.getElementById('playerTrackName').textContent = fileName;
        document.getElementById('playerTrackPath').textContent = path;

        this.showControl(path);
        document.getElementById('currentFileName').textContent = fileName;
        document.getElementById('currentFilePath').textContent = path;

        console.log('Launching player for file:', path);
        console.log('Server host:', this.serverHost);

        // ШАГ 1: Проверяем, запущен ли плеер
        let isPlayerRunning = false;
        try {
            const url = `${this.getPlayerUrl()}/api/status`;
            console.log('Checking player status at:', url);

            const statusCheck = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                signal: AbortSignal.timeout(2000)
            });

            if (statusCheck.ok) {
                const statusData = await statusCheck.json();
                isPlayerRunning = statusData.available === true;
                console.log('Player already running:', isPlayerRunning);
            }
        } catch (e) {
            console.log('Player not running or API not responding');
            isPlayerRunning = false;
        }

        // ШАГ 2: Открываем файл в плеере
        if (!isPlayerRunning) {
            console.log('Launching new player instance...');
            await this.launchPlayerWithFile(path);
            console.log('Player launched, waiting for API...');
            await Utils.delay(2000);
        } else {
            console.log('Player already running, sending open file command...');
            try {
                const url = `${this.getPlayerUrl()}/api/openfile`;
                console.log('Open file URL:', url);

                const openResponse = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: path }),
                    signal: AbortSignal.timeout(5000)
                });

                if (!openResponse.ok) {
                    throw new Error(`HTTP error: ${openResponse.status}`);
                }

                const openData = await openResponse.json();
                console.log('Open file response:', openData);

                if (!openData.success) {
                    throw new Error(openData.error || 'Failed to open file');
                }
            } catch (err) {
                console.error('Error opening file:', err);
                console.log('Falling back to launching new instance...');
                await this.launchPlayerWithFile(path);
                await Utils.delay(2000);
            }
        }

        // ШАГ 3: Ждем API и сразу отправляем команду на fullscreen
        console.log('Waiting for API and enabling fullscreen...');

        let apiReady = false;
        let fullscreenActivated = false;

        // Делаем несколько попыток с увеличенным таймаутом
        for (let attempt = 1; attempt <= 30; attempt++) {
            this.updateProgressBar(attempt, 30);

            try {
                // Сначала проверяем доступность API
                const statusUrl = `${this.getPlayerUrl()}/api/status`;
                const statusResponse = await fetch(statusUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                    signal: AbortSignal.timeout(3000)
                });

                if (statusResponse.ok) {
                    const statusData = await statusResponse.json();

                    if (statusData && statusData.available === true) {
                        console.log(`API available on attempt ${attempt}`);
                        apiReady = true;

                        // Как только API доступно, сразу отправляем fullscreen
                        if (!fullscreenActivated) {
                            console.log(`Sending fullscreen command on attempt ${attempt}`);
                            try {
                                const fsUrl = `${this.getPlayerUrl()}/api/fullscreen`;
                                const fsResponse = await fetch(fsUrl, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ fullscreen: true }),
                                    signal: AbortSignal.timeout(3000)
                                });

                                if (fsResponse.ok) {
                                    const fsData = await fsResponse.json();
                                    if (fsData.success) {
                                        console.log('Fullscreen command accepted');
                                        fullscreenActivated = true;

                                        // Даем время на применение fullscreen
                                        await Utils.delay(1000);

                                        // Проверяем статус еще раз для подтверждения
                                        try {
                                            await this.checkFullscreenStatus();
                                        } catch (e) {
                                            // Игнорируем ошибки проверки
                                        }
                                    }
                                }
                            } catch (fsError) {
                                console.log(`Fullscreen attempt ${attempt} failed:`, fsError.message);
                                // Продолжаем попытки, даже если fullscreen не удался
                            }
                        }

                        // Если мы уже отправили fullscreen и прошло достаточно времени, выходим
                        if (fullscreenActivated && attempt >= 5) {
                            break;
                        }
                    }
                }
            } catch (error) {
                console.log(`Attempt ${attempt}: API not ready (${error.message})`);
            }

            // Ждем перед следующей попыткой
            await Utils.delay(this.retryDelay);
        }

        if (!apiReady) {
            throw new Error('API плеера не отвечает после 30 попыток');
        }

        // ШАГ 4: Финальная проверка и активация UI
        console.log('API ready, finalizing...');

        // Последняя попытка включить fullscreen, если еще не получилось
        if (!fullscreenActivated) {
            console.log('Final fullscreen attempt...');
            try {
                const fsUrl = `${this.getPlayerUrl()}/api/fullscreen`;
                await fetch(fsUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullscreen: true })
                });
            } catch (e) {
                console.log('Final fullscreen attempt failed:', e.message);
            }
        }

        // Активируем UI
        this.setPlayerActive(true);
        this.showSuccessState();
        this.isPlaying = true;
        this.updatePlayPauseButton();
        this.updateTopBar();
        this.startStatusCheck();

        // Периодически проверяем fullscreen и пробуем включить если нужно
        this.fullscreenRetryInterval = setInterval(() => {
            if (this.currentFile && !this.isFullscreen) {
                console.log('Periodic fullscreen check - attempting to enable');
                fetch(`${this.getPlayerUrl()}/api/fullscreen`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullscreen: true })
                }).catch(e => {});
            }
        }, 5000);

        Utils.addToHistory(path, 'success');
        console.log('Video playback started successfully');

    } catch (error) {
        console.error('Error in playVideo:', error);
        this.setPlayerActive(false);
        this.showErrorState(error.message);
        Utils.addToHistory(this.currentFile || path, 'error');
    }
},

// Добавляем метод cleanup при закрытии
hideControl() {
    document.getElementById('playerControlPage').style.display = 'none';
    document.querySelector('.main-container').classList.remove('blurred');
    this.currentFile = null;
    this.stopStatusCheck();
    this.setPlayerActive(false);
    this.isFullscreen = false;

    // Очищаем интервал повторных попыток fullscreen
    if (this.fullscreenRetryInterval) {
        clearInterval(this.fullscreenRetryInterval);
        this.fullscreenRetryInterval = null;
    }

    document.querySelector('.player-control-header').style.borderColor = '';
    document.getElementById('playerTrackName').textContent = 'Нет активного файла';
    document.getElementById('playerTrackPath').textContent = '';
},

    showControl(filePath) {
        document.getElementById('playerControlPage').style.display = 'flex';
        document.querySelector('.main-container').classList.add('blurred');

        const placeholder = document.querySelector('.player-placeholder');
        placeholder.innerHTML = `
            <i class="fas fa-spinner fa-spin" style="font-size: 60px;"></i>
            <div>Открытие файла в Mediateka на сервере ${this.serverHost}...</div>
            <div style="font-size: 0.9rem; margin-top: 10px; color: var(--fg3);">Плеер запустится на сервере, управление будет доступно с этого устройства</div>
        `;
    },

    showSuccessState() {
        const placeholder = document.querySelector('.player-placeholder');
        placeholder.innerHTML = `
            <i class="fas fa-check-circle" style="color: var(--green); font-size: 80px;"></i>
            <div style="color: var(--green);">Файл успешно открыт на сервере</div>
            <div style="font-size: 1rem; margin-top: 10px; color: var(--fg3);">Видео воспроизводится в Mediateka на сервере ${this.serverHost}</div>
        `;
        document.querySelector('.player-control-header').style.borderColor = 'var(--green)';
        this.hideProgressBar();
    },

    showErrorState(message) {
        const placeholder = document.querySelector('.player-placeholder');
        placeholder.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="color: var(--red); font-size: 80px;"></i>
            <div style="color: var(--red);">Ошибка на сервере</div>
            <div style="font-size: 1rem; margin-top: 10px;">${message}</div>
            <button class="retry-btn" onclick="PlayerManager.retryOpen()">
                <i class="fas fa-redo-alt"></i> Повторить
            </button>
        `;
        document.querySelector('.player-control-header').style.borderColor = 'var(--red)';
        this.hideProgressBar();
    },

    retryOpen() {
        if (this.currentFile) {
            this.playVideo(this.currentFile);
        }
    },

    hideControl() {
        document.getElementById('playerControlPage').style.display = 'none';
        document.querySelector('.main-container').classList.remove('blurred');
        this.currentFile = null;
        this.stopStatusCheck();
        this.setPlayerActive(false);
        this.isFullscreen = false;
        document.querySelector('.player-control-header').style.borderColor = '';
        document.getElementById('playerTrackName').textContent = 'Нет активного файла';
        document.getElementById('playerTrackPath').textContent = '';
    },

    async togglePlayPause() {
        try {
            const endpoint = this.isPlaying ? 'pause' : 'play';
            const url = `${this.getPlayerUrl()}/api/${endpoint}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (data.success) {
                this.isPlaying = !this.isPlaying;
                this.updatePlayPauseButton();
                this.updateTopBar();
            }
        } catch (error) {
            Utils.showNotification('Ошибка при переключении: ' + error.message, 'error');
        }
    },

    updatePlayPauseButton() {
        const btn = document.getElementById('playPauseBtn');
        btn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        if (this.isPlaying) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    },

    async toggleFullscreen() {
        const newState = !this.isFullscreen;
        console.log('Toggling UI fullscreen to:', newState);

        // Для мобильных устройств просто меняем UI состояние
        if (this.isMobile) {
            this.isFullscreen = newState;
            this.updateFullscreenButton();
            Utils.showNotification(newState ? 'Полноэкранный режим интерфейса' : 'Оконный режим интерфейса', 'info');
            return;
        }

        // Для десктопа пытаемся управлять плеером
        try {
            const url = `${this.getPlayerUrl()}/api/fullscreen`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullscreen: newState })
            });

            const data = await response.json();
            if (data.success) {
                this.isFullscreen = newState;
                this.updateFullscreenButton();
                Utils.showNotification(newState ? 'Полноэкранный режим плеера' : 'Оконный режим плеера', 'info');
            } else {
                Utils.showNotification('Не удалось изменить режим', 'error');
            }
        } catch (error) {
            console.error('Fullscreen toggle error:', error);
            Utils.showNotification('Ошибка при переключении режима', 'error');
        }
    },

    exitFullscreen() {
        console.log('Exit fullscreen called');
        this.toggleFullscreen();
    },

    async closeFile() {
        try {
            const url = `${this.getPlayerUrl()}/api/close`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (data.success) {
                Utils.showNotification('Файл закрыт на сервере', 'success');
                this.hideControl();
            } else {
                Utils.showNotification('Ошибка: ' + data.error, 'error');
            }
        } catch (error) {
            Utils.showNotification('Ошибка при закрытии: ' + error.message, 'error');
        }
    },

    async checkStatus() {
        if (!this.currentFile) return;
        try {
            const url = `${this.getPlayerUrl()}/api/status`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
            });
            const data = await response.json();
            if (data && data.available) {
                // Обновляем статус только для отображения, не меняем UI fullscreen
                console.log('Server status:', data);
            }
        } catch (error) {
            // Тихо игнорируем ошибки статуса для мобильных
        }
    },

    startStatusCheck() {
        this.stopStatusCheck();
        if (!this.isMobile) {
            this.statusCheckInterval = setInterval(() => this.checkStatus(), 5000);
        }
        this.createStatusIndicator();
    },

    stopStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
        document.querySelector('.status-indicator')?.remove();
    },

    createStatusIndicator() {
        let indicator = document.querySelector('.status-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'status-indicator';
            indicator.style.cssText = `
                position: absolute;
                top: 10px;
                right: 10px;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: var(--green);
                box-shadow: 0 0 10px currentColor;
            `;
            indicator.title = `Подключение к серверу ${this.serverHost}`;
            document.querySelector('.player-control-header').appendChild(indicator);
        }
    },

    handleKeyPress(e) {
        if (!this.currentFile) return;
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'Escape':
                if (this.isFullscreen) {
                    this.toggleFullscreen();
                }
                break;
        }
    }
};
