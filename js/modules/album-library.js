const AlbumLibrary = {
    albums: [],
    filteredAlbums: [],

    async init() {
        await this.loadAlbums();
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

    async loadAlbums() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Сканирование альбомов...</div>';

        try {
            const response = await fetch(`${Utils.getServerUrl()}/api/music/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: '/mnt/media/music' })
            });
            const data = await response.json();

            if (data.success) {
                this.albums = await this.scanAlbums(data.items);
                this.filteredAlbums = [...this.albums];
                this.renderAlbums();
            } else {
                grid.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Не удалось загрузить альбомы</div>';
            }
        } catch (error) {
            console.error('Error loading albums:', error);
            grid.innerHTML = '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</div>';
        }
    },

    async scanAlbums(items) {
        const albums = [];

        for (const item of items) {
            if (item.isDirectory) {
                const albumInfo = Utils.parseAlbumFromPath(item.path);
                const tracks = await this.getTracksFromAlbum(item.path);

                if (tracks.length > 0) {
                    const coverUrl = await this.getAlbumCover(item.path, tracks[0].path);
                    albums.push({
                        path: item.path,
                        name: item.name,
                        artist: albumInfo.artist,
                        title: albumInfo.title,
                        year: albumInfo.year,
                        tracks: tracks,
                        coverUrl: coverUrl,
                        trackCount: tracks.length
                    });
                }
            }
        }

        albums.sort((a, b) => {
            if (a.artist !== b.artist) return a.artist.localeCompare(b.artist);
            return a.year.localeCompare(b.year);
        });

        return albums;
    },

    async getTracksFromAlbum(albumPath) {
        try {
            const response = await fetch(`${Utils.getServerUrl()}/api/music/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: albumPath })
            });
            const data = await response.json();

            if (data.success) {
                const tracks = data.items
                    .filter(item => !item.isDirectory && item.name.endsWith('.flac'))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(item => ({
                        name: item.name.replace(/^\d+\.\s*/, '').replace('.flac', ''),
                        path: item.path,
                        number: parseInt(item.name.match(/^(\d+)/)?.[1] || '0')
                    }));
                return tracks;
            }
        } catch (error) {
            console.error('Error loading tracks:', error);
        }
        return [];
    },

    async getAlbumCover(albumPath, trackPath) {
        try {
            const url = `${Utils.getServerUrl()}/api/music/albumart?path=${encodeURIComponent(trackPath)}`;
            const response = await fetch(url);
            if (response.ok) {
                return url;
            }
        } catch (error) {
            console.error('Error loading cover:', error);
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
                        `<img src="${album.coverUrl}" alt="${album.title}">` :
                        `<i class="fas fa-album fallback-icon"></i>`
                    }
                </div>
                <div class="album-info">
                    <div class="album-title" title="${Utils.escapeHtml(album.title)}">${Utils.escapeHtml(album.title)}</div>
                    <div class="album-artist">${Utils.escapeHtml(album.artist || 'Unknown')}</div>
                    <div class="album-year">${album.year}</div>
                    <div class="track-count">${album.trackCount} треков</div>
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

    showAlbumModal(album) {
        const modal = document.getElementById('albumModal');
        if (!modal) return;

        const modalTitle = document.getElementById('modalAlbumTitle');
        const modalArt = document.getElementById('modalAlbumArt');
        const tracksList = document.getElementById('modalTracksList');

        if (modalTitle) modalTitle.textContent = `${album.artist} — ${album.title} (${album.year})`;
        if (modalArt) modalArt.src = album.coverUrl || '';
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
