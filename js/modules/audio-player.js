const AudioPlayer = {
    currentAlbum: null,
    currentTrackIndex: -1,
    tracks: [],
    isPlaying: false,
    statusInterval: null,

    init() {
        this.setupEventListeners();
        this.startStatusPolling();
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

    async callApi(action, data = null) {
        try {
            const options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            };
            if (data) options.body = JSON.stringify(data);

            const response = await fetch(`${Utils.getServerUrl()}/api/music/${action}`, options);
            return await response.json();
        } catch (error) {
            console.error('API error:', error);
            return null;
        }
    },

    async playAlbum(album) {
        this.currentAlbum = album;
        this.tracks = album.tracks;
        this.currentTrackIndex = 0;

        await this.callApi('clear');
        for (const track of album.tracks) {
            await this.callApi('add', { path: track.path });
        }

        await this.playTrack(0);

        const albumArt = document.getElementById('playerAlbumArt');
        const albumTitle = document.getElementById('playerAlbum');
        const artistName = document.getElementById('playerArtist');
        const playerBar = document.getElementById('audioPlayerBar');

        if (albumArt) albumArt.src = album.coverUrl || '';
        if (albumTitle) albumTitle.textContent = album.title;
        if (artistName) artistName.textContent = album.artist;
        if (playerBar) playerBar.style.display = 'flex';
    },

    async playTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;

        this.currentTrackIndex = index;
        const track = this.tracks[index];

        const result = await this.callApi('open', { path: track.path });
        if (result && result.success) {
            this.isPlaying = true;
            this.updatePlayerUI();
            Utils.showNotification(`🎵 ${track.name}`, 'info');
        }
    },

    async togglePlayPause() {
        const status = await this.callApi('status');
        if (status && status.isPlaying) {
            await this.callApi('pause');
            this.isPlaying = false;
        } else if (status && status.isPaused) {
            await this.callApi('play');
            this.isPlaying = true;
        } else if (this.currentTrackIndex >= 0) {
            await this.playTrack(this.currentTrackIndex);
        }
        this.updatePlayerUI();
    },

    async nextTrack() {
        if (this.tracks.length === 0) return;
        const nextIdx = (this.currentTrackIndex + 1) % this.tracks.length;
        await this.playTrack(nextIdx);
    },

    async previousTrack() {
        if (this.tracks.length === 0) return;
        const prevIdx = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        await this.playTrack(prevIdx);
    },

    async stop() {
        await this.callApi('stop');
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

        await this.callApi('volume', { volume: percent });
    },

    updatePlayerUI() {
        const playBtn = document.getElementById('playerPlayBtn');
        const trackName = document.getElementById('playerTrack');

        if (playBtn) {
            playBtn.innerHTML = this.isPlaying ? '<i class="fas fa-pause"></i>' : '<i class="fas fa-play"></i>';
        }

        if (trackName) {
            if (this.currentTrackIndex >= 0 && this.tracks[this.currentTrackIndex]) {
                trackName.textContent = this.tracks[this.currentTrackIndex].name;
            } else {
                trackName.textContent = '—';
            }
        }
    },

    async startStatusPolling() {
        this.statusInterval = setInterval(async () => {
            const status = await this.callApi('status');
            if (status && status.isPlaying !== this.isPlaying) {
                this.isPlaying = status.isPlaying;
                this.updatePlayerUI();
            }
        }, 2000);
    }
};
