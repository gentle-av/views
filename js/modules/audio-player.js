const AudioPlayer = {
    currentAlbum: null,
    currentTrackIndex: -1,
    tracks: [],
    currentPlaylist: [],
    isPlaying: false,
    audioElement: null,
    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },
    init() {
        this.setupEventListeners();
        this.createAudioElement();
        this.currentPlaylist = [];
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
        this.tracks = album.tracks;
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
        if (index < 0 || index >= this.currentPlaylist.length) return;
        this.currentTrackIndex = index;
        const track = this.currentPlaylist[index];
        const trackUrl = `${this.getServerUrl()}${track.path}`;
        this.audioElement.src = trackUrl;
        this.audioElement.play().catch(e => console.error('Play error:', e));
        this.isPlaying = true;
        this.updatePlayerUI();
        this.updateTrackInfo();
    },
    loadTrack(index) {
        if (index < 0 || index >= this.currentPlaylist.length) return;
        this.currentTrackIndex = index;
        const track = this.currentPlaylist[index];
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
        if (this.currentTrackIndex + 1 < this.currentPlaylist.length) {
            await this.loadTrack(this.currentTrackIndex + 1);
        } else {
            this.stop();
        }
    },
    async previousTrack() {
        if (this.currentTrackIndex - 1 >= 0) {
            await this.loadTrack(this.currentTrackIndex - 1);
        } else {
            this.audioElement.currentTime = 0;
        }
    },
    async stop() {
        this.audioElement.pause();
        this.audioElement.src = '';
        this.isPlaying = false;
        this.currentTrackIndex = -1;
        this.currentPlaylist = [];
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
        if (trackName && this.currentTrackIndex >= 0 && this.currentPlaylist[this.currentTrackIndex]) {
            trackName.textContent = this.currentPlaylist[this.currentTrackIndex].name;
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
    addAlbumToQueue(album) {
        const startIndex = this.currentPlaylist.length;
        this.currentPlaylist.push(...album.tracks);
        Utils.showNotification(`Добавлено ${album.tracks.length} треков в плейлист`, 'success');
        if (!this.audioElement.src && this.currentPlaylist.length > 0) {
            this.loadTrack(startIndex);
        }
    },
    replacePlaylistWithAlbum(album) {
        this.currentPlaylist = [...album.tracks];
        this.currentTrackIndex = 0;
        if (this.currentPlaylist.length > 0) {
            this.loadTrack(0);
        }
        Utils.showNotification(`Плейлист заменен альбомом: ${album.title}`, 'success');
    },
    replacePlaylistWithTrack(album, trackIndex) {
        const track = album.tracks[trackIndex];
        this.currentPlaylist = [track];
        this.currentTrackIndex = 0;
        this.loadTrack(0);
        Utils.showNotification(`Воспроизведение: ${track.name}`, 'success');
    },
    addTrackToQueueAfterCurrent(album, trackIndex) {
        const track = album.tracks[trackIndex];
        if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.currentPlaylist.length) {
            this.currentPlaylist.splice(this.currentTrackIndex + 1, 0, track);
            Utils.showNotification(`Трек "${track.name}" добавлен в очередь после текущего`, 'success');
        } else {
            this.currentPlaylist.push(track);
            Utils.showNotification(`Трек "${track.name}" добавлен в конец плейлиста`, 'success');
        }
    },
    showCurrentPlaylist() {
        if (!this.currentPlaylist || this.currentPlaylist.length === 0) {
            Utils.showNotification('Плейлист пуст', 'info');
            return;
        }
        let playlistHtml = '<div style="max-height: 400px; overflow-y: auto;">';
        this.currentPlaylist.forEach((track, idx) => {
            const playing = idx === this.currentTrackIndex ? '▶ ' : '  ';
            playlistHtml += `<div style="padding: 8px 12px; border-bottom: 1px solid var(--bg3); display: flex; align-items: center; gap: 10px;">
                <span style="color: var(--yellow); width: 30px;">${playing}${idx + 1}</span>
                <span style="flex: 1; ${idx === this.currentTrackIndex ? 'color: var(--yellow); font-weight: 600;' : ''}">${Utils.escapeHtml(track.name)}</span>
            </div>`;
        });
        playlistHtml += '</div>';
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-list"></i> Текущий плейлист (${this.currentPlaylist.length} треков)</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body" style="flex-direction: column; padding: 0;">
                    ${playlistHtml}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.classList.add('active');
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            };
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
    },
    clearPlaylist() {
        this.currentPlaylist = [];
        this.currentTrackIndex = -1;
        this.audioElement.pause();
        this.audioElement.src = '';
        this.isPlaying = false;
        this.updatePlayerUI();
        const playerBar = document.getElementById('audioPlayerBar');
        if (playerBar) playerBar.style.display = 'none';
    }
};
