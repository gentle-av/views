const AlbumLibrary = {
    albums: [],
    filteredAlbums: [],
    artists: [],
    currentArtist: null,
    loading: false,
    loadedArtists: 0,
    totalArtists: 0,
    searchMode: 'albums',
    allTracks: [],

    async collectAllTracks() {
        if (this.allTracks.length > 0) return this.allTracks;
        const tracks = [];
        for (const album of this.albums) {
            for (const track of album.tracks) {
                tracks.push({
                    name: track.name,
                    artist: album.artist,
                    album: album.title,
                    year: album.year,
                    path: track.path,
                    coverUrl: album.coverUrl,
                    trackNumber: track.number
                });
            }
        }
        this.allTracks = tracks;
        return tracks;
    },

    async searchTracks(searchTerm) {
        const term = searchTerm.toLowerCase();
        const tracks = await this.collectAllTracks();
        return tracks.filter(track =>
            track.name.toLowerCase().includes(term) ||
            track.artist.toLowerCase().includes(term) ||
            track.album.toLowerCase().includes(term)
        );
    },

    searchArtists(searchTerm) {
        const term = searchTerm.toLowerCase();
        const artistMap = new Map();
        this.albums.forEach(album => {
            if (!artistMap.has(album.artist)) {
                artistMap.set(album.artist, {
                    name: album.artist,
                    albums: [],
                    coverUrl: album.coverUrl
                });
            }
            artistMap.get(album.artist).albums.push(album);
        });
        const artists = Array.from(artistMap.values());
        if (!searchTerm) return artists;
        return artists.filter(artist =>
            artist.name.toLowerCase().includes(term)
        );
    },

    getServerUrl() {
        return `http://${window.location.hostname}:${window.location.port}`;
    },

    async init() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка артистов...</div>';
        this.loadArtistsInBackground();
        this.setupEventListeners();
    },

    async loadArtistsInBackground() {
        try {
            const response = await fetch(`${this.getServerUrl()}/api/music/artists`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.status === 'success' && data.artists) {
                this.artists = data.artists;
                this.totalArtists = this.artists.length;
                await this.loadAlbumsSequentially();
            } else {
                const grid = document.getElementById('albumsGrid');
                if (grid) grid.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Не удалось загрузить артистов</div>';
            }
        } catch (error) {
            console.error('Error loading artists:', error);
            const grid = document.getElementById('albumsGrid');
            if (grid) grid.innerHTML = '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки артистов</div>';
        }
    },

    closePlaylistSidebar() {
        const sidebar = document.getElementById('playlistSidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
        }
    },

    setupEventListeners() {
        const searchInput = document.getElementById('albumSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
        const refreshBtn = document.querySelector('.refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDatabase());
        }
        const playlistToggleBtn = document.getElementById('playlistToggleBtn');
        if (playlistToggleBtn) {
            playlistToggleBtn.addEventListener('click', () => this.openPlaylistSidebar());
        }
        const playlistSidebarClose = document.getElementById('playlistSidebarClose');
        if (playlistSidebarClose) {
            playlistSidebarClose.addEventListener('click', () => this.closePlaylistSidebar());
        }
        this.updateSearchModeIndicator();
    },

    openPlaylistSidebar() {
        const modal = document.getElementById('albumModal');
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
        const sidebar = document.getElementById('playlistSidebar');
        if (sidebar) {
            sidebar.classList.add('open');
            if (typeof PlaylistViewer !== 'undefined') {
                PlaylistViewer.init();
            }
        }
    },

    togglePlaylist() {
        const playlistSection = document.getElementById('playlistSection');
        const playlistToggleBtn = document.getElementById('playlistToggleBtn');
        if (playlistSection) {
            if (playlistSection.style.display === 'none') {
                playlistSection.style.display = 'block';
                if (playlistToggleBtn) playlistToggleBtn.classList.add('active');
                if (typeof PlaylistViewer !== 'undefined') {
                    PlaylistViewer.init();
                }
                if (window.innerWidth <= 768) {
                    setTimeout(() => {
                        playlistSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }, 100);
                }
            } else {
                playlistSection.style.display = 'none';
                if (playlistToggleBtn) playlistToggleBtn.classList.remove('active');
            }
        }
    },

    hidePlaylist() {
        const playlistSection = document.getElementById('playlistSection');
        const playlistToggleBtn = document.getElementById('playlistToggleBtn');
        if (playlistSection) {
            playlistSection.style.display = 'none';
            if (playlistToggleBtn) playlistToggleBtn.classList.remove('active');
        }
    },

    showPlaylistSection() {
        console.log('showPlaylistSection called');
        const modal = document.getElementById('albumModal');
        if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
        }
        const playlistSection = document.getElementById('playlistSection');
        if (playlistSection) {
            playlistSection.style.display = 'block';
            const playlistToggleBtn = document.getElementById('playlistToggleBtn');
            if (playlistToggleBtn) {
                playlistToggleBtn.classList.add('active');
            }
            if (typeof PlaylistViewer !== 'undefined') {
                console.log('Calling PlaylistViewer.init()');
                PlaylistViewer.init();
                setTimeout(() => {
                    PlaylistViewer.refresh();
                }, 100);
            }
            setTimeout(() => {
                playlistSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
            }, 200);
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    playlistSection.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 200);
            }
        }
    },

    async loadArtists() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка артистов... <span id="artistProgress">0</span> найдено</div>';
        try {
            const response = await fetch(`${this.getServerUrl()}/api/music/artists`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.status === 'success' && data.artists) {
                this.artists = data.artists;
                this.totalArtists = this.artists.length;
                await this.loadAlbumsSequentially();
            } else {
                grid.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Не удалось загрузить артистов</div>';
            }
        } catch (error) {
            console.error('Error loading artists:', error);
            grid.innerHTML = '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки артистов</div>';
        }
    },

    async loadAlbumsSequentially() {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        this.albums = [];
        const uniqueAlbums = new Map();
        grid.innerHTML = `
            <div class="loading" style="grid-column: 1/-1;">
                <i class="fas fa-spinner fa-spin"></i>
                Загрузка альбомов...
                <span id="albumProgress">0</span>/<span id="albumTotal">${this.totalArtists}</span> артистов
                <div style="margin-top: 10px;">
                    <span id="albumsFound">0</span> альбомов найдено
                </div>
            </div>
        `;
        const progressSpan = document.getElementById('albumProgress');
        const foundSpan = document.getElementById('albumsFound');
        const loadPromises = [];
        for (let i = 0; i < this.artists.length; i++) {
            const artist = this.artists[i];
            const loadPromise = this.loadArtistAlbums(artist, uniqueAlbums, progressSpan, foundSpan, i + 1);
            loadPromises.push(loadPromise);
            if (loadPromises.length >= 5 || i === this.artists.length - 1) {
                await Promise.all(loadPromises);
                loadPromises.length = 0;
            }
        }
        this.albums.sort((a, b) => {
            if (a.artist !== b.artist) return a.artist.localeCompare(b.artist);
            if (a.year !== b.year) return a.year.localeCompare(b.year);
            return a.title.localeCompare(b.title);
        });
        this.filteredAlbums = [...this.albums];
        this.renderAlbums();
    },

    renderAlbumsIncremental() {
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
        this.attachAlbumCardEvents();
    },

    async loadArtistAlbums(artist, uniqueAlbums, progressSpan, foundSpan, loadedCount) {
        try {
            const url = `${this.getServerUrl()}/api/music/albums?artist=${encodeURIComponent(artist)}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.status === 'success' && data.albums) {
                const newAlbums = [];
                for (const album of data.albums) {
                    const albumKey = `${album.album}|${album.artist}`;
                    if (!uniqueAlbums.has(albumKey)) {
                        const tracks = await this.getTracksFromAlbum(album.album, album.artist);
                        const coverUrl = await this.getAlbumCover(album.album, album.artist);
                        const albumData = {
                            name: album.album,
                            artist: album.artist,
                            title: album.album,
                            year: album.year || '',
                            tracks: tracks,
                            coverUrl: coverUrl,
                            trackCount: tracks.length
                        };
                        uniqueAlbums.set(albumKey, albumData);
                        newAlbums.push(albumData);
                    }
                }
                if (newAlbums.length > 0) {
                    this.albums.push(...newAlbums);
                    this.filteredAlbums = [...this.albums];
                    this.renderAlbumsIncremental();
                    if (foundSpan) foundSpan.textContent = this.albums.length;
                }
            }
        } catch (error) {
            console.error(`Error loading albums for artist ${artist}:`, error);
        }
        this.loadedArtists = loadedCount;
        if (progressSpan) progressSpan.textContent = this.loadedArtists;
    },

    attachAlbumCardEvents() {
        document.querySelectorAll('.album-card').forEach(card => {
            card.removeEventListener('click', this.handleAlbumClick);
            card.addEventListener('click', this.handleAlbumClick.bind(this));
        });
    },

    handleAlbumClick(event) {
        const card = event.currentTarget;
        const artist = card.dataset.artist;
        const albumTitle = card.dataset.album;
        const album = this.albums.find(a => a.artist === artist && a.title === albumTitle);
        if (album) this.showAlbumModal(album);
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
        this.attachAlbumCardEvents();
    },

    filterAlbums(searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!term) {
            this.filteredAlbums = [...this.albums];
            this.renderAlbums();
            const statsElement = document.getElementById('searchStats');
            if (statsElement) statsElement.remove();
            return;
        }
        const albumResults = this.albums.filter(album =>
            album.title.toLowerCase().includes(term) ||
            (album.artist && album.artist.toLowerCase().includes(term))
        );
        const trackResults = this.albums.filter(album =>
            album.tracks.some(track =>
                track.name.toLowerCase().includes(term)
            )
        );
        const allResults = [...albumResults];
        trackResults.forEach(album => {
            if (!allResults.includes(album)) {
                allResults.push(album);
            }
        });
        this.filteredAlbums = allResults;
        this.renderAlbums();
        this.showSearchStats(term, albumResults.length, trackResults.length);
    },

    showSearchStats(searchTerm, albumCount, trackCount) {
        let statsElement = document.getElementById('searchStats');
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        if (!statsElement) {
            statsElement = document.createElement('div');
            statsElement.id = 'searchStats';
            statsElement.className = 'search-stats';
            grid.parentNode.insertBefore(statsElement, grid);
        }
        if (albumCount === 0 && trackCount === 0) {
            statsElement.innerHTML = `
                <div class="search-no-results">
                    <i class="fas fa-search"></i>
                    По запросу "${Utils.escapeHtml(searchTerm)}" ничего не найдено
                </div>
            `;
        } else {
            statsElement.innerHTML = `
                <div class="search-results-info">
                    <i class="fas fa-search"></i>
                    Найдено: ${albumCount} альбомов, содержащих "${Utils.escapeHtml(searchTerm)}"
                    ${trackCount > albumCount ? `<span class="search-tracks-hint"> (включая треки)</span>` : ''}
                </div>
            `;
        }
    },

    updateSearchModeIndicator() {
        let indicator = document.getElementById('searchModeIndicator');
        const searchContainer = document.querySelector('.search-container');
        if (!indicator && searchContainer) {
            indicator = document.createElement('div');
            indicator.id = 'searchModeIndicator';
            indicator.className = 'search-mode-indicator';
            searchContainer.appendChild(indicator);
        }
        if (indicator) {
            const modes = {
                albums: '🔍 Поиск по альбомам',
                tracks: '🎵 Поиск по трекам',
                artists: '👤 Поиск по исполнителям'
            };
            indicator.innerHTML = modes[this.searchMode];
            indicator.onclick = () => this.cycleSearchMode();
            indicator.style.cursor = 'pointer';
        }
    },

    cycleSearchMode() {
        const modes = ['albums', 'tracks', 'artists'];
        const currentIndex = modes.indexOf(this.searchMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.searchMode = modes[nextIndex];
        const searchInput = document.getElementById('albumSearch');
        if (searchInput && searchInput.value) {
            this.performSearch(searchInput.value);
        }
        this.updateSearchModeIndicator();
        Utils.showNotification(`Режим поиска: ${this.getSearchModeName()}`, 'info');
    },

    getSearchModeName() {
        const names = {
            albums: 'по альбомам',
            tracks: 'по трекам',
            artists: 'по исполнителям'
        };
        return names[this.searchMode];
    },

    async performSearch(searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!term) {
            this.filteredAlbums = [...this.albums];
            this.renderAlbums();
            const statsElement = document.getElementById('searchStats');
            if (statsElement) statsElement.remove();
            return;
        }
        switch (this.searchMode) {
            case 'tracks':
                const trackResults = await this.searchTracks(term);
                this.renderTrackSearchResults(trackResults, term);
                break;
            case 'artists':
                const artistResults = this.searchArtists(term);
                this.renderArtistSearchResults(artistResults, term);
                break;
            default:
                this.filterAlbums(term);
                break;
        }
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

    showAlbumModal(album) {
        console.log('showAlbumModal called');
        const modal = document.getElementById('albumModal');
        if (!modal) return;
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) return;
        modalContent.innerHTML = `
            <div class="album-modal-header">
                <div class="album-cover-container">
                    ${album.coverUrl ?
                        `<img src="${album.coverUrl}" alt="${Utils.escapeHtml(album.title)}" class="album-cover-modal">` :
                        `<div class="album-cover-placeholder"><i class="fas fa-album"></i></div>`
                    }
                </div>
                <div class="album-info-container">
                    <h2 class="modal-album-title">${Utils.escapeHtml(album.artist)} — ${Utils.escapeHtml(album.title)}</h2>
                    <div class="modal-album-year">${album.year || 'Год неизвестен'}</div>
                    <div class="modal-track-count"><i class="fas fa-headphones"></i> ${album.trackCount} треков</div>
                </div>
                <div class="modal-controls">
                    <button class="modal-control-btn prev-track-btn" title="Предыдущий трек"><i class="fas fa-step-backward"></i></button>
                    <button class="modal-control-btn add-to-playlist-btn" title="Добавить в плейлист"><i class="fas fa-plus-circle"></i></button>
                    <button class="modal-control-btn replace-playlist-btn" title="Заменить плейлист"><i class="fas fa-exchange-alt"></i></button>
                    <button class="modal-control-btn show-playlist-btn" title="Показать плейлист"><i class="fas fa-list"></i></button>
                    <button class="modal-control-btn next-track-btn" title="Следующий трек"><i class="fas fa-step-forward"></i></button>
                    <button class="modal-close-btn"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div class="tracks-list-container">
                <h3>Треки</h3>
                <div class="tracks-list" id="modalTracksList"></div>
            </div>
        `;
        const tracksList = document.getElementById('modalTracksList');
        if (tracksList) {
            tracksList.innerHTML = album.tracks.map((track, idx) => `
                <div class="track-item" data-track-index="${idx}" data-track-name="${Utils.escapeHtml(track.name)}" data-track-path="${track.path}">
                    <div class="track-number">${String(idx + 1).padStart(2, '0')}</div>
                    <div class="track-name">${Utils.escapeHtml(track.name)}</div>
                    <div class="track-controls">
                        <button class="track-control-btn replace-playlist-with-track" title="Заменить плейлист этим треком"><i class="fas fa-exchange-alt"></i></button>
                        <button class="track-control-btn add-after-current" title="Добавить после текущего"><i class="fas fa-plus-circle"></i></button>
                        <button class="track-control-btn show-playlist-from-track" title="Показать плейлист"><i class="fas fa-list"></i></button>
                    </div>
                </div>
            `).join('');
            tracksList.querySelectorAll('.track-item').forEach(item => {
                const idx = parseInt(item.dataset.trackIndex);
                const trackName = item.dataset.trackName;
                const replacePlaylistBtn = item.querySelector('.replace-playlist-with-track');
                const addAfterCurrentBtn = item.querySelector('.add-after-current');
                const showPlaylistBtn = item.querySelector('.show-playlist-from-track');
                if (replacePlaylistBtn) {
                    replacePlaylistBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        console.log('replacePlaylistWithTrack clicked for track:', trackName);
                        if (typeof AudioPlayer !== 'undefined') {
                            AudioPlayer.replacePlaylistWithTrack(album, idx);
                            Utils.showNotification(`Плейлист заменен треком: ${trackName}`, 'success');
                            modal.classList.remove('active');
                            console.log('Calling showPlaylistSection from replacePlaylist');
                            if (typeof AlbumLibrary !== 'undefined' && AlbumLibrary.showPlaylistSection) {
                                AlbumLibrary.showPlaylistSection();
                            } else {
                                console.log('AlbumLibrary.showPlaylistSection not available');
                            }
                        }
                    });
                }
                if (addAfterCurrentBtn) {
                    addAfterCurrentBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        console.log('addAfterCurrent clicked for track:', trackName);
                        if (typeof AudioPlayer !== 'undefined') {
                            AudioPlayer.addTrackAfterCurrent(album, idx);
                            Utils.showNotification(`Трек добавлен после текущего: ${trackName}`, 'success');
                            console.log('Calling showPlaylistSection from addAfterCurrent');
                            if (typeof AlbumLibrary !== 'undefined' && AlbumLibrary.showPlaylistSection) {
                                AlbumLibrary.showPlaylistSection();
                            } else {
                                console.log('AlbumLibrary.showPlaylistSection not available');
                            }
                        }
                    });
                }
                if (showPlaylistBtn) {
                    showPlaylistBtn.addEventListener('click', function(e) {
                        e.stopPropagation();
                        console.log('showPlaylistFromTrack clicked');
                        if (typeof AlbumLibrary !== 'undefined' && AlbumLibrary.showPlaylistSection) {
                            AlbumLibrary.showPlaylistSection();
                        } else {
                            console.log('AlbumLibrary.showPlaylistSection not available');
                        }
                        if (typeof PlaylistViewer !== 'undefined') {
                            PlaylistViewer.init();
                        }
                        modal.classList.remove('active');
                    });
                }
                item.addEventListener('click', function(e) {
                    if (!e.target.closest('.track-control-btn')) {
                        console.log('Track item clicked, playing track:', trackName);
                        if (typeof AudioPlayer !== 'undefined') {
                            AudioPlayer.playSingleTrack(album, idx);
                            modal.classList.remove('active');
                        }
                    }
                });
            });
        }
        const prevBtn = modalContent.querySelector('.prev-track-btn');
        const nextBtn = modalContent.querySelector('.next-track-btn');
        const addToPlaylistBtn = modalContent.querySelector('.add-to-playlist-btn');
        const replacePlaylistBtn = modalContent.querySelector('.replace-playlist-btn');
        const showPlaylistBtn = modalContent.querySelector('.show-playlist-btn');
        const closeBtn = modalContent.querySelector('.modal-close-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', function() {
                console.log('prevTrack clicked');
                if (typeof AudioPlayer !== 'undefined') {
                    AudioPlayer.previousTrack();
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', function() {
                console.log('nextTrack clicked');
                if (typeof AudioPlayer !== 'undefined') {
                    AudioPlayer.nextTrack();
                }
            });
        }
        if (addToPlaylistBtn) {
            addToPlaylistBtn.addEventListener('click', function() {
                console.log('addToPlaylist clicked for album:', album.title);
                if (typeof AudioPlayer !== 'undefined') {
                    AudioPlayer.addAlbumToPlaylist(album);
                    Utils.showNotification(`Альбом "${album.title}" добавлен в плейлист`, 'success');
                    console.log('Calling showPlaylistSection from addToPlaylist');
                    if (typeof AlbumLibrary !== 'undefined' && AlbumLibrary.showPlaylistSection) {
                        AlbumLibrary.showPlaylistSection();
                    } else {
                        console.log('AlbumLibrary.showPlaylistSection not available');
                    }
                }
            });
        }
        if (replacePlaylistBtn) {
            replacePlaylistBtn.addEventListener('click', function() {
                console.log('replacePlaylist clicked for album:', album.title);
                if (typeof AudioPlayer !== 'undefined') {
                    AudioPlayer.replacePlaylistWithAlbum(album);
                    Utils.showNotification(`Плейлист заменен альбомом: ${album.title}`, 'success');
                    modal.classList.remove('active');
                    console.log('Calling showPlaylistSection from replacePlaylist');
                    if (typeof AlbumLibrary !== 'undefined' && AlbumLibrary.showPlaylistSection) {
                        AlbumLibrary.showPlaylistSection();
                    } else {
                        console.log('AlbumLibrary.showPlaylistSection not available');
                    }
                }
            });
        }
        if (showPlaylistBtn) {
            showPlaylistBtn.addEventListener('click', function() {
                console.log('showPlaylistBtn clicked');
                if (typeof AlbumLibrary !== 'undefined' && AlbumLibrary.showPlaylistSection) {
                    AlbumLibrary.showPlaylistSection();
                } else {
                    console.log('AlbumLibrary.showPlaylistSection not available');
                }
                if (typeof PlaylistViewer !== 'undefined') {
                    PlaylistViewer.init();
                }
                modal.classList.remove('active');
            });
        }
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                console.log('closeBtn clicked');
                modal.classList.remove('active');
            });
        }
        modal.classList.add('active');
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                console.log('modal background clicked');
                modal.classList.remove('active');
            }
        });
    },

    async refreshDatabase() {
        const refreshBtn = document.querySelector('.refresh-btn');
        if (!refreshBtn) return;
        refreshBtn.classList.add('refreshing');
        refreshBtn.disabled = true;
        try {
            const scanResponse = await fetch('/api/music/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!scanResponse.ok) {
                throw new Error('Ошибка при сканировании');
            }
            const scanResult = await scanResponse.json();
            if (scanResult.status === 'success') {
                const removeResponse = await fetch('/api/music/remove-missing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (!removeResponse.ok) {
                    throw new Error('Ошибка при удалении отсутствующих файлов');
                }
                const removeResult = await removeResponse.json();
                if (removeResult.status === 'success') {
                    Utils.showNotification('База данных обновлена успешно', 'success');
                    await this.loadArtists();
                } else {
                    throw new Error(removeResult.message || 'Ошибка при удалении файлов');
                }
            } else {
                throw new Error(scanResult.message || 'Ошибка при сканировании');
            }
        } catch (error) {
            console.error('Error refreshing database:', error);
            Utils.showNotification('Ошибка при обновлении базы данных: ' + error.message, 'error');
        } finally {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.disabled = false;
        }
    },

    renderTrackSearchResults(tracks, searchTerm) {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        if (tracks.length === 0) {
            grid.innerHTML = `
                <div class="empty">
                    <i class="fas fa-music"></i>
                    Треки по запросу "${Utils.escapeHtml(searchTerm)}" не найдены
                </div>
            `;
            return;
        }
        const tracksByAlbum = new Map();
        tracks.forEach(track => {
            const key = `${track.artist}|${track.album}`;
            if (!tracksByAlbum.has(key)) {
                tracksByAlbum.set(key, {
                    artist: track.artist,
                    album: track.album,
                    year: track.year,
                    coverUrl: track.coverUrl,
                    tracks: []
                });
            }
            tracksByAlbum.get(key).tracks.push(track);
        });
        grid.innerHTML = Array.from(tracksByAlbum.values()).map(albumData => `
            <div class="album-card track-search-result" data-artist="${Utils.escapeHtml(albumData.artist)}" data-album="${Utils.escapeHtml(albumData.album)}">
                <div class="album-cover">
                    ${albumData.coverUrl ?
                        `<img src="${albumData.coverUrl}" alt="${Utils.escapeHtml(albumData.album)}">` :
                        `<i class="fas fa-album fallback-icon"></i>`
                    }
                </div>
                <div class="album-info">
                    <div class="album-title">${Utils.escapeHtml(albumData.album)}</div>
                    <div class="album-artist">${Utils.escapeHtml(albumData.artist)}</div>
                    <div class="track-count">
                        <i class="fas fa-headphones"></i>
                        Найдено треков: ${albumData.tracks.length}
                    </div>
                    <div class="matched-tracks">
                        ${albumData.tracks.slice(0, 3).map(track =>
                            `<span class="matched-track">🎵 ${Utils.escapeHtml(track.name)}</span>`
                        ).join('')}
                        ${albumData.tracks.length > 3 ? `<span class="more-tracks">+${albumData.tracks.length - 3}</span>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
        this.attachAlbumCardEvents();
    },

    renderArtistSearchResults(artists, searchTerm) {
        const grid = document.getElementById('albumsGrid');
        if (!grid) return;
        if (artists.length === 0) {
            grid.innerHTML = `
                <div class="empty">
                    <i class="fas fa-user"></i>
                    Исполнители по запросу "${Utils.escapeHtml(searchTerm)}" не найдены
                </div>
            `;
            return;
        }
        grid.innerHTML = artists.map(artist => `
            <div class="artist-card" data-artist="${Utils.escapeHtml(artist.name)}">
                <div class="artist-cover">
                    ${artist.coverUrl ?
                        `<img src="${artist.coverUrl}" alt="${Utils.escapeHtml(artist.name)}">` :
                        `<i class="fas fa-user-circle fallback-icon"></i>`
                    }
                </div>
                <div class="artist-info">
                    <div class="artist-name">${Utils.escapeHtml(artist.name)}</div>
                    <div class="artist-album-count">${artist.albums.length} альбомов</div>
                </div>
            </div>
        `).join('');
        document.querySelectorAll('.artist-card').forEach(card => {
            card.addEventListener('click', () => {
                const artist = card.dataset.artist;
                this.filterByArtist(artist);
            });
        });
    },

    filterByArtist(artistName) {
        const searchInput = document.getElementById('albumSearch');
        if (searchInput) {
            searchInput.value = artistName;
            this.searchMode = 'albums';
            this.updateSearchModeIndicator();
            this.filterAlbums(artistName);
        }
    }
};
