const PlaylistViewer = {
musiumUrl: null,
musiumAvailable: false,
playlist: [],
currentIndex: -1,
updateInterval: null,
mediaServerUrl: null,
getMusiumUrl() {
    if (this.musiumUrl) return this.musiumUrl;
    return `http://${window.location.hostname}:8084`;
},

getMediaServerUrl() {
    if (this.mediaServerUrl) return this.mediaServerUrl;
    return `http://${window.location.hostname}:${window.location.port}`;
},

async fetchTrackMetadata(path) {
    try {
        const url = `${this.getMediaServerUrl()}/api/music/list`;
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        const data = await response.json();
        if (data.status === 'success' && data.files) {
            for (const file of data.files) {
                if (file.path === path) {
                    return { name: file.title || file.filename, artist: file.artist || 'Unknown', track: file.track };
                }
            }
        }
    } catch (error) { console.error('Error fetching metadata:', error); }
    return null;
},

async enrichPlaylistWithMetadata(playlistData) {
    if (!playlistData || !playlistData.playlist) return playlistData;
    for (let i = 0; i < playlistData.playlist.length; i++) {
        const track = playlistData.playlist[i];
        if (!track.artist || track.artist === 'Unknown' || !track.title) {
            const metadata = await this.fetchTrackMetadata(track.path);
            if (metadata) {
                track.title = metadata.name || track.title;
                track.name = metadata.name || track.name;
                track.artist = metadata.artist || track.artist;
                if (metadata.track) track.track = metadata.track;
            }
        }
    }
    return playlistData;
},

async checkMusiumAvailable() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, { method: 'GET', headers: { 'Content-Type': 'application/json' }, signal: controller.signal });
        clearTimeout(timeoutId);
        if (response.ok) { const data = await response.json(); this.musiumAvailable = data.success === true; if (this.musiumAvailable) this.startAutoUpdate(); else this.stopAutoUpdate(); return this.musiumAvailable; }
    } catch (error) { console.log('Musium not running:', error.message); }
    this.musiumAvailable = false;
    this.stopAutoUpdate();
    return false;
},

async refresh() {
    console.log('PlaylistViewer.refresh called');
    await this.checkMusiumAvailable();
    if (this.musiumAvailable) {
        await this.updateDisplay();
    } else {
        const container = document.getElementById('playlistContainer');
        if (container) {
            container.innerHTML = `<div class="playlist-empty"><i class="fas fa-exclamation-triangle"></i><p>Аудиоплеер не запущен</p><p class="playlist-empty-hint">Нажмите "Добавить в плейлист" чтобы запустить</p></div>`;
        }
    }
},

async fetchPlaylist() {
    if (!this.musiumAvailable) return null;
    try {
        const response = await fetch(`${this.getMusiumUrl()}/api/getPlaylist`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
        const data = await response.json();
        if (data.success && data.data) { this.playlist = data.data.playlist || []; this.currentIndex = data.data.currentIndex || -1; return data.data; }
        return null;
    } catch (error) { console.error('Error fetching playlist:', error); return null; }
},

async fetchStatus() {
    if (!this.musiumAvailable) return null;
    try {
        const response = await fetch(`${this.getMusiumUrl()}/api/getStatus`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) { throw new Error(`HTTP ${response.status}`); }
        const data = await response.json();
        if (data.success && data.data) { return data.data; }
        return null;
    } catch (error) { console.error('Error fetching status:', error); return null; }
},

async sendCommand(endpoint, data = {}) {
    if (!this.musiumAvailable) return null;
    try {
        console.log(`Sending command to ${endpoint}:`, data);
        const response = await fetch(`${this.getMusiumUrl()}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
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
    await this.sendCommand('/api/playIndex', { index: index });
    await this.updateDisplay();
},

async removeTrack(index) {
    console.log(`Remove track at index: ${index}`);
    await this.sendCommand('/api/remove', { index: index });
    await this.fetchPlaylist();
    await this.updateDisplay();
},

async clearPlaylist() {
    console.log('Clear playlist');
    await this.sendCommand('/api/clear');
    await this.fetchPlaylist();
    await this.updateDisplay();
},

async previousTrack() {
    console.log('Previous track');
    await this.sendCommand('/api/previous');
    await this.updateDisplay();
},

async nextTrack() {
    console.log('Next track');
    await this.sendCommand('/api/next');
    await this.updateDisplay();
},

async playPause() {
    console.log('playPause called');
    const status = await this.fetchStatus();
    console.log('Current status:', status);
    if (status && status.isPlaying) { console.log('Currently playing, sending pause'); await this.sendCommand('/api/pause'); } else { console.log('Currently paused, sending play'); await this.sendCommand('/api/play'); }
    const newStatus = await this.fetchStatus();
    console.log('New status after command:', newStatus);
    await this.updateProgress();
},

async stopPlayback() {
    console.log('Stop playback');
    await this.sendCommand('/api/stop');
    await this.refresh();
},

formatTime(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
},

escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
},

async updateDisplay() {
    console.log('updateDisplay called');
    const container = document.getElementById('playlistContainer');
    if (!container) { console.log('playlistContainer not found'); return; }
    let playlistData = await this.fetchPlaylist();
    const status = await this.fetchStatus();
    console.log('playlistData before enrich:', playlistData);
    playlistData = await this.enrichPlaylistWithMetadata(playlistData);
    console.log('playlistData after enrich:', playlistData);
    if (!playlistData || playlistData.playlist.length === 0) { container.innerHTML = `<div class="playlist-empty"><i class="fas fa-music"></i><p>Плейлист пуст</p><p class="playlist-empty-hint">Добавьте треки из библиотеки</p></div>`; return; }
    let currentTrackName = '—';
    let currentArtistName = '';
    if (playlistData.currentIndex >= 0 && playlistData.playlist[playlistData.currentIndex]) { const currentTrack = playlistData.playlist[playlistData.currentIndex]; currentTrackName = currentTrack.title || currentTrack.name || currentTrack.filename || '—'; if (currentTrack.artist && currentTrack.artist !== 'Unknown') currentArtistName = currentTrack.artist; }
    let html = `<div class="playlist-controls"><button class="playlist-control-btn" id="playlistPlayPauseBtn" title="${status && status.isPlaying ? 'Пауза' : 'Воспроизвести'}"><i class="fas ${status && status.isPlaying ? 'fa-pause' : 'fa-play'}"></i></button><button class="playlist-control-btn" id="playlistPrevBtn" title="Предыдущий"><i class="fas fa-step-backward"></i></button><button class="playlist-control-btn" id="playlistNextBtn" title="Следующий"><i class="fas fa-step-forward"></i></button><button class="playlist-control-btn" id="playlistStopBtn" title="Стоп"><i class="fas fa-stop"></i></button><button class="playlist-control-btn" id="playlistClearBtn" title="Очистить плейлист"><i class="fas fa-trash-alt"></i></button></div><div class="playlist-info"><div class="playlist-current-track"><i class="fas fa-headphones"></i><div class="playlist-current-info"><div class="playlist-current-name">${this.escapeHtml(currentTrackName)}</div>${currentArtistName ? `<div class="playlist-current-artist">${this.escapeHtml(currentArtistName)}</div>` : ''}</div></div><div class="playlist-progress"><span id="playlistCurrentTime">${this.formatTime(status ? status.position : 0)}</span><div class="progress-bar" id="playlistProgressBar"><div class="progress-fill" id="playlistProgressFill" style="width: ${status && status.duration ? (status.position / status.duration * 100) : 0}%"></div></div><span id="playlistTotalTime">${this.formatTime(status ? status.duration : 0)}</span></div></div><div class="playlist-tracks">`;
    for (let idx = 0; idx < playlistData.playlist.length; idx++) {
        const track = playlistData.playlist[idx];
        const isCurrent = idx === playlistData.currentIndex;
        const trackNumber = track.track || (idx + 1);
        const trackName = track.title || track.name || track.filename || `Трек ${idx + 1}`;
        const trackArtist = track.artist && track.artist !== 'Unknown' ? track.artist : '';
        let trackDisplay = `${trackNumber} - ${trackName}`;
        if (trackArtist) trackDisplay += ` - ${trackArtist}`;
        html += `<div class="playlist-track ${isCurrent ? 'current' : ''}" data-index="${idx}"><div class="playlist-track-name" title="${this.escapeHtml(trackDisplay)}">${this.escapeHtml(trackDisplay)}</div><div class="playlist-track-controls"><button class="playlist-track-play" data-index="${idx}" title="Воспроизвести"><i class="fas fa-play"></i></button></div></div>`;
    }
    html += `</div>`;
    container.innerHTML = html;
    this.attachEventListeners();
    console.log('updateDisplay finished');
},

attachEventListeners() {
    const playPauseBtn = document.getElementById('playlistPlayPauseBtn');
    if (playPauseBtn) { playPauseBtn.addEventListener('click', () => this.playPause()); }
    const prevBtn = document.getElementById('playlistPrevBtn');
    if (prevBtn) { prevBtn.addEventListener('click', () => this.previousTrack()); }
    const nextBtn = document.getElementById('playlistNextBtn');
    if (nextBtn) { nextBtn.addEventListener('click', () => this.nextTrack()); }
    const stopBtn = document.getElementById('playlistStopBtn');
    if (stopBtn) { stopBtn.addEventListener('click', () => this.stopPlayback()); }
    const clearBtn = document.getElementById('playlistClearBtn');
    if (clearBtn) { clearBtn.addEventListener('click', () => this.clearPlaylist()); }
    document.querySelectorAll('.playlist-track-play').forEach(btn => { btn.addEventListener('click', async (e) => { e.stopPropagation(); const index = parseInt(btn.dataset.index); await this.playTrack(index); }); });
    document.querySelectorAll('.playlist-track').forEach(track => { track.addEventListener('click', async () => { const index = parseInt(track.dataset.index); await this.playTrack(index); }); });
},

async updateProgress() {
    const status = await this.fetchStatus();
    if (!status) return;
    const currentTimeSpan = document.getElementById('playlistCurrentTime');
    const totalTimeSpan = document.getElementById('playlistTotalTime');
    const progressFill = document.getElementById('playlistProgressFill');
    const playPauseBtn = document.getElementById('playlistPlayPauseBtn');
    if (currentTimeSpan) { currentTimeSpan.textContent = this.formatTime(status.position); }
    if (totalTimeSpan) { totalTimeSpan.textContent = this.formatTime(status.duration); }
    if (progressFill && status.duration > 0) { const percent = (status.position / status.duration) * 100; progressFill.style.width = percent + '%'; }
    if (playPauseBtn) { if (status.isPlaying) { playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; playPauseBtn.title = 'Пауза'; } else { playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; playPauseBtn.title = 'Воспроизвести'; } }
},

startAutoUpdate() {
    this.stopAutoUpdate();
    this.updateInterval = setInterval(() => { this.updateProgress(); this.updateCurrentTrackHighlight(); }, 1000);
},

stopAutoUpdate() {
    if (this.updateInterval) { clearInterval(this.updateInterval); this.updateInterval = null; }
},

async updateCurrentTrackHighlight() {
    const status = await this.fetchStatus();
    if (!status) return;
    document.querySelectorAll('.playlist-track').forEach(track => { track.classList.remove('current'); });
    const currentTrack = document.querySelector(`.playlist-track[data-index="${status.currentIndex}"]`);
    if (currentTrack) { currentTrack.classList.add('current'); }
},

async init() {
    console.log('PlaylistViewer.init called');
    await this.checkMusiumAvailable();
    if (this.musiumAvailable) { await this.updateDisplay(); } else { const container = document.getElementById('playlistContainer'); if (container) { container.innerHTML = `<div class="playlist-empty"><i class="fas fa-exclamation-triangle"></i><p>Аудиоплеер не запущен</p><p class="playlist-empty-hint">Нажмите "Добавить в плейлист" чтобы запустить</p></div>`; } }
}
};
