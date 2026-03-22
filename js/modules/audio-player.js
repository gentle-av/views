const AudioPlayer = {
    currentAlbum: null,
    currentTrackIndex: -1,
    tracks: [],
    isPlaying: false,
    playlistId: null,
    playerUrl: `http://${window.location.hostname}:8084`,

    init() {
        this.setupEventListeners();
        this.getStatus();
        setInterval(() => this.getStatus(), 2000);
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

    async callApi(endpoint, method = 'POST', data = null) {
        try {
            const options = {
                method: method,
                headers: { 'Content-Type': 'application/json' }
            };
            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }
            const response = await fetch(`${this.playerUrl}${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`API error on ${endpoint}:`, error);
            return null;
        }
    },

    async clearPlaylist() {
        return await this.callApi('/api/player/clear', 'POST');
    },

    async addToPlaylist(path) {
        return await this.callApi('/api/player/add', 'POST', { path: path });
    },

    async loadAlbum(album) {
        await this.clearPlaylist();
        for (const track of album.tracks) {
            await this.addToPlaylist(track.path);
        }
        await this.callApi('/api/player/play', 'POST');
        this.currentAlbum = album;
        this.tracks = album.tracks;
        this.currentTrackIndex = 0;
        this.isPlaying = true;

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

        this.updatePlayerUI();
        Utils.showNotification(`🎵 Плейлист: ${album.title}`, 'success');
    },

    async playAlbum(album) {
        await this.loadAlbum(album);
    },

    async playTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        this.currentTrackIndex = index;
        const status = await this.getStatus();
        if (status && status.currentIndex !== index) {
            await this.callApi('/api/player/next', 'POST');
        }
        this.updatePlayerUI();
    },

    async togglePlayPause() {
        const status = await this.getStatus();
        if (status && status.isPlaying) {
            await this.callApi('/api/player/pause', 'POST');
            this.isPlaying = false;
        } else {
            await this.callApi('/api/player/play', 'POST');
            this.isPlaying = true;
        }
        this.updatePlayerUI();
    },

    async nextTrack() {
        const result = await this.callApi('/api/player/next', 'POST');
        if (result && result.success) {
            await this.updateCurrentTrackInfo();
        }
    },

    async previousTrack() {
        const result = await this.callApi('/api/player/previous', 'POST');
        if (result && result.success) {
            await this.updateCurrentTrackInfo();
        }
    },

    async stop() {
        await this.callApi('/api/player/stop', 'POST');
        this.isPlaying = false;
        this.currentTrackIndex = -1;
        this.updatePlayerUI();
        const playerBar = document.getElementById('audioPlayerBar');
        if (playerBar) playerBar.style.display = 'none';
    },

    async setVolume(event) {
        const slider = event.currentTarget;
        const rect = slider.getBoundingClientRect();
        const percent = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
        const volumeProgress = document.getElementById('volumeProgress');
        if (volumeProgress) volumeProgress.style.width = percent + '%';
        await this.callApi('/api/player/volume', 'POST', { volume: percent });
    },

    async seekForward() {
        await this.callApi('/api/player/seek-forward', 'POST');
    },

    async seekBackward() {
        await this.callApi('/api/player/seek-backward', 'POST');
    },

    async getStatus() {
        const result = await this.callApi('/api/player/status', 'GET');
        if (result && result.success) {
            this.isPlaying = result.data.isPlaying;
            if (result.data.currentIndex !== this.currentTrackIndex) {
                this.currentTrackIndex = result.data.currentIndex;
                await this.loadCurrentTrackInfo();
            }
            this.updatePlayerUI();
            return result.data;
        }
        return null;
    },

    async updateCurrentTrackInfo() {
        const status = await this.getStatus();
        if (status && this.currentAlbum && status.currentIndex >= 0 && status.currentIndex < this.tracks.length) {
            const trackName = document.getElementById('playerTrack');
            if (trackName) {
                trackName.textContent = this.tracks[status.currentIndex].name;
            }
        }
    },

    async loadCurrentTrackInfo() {
        const status = await this.getStatus();
        if (status && status.currentPath && this.currentAlbum) {
            const currentTrack = this.tracks.find(t => t.path === status.currentPath);
            if (currentTrack) {
                const trackName = document.getElementById('playerTrack');
                if (trackName) trackName.textContent = currentTrack.name;
            }
        }
    },

    updatePlayerUI() {
        const playBtn = document.getElementById('playerPlayBtn');
        const trackName = document.getElementById('playerTrack');

        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }

        if (trackName && this.currentTrackIndex >= 0 && this.tracks[this.currentTrackIndex]) {
            trackName.textContent = this.tracks[this.currentTrackIndex].name;
        } else if (trackName) {
            trackName.textContent = '—';
        }
    }
};
