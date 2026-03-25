const AlbumLibrary = {
    albums: [],
    filteredAlbums: [],
    artists: [],
    currentArtist: null,
    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },
    async init() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        await this.loadArtists();
        this.setupEventListeners();
    },
    setupEventListeners() {
        const searchInput = document.getElementById('albumSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterAlbums(e.target.value);
            });
        }
    },
    async loadArtists() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка артистов...</div>';
        try {
            const response = await fetch(`${this.getServerUrl()}/api/music/artists`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.status === 'success' && data.artists) {
                this.artists = data.artists;
                await this.loadAlbumsForAllArtists();
            } else {
                grid.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Не удалось загрузить артистов</div>';
            }
        } catch (error) {
            console.error('Error loading artists:', error);
            grid.innerHTML = '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки артистов</div>';
        }
    },
    async loadAlbumsForAllArtists() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка альбомов...</div>';
        this.albums = [];
        const uniqueAlbums = new Map();
        for (const artist of this.artists) {
            try {
                const url = `${this.getServerUrl()}/api/music/albums${artist ? `?artist=${encodeURIComponent(artist)}` : ''}`;
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                if (data.status === 'success' && data.albums) {
                    for (const album of data.albums) {
                        const albumKey = `${album.album}|${album.year}|${artist}`;
                        if (!uniqueAlbums.has(albumKey)) {
                            const tracks = await this.getTracksFromAlbum(album.album, artist);
                            const coverUrl = await this.getAlbumCover(album.album, artist);
                            uniqueAlbums.set(albumKey, {
                                name: album.album,
                                artist: artist,
                                title: album.album,
                                year: album.year || '',
                                tracks: tracks,
                                coverUrl: coverUrl,
                                trackCount: tracks.length
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Error loading albums for artist ${artist}:`, error);
            }
        }
        this.albums = Array.from(uniqueAlbums.values());
        this.albums.sort((a, b) => {
            if (a.artist !== b.artist) return a.artist.localeCompare(b.artist);
            if (a.year !== b.year) return a.year.localeCompare(b.year);
            return a.title.localeCompare(b.title);
        });
        this.filteredAlbums = [...this.albums];
        this.renderAlbums();
    },
    async getTracksFromAlbum(albumName, artist) {
        try {
            const url = `${this.getServerUrl()}/api/music/tracks/album/${encodeURIComponent(albumName)}${artist ? `?artist=${encodeURIComponent(artist)}` : ''}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.status === 'success' && data.tracks) {
                return data.tracks.map((track, idx) => ({
                    name: track.title || track.filename || `Track ${idx + 1}`,
                    path: track.path,
                    number: track.track || idx + 1
                }));
            }
            return [];
        } catch (error) {
            console.error('Error loading tracks:', error);
            return [];
        }
    },
    async getAlbumCover(albumName, artist) {
        try {
            const url = `${this.getServerUrl()}/api/music/albumart/album/${encodeURIComponent(albumName)}${artist ? `?artist=${encodeURIComponent(artist)}` : ''}`;
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                if (blob.size > 0 && blob.type.startsWith('image/')) {
                    return url;
                }
            }
        } catch (error) {
            console.debug('No album art found');
        }
        return '';
    },
    renderAlbums() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        if (this.filteredAlbums.length === 0) {
            grid.innerHTML = '<div class="empty"><i class="fas fa-music"></i> Альбомы не найдены</div>';
            return;
        }
        grid.innerHTML = this.filteredAlbums.map(album => `
            <div class="album-card" data-artist="${Utils.escapeHtml(album.artist)}" data-album="${Utils.escapeHtml(album.title)}">
                <div class="album-cover">
                    ${album.coverUrl ?
                        `<img src="${album.coverUrl}" alt="${Utils.escapeHtml(album.title)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
                        `<i class="fas fa-album fallback-icon"></i>`
                    }
                    ${album.coverUrl ? `<i class="fas fa-album fallback-icon" style="display: none;"></i>` : ''}
                </div>
                <div class="album-info">
                    <div class="album-title" title="${Utils.escapeHtml(album.title)}">${Utils.escapeHtml(album.title)}</div>
                    <div class="album-artist">${Utils.escapeHtml(album.artist || 'Unknown')}</div>
                    <div class="album-year">${album.year}</div>
                    <div class="track-count"><i class="fas fa-headphones"></i> ${album.trackCount} треков</div>
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.album-card').forEach(card => {
            card.addEventListener('click', () => {
                const artist = card.dataset.artist;
                const albumTitle = card.dataset.album;
                const album = this.albums.find(a => a.artist === artist && a.title === albumTitle);
                if (album) this.showAlbumModal(album);
            });
        });
    },
    filterAlbums(searchTerm) {
        const term = searchTerm.toLowerCase();
        this.filteredAlbums = this.albums.filter(album =>
            album.title.toLowerCase().includes(term) ||
            (album.artist && album.artist.toLowerCase().includes(term))
        );
        this.renderAlbums();
    },
    showAlbumModal(album) {
        const modal = document.getElementById('albumModal');
        if (!modal) return;
        const modalTitle = document.getElementById('modalAlbumTitle');
        const modalArt = document.getElementById('modalAlbumArt');
        const tracksList = document.getElementById('modalTracksList');
        if (modalTitle) modalTitle.textContent = `${album.artist} — ${album.title} (${album.year})`;
        if (modalArt) {
            modalArt.src = album.coverUrl || '';
            modalArt.onerror = () => {
                modalArt.style.display = 'none';
            };
            modalArt.style.display = album.coverUrl ? 'block' : 'none';
        }
        if (tracksList) {
            tracksList.innerHTML = album.tracks.map((track, idx) => `
                <div class="track-item" data-track-index="${idx}">
                    <div class="track-number">${String(idx + 1).padStart(2, '0')}</div>
                    <div class="track-name">${Utils.escapeHtml(track.name)}</div>
                    <button class="track-play-btn play-now-btn">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `).join('');
            tracksList.querySelectorAll('.track-item').forEach(item => {
                const idx = parseInt(item.dataset.trackIndex);
                const playNowBtn = item.querySelector('.play-now-btn');
                if (playNowBtn) {
                    playNowBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (typeof AudioPlayer !== 'undefined') {
                            AudioPlayer.loadAlbum(album);
                            setTimeout(() => AudioPlayer.playTrack(idx), 500);
                            modal.classList.remove('active');
                        }
                    });
                }
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.track-play-btn')) {
                        if (typeof AudioPlayer !== 'undefined') {
                            AudioPlayer.loadAlbum(album);
                            setTimeout(() => AudioPlayer.playTrack(idx), 500);
                            modal.classList.remove('active');
                        }
                    }
                });
            });
        }
        modal.classList.add('active');
        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.remove('active');
            };
        }
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    }
};
