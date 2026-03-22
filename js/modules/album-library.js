const AlbumLibrary = {
    albums: [],
    filteredAlbums: [],
    artists: [],
    currentArtist: null,
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
            const response = await fetch(`${Utils.getServerUrl()}/api/music/artists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: '/mnt/media/music' })
            });
            const data = await response.json();
            if (data.success && data.artists) {
                this.artists = data.artists;
                await this.loadAlbumsForAllArtists();
            } else {
                grid.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Не удалось загрузить артистов</div>';
            }
        } catch (error) {
            console.error('Error loading artists:', error);
            grid.innerHTML = '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
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
                const response = await fetch(`${Utils.getServerUrl()}/api/music/albums`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ artist: artist, path: '/mnt/media/music' })
                });
                const data = await response.json();
                if (data.success && data.albums) {
                    for (const album of data.albums) {
                        const year = this.extractYearFromPath(album.path);
                        const albumKey = `${album.album}|${year}|${artist}`;
                        if (!uniqueAlbums.has(albumKey)) {
                            const tracks = await this.getTracksFromAlbum(album.path);
                            const tracksArray = Array.isArray(tracks) ? tracks : [];
                            const coverUrl = await this.getAlbumCover(album.path, tracksArray[0]?.path);
                            uniqueAlbums.set(albumKey, {
                                path: album.path,
                                name: album.album,
                                artist: artist,
                                title: album.album,
                                year: year,
                                tracks: tracksArray,
                                coverUrl: coverUrl,
                                trackCount: tracksArray.length
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
    extractYearFromPath(path) {
        const match = path.match(/(\d{4})/);
        return match ? match[1] : '';
    },
    async getTracksFromAlbum(albumPath) {
        try {
            const response = await fetch(`${Utils.getServerUrl()}/api/music/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: albumPath })
            });
            const data = await response.json();
            if (data.success && data.items) {
                return data.items
                    .filter(item => item.name.endsWith('.flac') || item.name.endsWith('.mp3'))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(item => ({
                        name: item.name.replace(/^\d+\.\s*/, '').replace(/\.(flac|mp3)$/i, ''),
                        path: item.path,
                        number: parseInt(item.name.match(/^(\d+)/)?.[1] || '0')
                    }));
            }
            return [];
        } catch (error) {
            console.error('Error loading tracks:', error);
            return [];
        }
    },
    async getAlbumCover(albumPath, trackPath) {
        if (!trackPath) return '';
        try {
            const encodedPath = encodeURIComponent(trackPath);
            const url = `${Utils.getServerUrl()}/api/music/albumart?path=${encodedPath}`;
            const response = await fetch(url);
            if (response.ok) {
                const blob = await response.blob();
                if (blob.size > 0 && blob.type.startsWith('image/')) {
                    return url;
                }
            }
        } catch (error) {
            console.debug('No album art found for:', trackPath);
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
            <div class="album-card" data-path="${album.path}">
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
                const path = card.dataset.path;
                const album = this.albums.find(a => a.path === path);
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
    filterByArtist(artist) {
        if (!artist || artist === 'all') {
            this.filteredAlbums = [...this.albums];
        } else {
            this.filteredAlbums = this.albums.filter(album => album.artist === artist);
        }
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
                    <button class="track-play-btn">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            `).join('');
            tracksList.querySelectorAll('.track-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.track-play-btn')) {
                        const idx = parseInt(item.dataset.trackIndex);
                        if (typeof AudioPlayer !== 'undefined') {
                            AudioPlayer.playAlbum(album);
                            setTimeout(() => AudioPlayer.playTrack(idx), 500);
                        }
                        modal.classList.remove('active');
                    }
                });
                const playBtn = item.querySelector('.track-play-btn');
                if (playBtn) {
                    playBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(item.dataset.trackIndex);
                        if (typeof AudioPlayer !== 'undefined') {
                            AudioPlayer.playAlbum(album);
                            setTimeout(() => AudioPlayer.playTrack(idx), 500);
                        }
                        modal.classList.remove('active');
                    });
                }
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
