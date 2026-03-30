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

    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },

    getMusiumUrl() {
        if (this.musiumUrl) return this.musiumUrl;
        return `http://${window.location.hostname}:8084`;
    },

    async checkMusiumAvailable() {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);
            const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (response.ok) {
                const data = await response.json();
                this.musiumAvailable = data.success === true;
                if (this.musiumAvailable && this.pendingAction) {
                    const action = this.pendingAction;
                    this.pendingAction = null;
                    await action();
                }
                return this.musiumAvailable;
            }
        } catch (error) {
            console.log('Musium not running');
        }
        this.musiumAvailable = false;
        return false;
    },

    async waitForMusium(timeoutMs) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 1000);
                const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success === true) {
                        this.musiumAvailable = true;
                        return true;
                    }
                }
            } catch (error) {
            }
            await this.delay(1000);
        }
        return false;
    },

    async launchMusiumWithTracks(tracks) {
        try {
            Utils.showNotification('Запуск аудиоплеера...', 'info');
            const response = await fetch(`${this.getServerUrl()}/api/music/open`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tracks: tracks.map(t => t.path) })
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            if (data.status === 'success') {
                const started = await this.waitForMusium(10000);
                if (started) {
                    Utils.showNotification('Аудиоплеер запущен', 'success');
                    return true;
                } else {
                    Utils.showNotification('Аудиоплеер не запустился', 'error');
                    return false;
                }
            }
            return false;
        } catch (error) {
            console.error('Error launching Musium:', error);
            Utils.showNotification('Ошибка запуска аудиоплеера', 'error');
            return false;
        }
    },

    async ensureMusiumRunning(tracks) {
        const isAvailable = await this.checkMusiumAvailable();
        if (isAvailable) return true;
        return await this.launchMusiumWithTracks(tracks);
    },

    async sendToMusium(endpoint, data, method = 'POST') {
        if (!this.musiumAvailable) return null;
        try {
            const url = `${this.getMusiumUrl()}${endpoint}`;
            const options = {
                method: method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (method === 'POST' && data) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(url, options);
            return await response.json();
        } catch (error) {
            console.error(`Musium API error: ${endpoint}`, error);
            this.musiumAvailable = false;
            return null;
        }
    },

    async getMusiumPlaylist() {
        return await this.sendToMusium('/api/getPlaylist', null, 'GET');
    },

    async getMusiumStatus() {
        return await this.sendToMusium('/api/getStatus', null, 'GET');
    },

    async addToPlaylist(album, trackIndex = null) {
        const tracksToAdd = trackIndex !== null ? [album.tracks[trackIndex]] : album.tracks;
        const started = await this.ensureMusiumRunning(tracksToAdd);
        if (!started) return;
        for (const track of tracksToAdd) {
            await this.sendToMusium('/api/add', { path: track.path });
        }
        Utils.showNotification(`Добавлено ${tracksToAdd.length} треков в плейлист`, 'success');
        if (typeof PlaylistViewer !== 'undefined') {
            PlaylistViewer.refresh();
        }
    },

    async replacePlaylist(album, trackIndex = null) {
        const tracksToReplace = trackIndex !== null ? [album.tracks[trackIndex]] : album.tracks;
        const started = await this.ensureMusiumRunning(tracksToReplace);
        if (!started) return;
        const trackPaths = tracksToReplace.map(t => t.path);
        await this.sendToMusium('/api/replacePlaylist', { tracks: trackPaths });
        await this.sendToMusium('/api/play', {});
        Utils.showNotification(`Плейлист заменен ${tracksToReplace.length} треками`, 'success');
    },

    async addAfterCurrent(album, trackIndex) {
        const track = album.tracks[trackIndex];
        const started = await this.ensureMusiumRunning([track]);
        if (!started) return;
        await this.sendToMusium('/api/addAfterCurrent', { path: track.path });
        Utils.showNotification(`Трек "${track.name}" добавлен после текущего`, 'success');
    },

    async playTrackInMusium(album, trackIndex) {
        const track = album.tracks[trackIndex];
        const started = await this.ensureMusiumRunning([track]);
        if (!started) return;
        await this.sendToMusium('/api/replacePlaylist', { tracks: [track.path] });
        await this.sendToMusium('/api/play', {});
        Utils.showNotification(`Воспроизведение: ${track.name}`, 'success');
    },

    async playAlbumInMusium(album) {
        const started = await this.ensureMusiumRunning(album.tracks);
        if (!started) return;
        const trackPaths = album.tracks.map(t => t.path);
        await this.sendToMusium('/api/replacePlaylist', { tracks: trackPaths });
        await this.sendToMusium('/api/play', {});
        Utils.showNotification(`Воспроизведение альбома: ${album.title}`, 'success');
    },

    async previousTrackMusium() {
        if (!this.musiumAvailable) return;
        await this.sendToMusium('/api/previous', {});
    },

    async nextTrackMusium() {
        if (!this.musiumAvailable) return;
        await this.sendToMusium('/api/next', {});
    },

    async pauseMusium() {
        if (!this.musiumAvailable) return;
        await this.sendToMusium('/api/pause', {});
    },

    async playMusium() {
        if (!this.musiumAvailable) return;
        await this.sendToMusium('/api/play', {});
    },

    async stopMusium() {
        if (!this.musiumAvailable) return;
        await this.sendToMusium('/api/stop', {});
    },

    init() {
        this.setupEventListeners();
        this.createAudioElement();
        this.checkMusiumAvailable();
    },

    createAudioElement() {
        this.audioElement = new Audio();
        this.audioElement.addEventListener('ended', () => this.nextTrack());
        this.audioElement.addEventListener('timeupdate', () => this.updateProgress());
        this.audioElement.addEventListener('play', () => { this.isPlaying = true; this.updatePlayerUI(); });
        this.audioElement.addEventListener('pause', () => { this.isPlaying = false; this.updatePlayerUI(); });
    },

    setupEventListeners() {
        const playBtn = document.getElementById('playerPlayBtn');
        const prevBtn = document.getElementById('playerPrevBtn');
        const nextBtn = document.getElementById('playerNextBtn');
        const stopBtn = document.getElementById('playerStopBtn');
        const volumeSlider = document.getElementById('volumeSlider');
        if (playBtn) playBtn.addEventListener('click', () => this.togglePlayPause());
        if (prevBtn) prevBtn.addEventListener('click', () => this.previousTrack());
        if (nextBtn) nextBtn.addEventListener('click', () => this.nextTrack());
        if (stopBtn) stopBtn.addEventListener('click', () => this.stop());
        if (volumeSlider) volumeSlider.addEventListener('click', (e) => this.setVolume(e));
    },

    async loadAlbum(album) {
        await this.playAlbumInMusium(album);
        this.currentAlbum = album;
        this.tracks = [...album.tracks];
        this.currentTrackIndex = 0;
        const albumArt = document.getElementById('playerAlbumArt');
        const albumTitle = document.getElementById('playerAlbum');
        const artistName = document.getElementById('playerArtist');
        const playerBar = document.getElementById('audioPlayerBar');
        if (albumArt) {
            albumArt.src = album.coverUrl || '';
            albumArt.onerror = () => { albumArt.src = ''; };
        }
        if (albumTitle) albumTitle.textContent = album.title;
        if (artistName) artistName.textContent = album.artist;
        if (playerBar) playerBar.style.display = 'flex';
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
        this.audioElement.play().catch(e => console.error('Play error:', e));
        this.isPlaying = true;
        this.updatePlayerUI();
        this.updateTrackInfo();
    },

    async togglePlayPause() {
        if (this.musiumAvailable) {
            if (this.isPlaying) {
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
        this.audioElement.src = '';
        this.isPlaying = false;
        this.currentTrackIndex = -1;
        this.updatePlayerUI();
        const playerBar = document.getElementById('audioPlayerBar');
        if (playerBar) playerBar.style.display = 'none';
        if (typeof PlaylistViewer !== 'undefined') {
            PlaylistViewer.refresh();
        }
    },

    setVolume(event) {
        const slider = event.currentTarget;
        const rect = slider.getBoundingClientRect();
        const percent = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
        const volumeProgress = document.getElementById('volumeProgress');
        if (volumeProgress) volumeProgress.style.width = percent + '%';
        this.audioElement.volume = percent / 100;
    },

    updateTrackInfo() {
        const trackName = document.getElementById('playerTrack');
        if (trackName && this.currentTrackIndex >= 0 && this.tracks[this.currentTrackIndex]) {
            trackName.textContent = this.tracks[this.currentTrackIndex].name;
        } else if (trackName) {
            trackName.textContent = '—';
        }
    },

    updateProgress() {
        if (this.audioElement.duration) {
            const percent = (this.audioElement.currentTime / this.audioElement.duration) * 100;
        }
    },

    updatePlayerUI() {
        const playBtn = document.getElementById('playerPlayBtn');
        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }
        this.updateTrackInfo();
    },

    addAlbumToPlaylist(album) {
        this.addToPlaylist(album);
        setTimeout(() => {
            const playlistSection = document.getElementById('playlistSection');
            if (playlistSection && playlistSection.style.display === 'none') {
                playlistSection.style.display = 'block';
            }
            if (typeof PlaylistViewer !== 'undefined') {
                PlaylistViewer.refresh();
            }
            playlistSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 500);
    },

    replacePlaylistWithAlbum(album) {
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
            this.getMusiumPlaylist().then(data => {
                if (data && data.success && data.data && data.data.playlist) {
                    const playlist = data.data.playlist;
                    if (playlist.length === 0) {
                        Utils.showNotification('Плейлист пуст', 'info');
                        return;
                    }
                    let playlistText = 'Плейлист:\n';
                    playlist.forEach((track, idx) => {
                        playlistText += `${idx + 1}. ${track.name}\n`;
                    });
                    alert(playlistText);
                } else {
                    Utils.showNotification('Не удалось загрузить плейлист', 'info');
                }
            });
        } else if (this.playlist.length === 0) {
            Utils.showNotification('Плейлист пуст', 'info');
            return;
        } else {
            let playlistText = 'Плейлист:\n';
            this.playlist.forEach((track, idx) => {
                playlistText += `${idx + 1}. ${track.name}\n`;
            });
            alert(playlistText);
        }
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};
