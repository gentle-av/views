const AudioPlayer = {
    currentAlbum: null,
    currentTrackIndex: -1,
    tracks: [],
    isPlaying: false,
    audioElement: null,
    init() {
        this.setupEventListeners();
        this.audioElement = new Audio();
        this.audioElement.volume = 0.7;
        this.audioElement.addEventListener('ended', () => this.nextTrack());
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
    async playAlbum(album) {
        this.currentAlbum = album;
        this.tracks = album.tracks;
        this.currentTrackIndex = 0;
        await this.playTrack(0);
        const albumArt = document.getElementById('playerAlbumArt');
        const albumTitle = document.getElementById('playerAlbum');
        const artistName = document.getElementById('playerArtist');
        const playerBar = document.getElementById('audioPlayerBar');
        if (albumArt) {
            albumArt.src = album.coverUrl || '';
            albumArt.onerror = () => {
                albumArt.src = '';
            };
        }
        if (albumTitle) albumTitle.textContent = album.title;
        if (artistName) artistName.textContent = album.artist;
        if (playerBar) playerBar.style.display = 'flex';
    },
    async playTrack(index) {
        if (index < 0 || index >= this.tracks.length) return;
        this.currentTrackIndex = index;
        const track = this.tracks[index];
        const audioUrl = `${Utils.getServerUrl()}${track.path}`;
        this.audioElement.src = audioUrl;
        this.audioElement.play().then(() => {
            this.isPlaying = true;
            this.updatePlayerUI();
            Utils.showNotification(`🎵 ${track.name}`, 'info');
        }).catch(error => {
            console.error('Error playing audio:', error);
            Utils.showNotification(`Ошибка воспроизведения: ${track.name}`, 'error');
        });
    },
    togglePlayPause() {
        if (this.currentTrackIndex === -1) return;
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        } else {
            this.audioElement.play();
            this.isPlaying = true;
        }
        this.updatePlayerUI();
    },
    nextTrack() {
        if (this.tracks.length === 0) return;
        const nextIdx = (this.currentTrackIndex + 1) % this.tracks.length;
        this.playTrack(nextIdx);
    },
    previousTrack() {
        if (this.tracks.length === 0) return;
        const prevIdx = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        this.playTrack(prevIdx);
    },
    stop() {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
        this.isPlaying = false;
        this.currentTrackIndex = -1;
        this.updatePlayerUI();
        const playerBar = document.getElementById('audioPlayerBar');
        if (playerBar) playerBar.style.display = 'none';
    },
    setVolume(event) {
        const slider = event.currentTarget;
        const rect = slider.getBoundingClientRect();
        const percent = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
        const volumeProgress = document.getElementById('volumeProgress');
        if (volumeProgress) volumeProgress.style.width = percent + '%';
        this.audioElement.volume = percent / 100;
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
    }
};
