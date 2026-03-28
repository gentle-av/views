// audio-player.js
const AudioPlayer = {
    currentAlbum: null,
    currentTrackIndex: -1,
    tracks: [],
    isPlaying: false,
    audioElement: null,
    playlist: [],

    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },

    init() {
        this.setupEventListeners();
        this.createAudioElement();
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
        if (this.tracks.length > 0) {
            await this.playTrack(0);
        }
        Utils.showNotification(`🎵 Альбом: ${album.title}`, 'success');
    },

    async playTrack(index) {
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
        if (!this.audioElement.src) return;
        if (this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
        } else {
            this.audioElement.play();
            this.isPlaying = true;
        }
        this.updatePlayerUI();
    },

    async nextTrack() {
        if (this.currentTrackIndex + 1 < this.tracks.length) {
            await this.playTrack(this.currentTrackIndex + 1);
        } else {
            this.stop();
        }
    },

    async previousTrack() {
        if (this.currentTrackIndex - 1 >= 0) {
            await this.playTrack(this.currentTrackIndex - 1);
        } else {
            this.audioElement.currentTime = 0;
        }
    },

    async stop() {
        this.audioElement.pause();
        this.audioElement.src = '';
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
        this.playlist.push(...album.tracks);
        Utils.showNotification(`Добавлено ${album.tracks.length} треков в плейлист`, 'info');
    },

    replacePlaylistWithAlbum(album) {
        this.playlist = [...album.tracks];
        Utils.showNotification(`Плейлист заменен альбомом: ${album.title}`, 'success');
    },

    replacePlaylistWithTrack(album, trackIndex) {
        const track = album.tracks[trackIndex];
        if (track) {
            this.playlist = [track];
            Utils.showNotification(`Плейлист заменен треком: ${track.name}`, 'success');
        }
    },

    addTrackAfterCurrent(album, trackIndex) {
        const track = album.tracks[trackIndex];
        if (track && this.currentTrackIndex >= 0) {
            this.playlist.splice(this.currentTrackIndex + 1, 0, track);
            Utils.showNotification(`Трек "${track.name}" добавлен после текущего`, 'success');
        } else if (track) {
            this.playlist.push(track);
            Utils.showNotification(`Трек "${track.name}" добавлен в конец плейлиста`, 'success');
        }
    },

    showPlaylist() {
        if (this.playlist.length === 0) {
            Utils.showNotification('Плейлист пуст', 'info');
            return;
        }
        let playlistText = 'Плейлист:\n';
        this.playlist.forEach((track, idx) => {
            playlistText += `${idx + 1}. ${track.name}\n`;
        });
        alert(playlistText);
    }
};
