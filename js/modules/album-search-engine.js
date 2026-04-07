// album-search-engine.js
export class AlbumSearchEngine {
  constructor(library) {
    this.library = library;
  }

  updateSearchModeIndicator() {
    let indicator = document.getElementById("searchModeIndicator");
    const searchContainer = document.querySelector(".search-container");
    if (!indicator && searchContainer) {
      indicator = document.createElement("div");
      indicator.id = "searchModeIndicator";
      indicator.className = "search-mode-indicator";
      searchContainer.appendChild(indicator);
    }
    if (indicator) {
      const modes = {
        albums: "🔍 Поиск по альбомам",
        tracks: "🎵 Поиск по трекам",
        artists: "👤 Поиск по исполнителям",
      };
      indicator.innerHTML = modes[this.library.searchMode];
      indicator.onclick = () => this.cycleSearchMode();
      indicator.style.cursor = "pointer";
    }
  }

  cycleSearchMode() {
    const modes = ["albums", "tracks", "artists"];
    const currentIndex = modes.indexOf(this.library.searchMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    this.library.searchMode = modes[nextIndex];
    const searchInput = document.getElementById("albumSearch");
    if (searchInput && searchInput.value) {
      this.performSearch(searchInput.value);
    }
    this.updateSearchModeIndicator();
    Utils.showNotification(`Режим поиска: ${this.getSearchModeName()}`, "info");
  }

  getSearchModeName() {
    const names = {
      albums: "по альбомам",
      tracks: "по трекам",
      artists: "по исполнителям",
    };
    return names[this.library.searchMode];
  }

  async performSearch(searchTerm) {
    const term = searchTerm.toLowerCase();
    if (!term) {
      this.library.filteredAlbums = [...this.library.albums];
      this.library.uiRenderer.renderAlbums();
      const statsElement = document.getElementById("searchStats");
      if (statsElement) statsElement.remove();
      return;
    }
    switch (this.library.searchMode) {
      case "tracks":
        const trackResults = await this.searchTracks(term);
        this.renderTrackSearchResults(trackResults, term);
        break;
      case "artists":
        const artistResults = this.searchArtists(term);
        this.renderArtistSearchResults(artistResults, term);
        break;
      default:
        this.filterAlbums(term);
        break;
    }
  }

  filterAlbums(searchTerm) {
    const term = searchTerm.toLowerCase();
    if (!term) {
      this.library.filteredAlbums = [...this.library.albums];
      this.library.uiRenderer.renderAlbums();
      const statsElement = document.getElementById("searchStats");
      if (statsElement) statsElement.remove();
      return;
    }
    const albumResults = this.library.albums.filter(
      (album) =>
        album.title.toLowerCase().includes(term) ||
        (album.artist && album.artist.toLowerCase().includes(term)),
    );
    const trackResults = this.library.albums.filter((album) =>
      album.tracks.some((track) => track.name.toLowerCase().includes(term)),
    );
    const allResults = [...albumResults];
    trackResults.forEach((album) => {
      if (!allResults.includes(album)) allResults.push(album);
    });
    this.library.filteredAlbums = allResults;
    this.library.uiRenderer.renderAlbums();
    this.showSearchStats(term, albumResults.length, trackResults.length);
  }

  showSearchStats(searchTerm, albumCount, trackCount) {
    let statsElement = document.getElementById("searchStats");
    const grid = document.getElementById("albumsGrid");
    if (!grid) return;
    if (!statsElement) {
      statsElement = document.createElement("div");
      statsElement.id = "searchStats";
      statsElement.className = "search-stats";
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
          ${trackCount > albumCount ? `<span class="search-tracks-hint"> (включая треки)</span>` : ""}
        </div>
      `;
    }
  }

  async searchTracks(searchTerm) {
    const term = searchTerm.toLowerCase();
    const tracks = await this.library.dataManager.collectAllTracks();
    return tracks.filter(
      (track) =>
        track.name.toLowerCase().includes(term) ||
        track.artist.toLowerCase().includes(term) ||
        track.album.toLowerCase().includes(term),
    );
  }

  searchArtists(searchTerm) {
    const term = searchTerm.toLowerCase();
    const artistMap = new Map();
    this.library.albums.forEach((album) => {
      if (!artistMap.has(album.artist)) {
        artistMap.set(album.artist, {
          name: album.artist,
          albums: [],
          coverUrl: album.coverUrl,
        });
      }
      artistMap.get(album.artist).albums.push(album);
    });
    const artists = Array.from(artistMap.values());
    if (!searchTerm) return artists;
    return artists.filter((artist) => artist.name.toLowerCase().includes(term));
  }

  renderTrackSearchResults(tracks, searchTerm) {
    const grid = document.getElementById("albumsGrid");
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
    tracks.forEach((track) => {
      const key = `${track.artist}|${track.album}`;
      if (!tracksByAlbum.has(key)) {
        tracksByAlbum.set(key, {
          artist: track.artist,
          album: track.album,
          year: track.year,
          coverUrl: track.coverUrl,
          tracks: [],
        });
      }
      tracksByAlbum.get(key).tracks.push(track);
    });
    grid.innerHTML = Array.from(tracksByAlbum.values())
      .map(
        (albumData) => `
      <div class="album-card track-search-result" data-artist="${Utils.escapeHtml(albumData.artist)}" data-album="${Utils.escapeHtml(albumData.album)}">
        <div class="album-cover">
          ${albumData.coverUrl ? `<img src="${albumData.coverUrl}" alt="${Utils.escapeHtml(albumData.album)}">` : `<i class="fas fa-album fallback-icon"></i>`}
        </div>
        <div class="album-info">
          <div class="album-title">${Utils.escapeHtml(albumData.album)}</div>
          <div class="album-artist">${Utils.escapeHtml(albumData.artist)}</div>
          <div class="track-count">
            <i class="fas fa-headphones"></i>
            Найдено треков: ${albumData.tracks.length}
          </div>
          <div class="matched-tracks">
            ${albumData.tracks
              .slice(0, 3)
              .map(
                (track) =>
                  `<span class="matched-track">🎵 ${Utils.escapeHtml(track.name)}</span>`,
              )
              .join("")}
            ${albumData.tracks.length > 3 ? `<span class="more-tracks">+${albumData.tracks.length - 3}</span>` : ""}
          </div>
        </div>
      </div>
    `,
      )
      .join("");
    this.library.uiRenderer.attachAlbumCardEvents();
  }

  renderArtistSearchResults(artists, searchTerm) {
    const grid = document.getElementById("albumsGrid");
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
    grid.innerHTML = artists
      .map(
        (artist) => `
      <div class="artist-card" data-artist="${Utils.escapeHtml(artist.name)}">
        <div class="artist-cover">
          ${artist.coverUrl ? `<img src="${artist.coverUrl}" alt="${Utils.escapeHtml(artist.name)}">` : `<i class="fas fa-user-circle fallback-icon"></i>`}
        </div>
        <div class="artist-info">
          <div class="artist-name">${Utils.escapeHtml(artist.name)}</div>
          <div class="artist-album-count">${artist.albums.length} альбомов</div>
        </div>
      </div>
    `,
      )
      .join("");
    document.querySelectorAll(".artist-card").forEach((card) => {
      card.addEventListener("click", () => {
        const artist = card.dataset.artist;
        this.filterByArtist(artist);
      });
    });
  }

  filterByArtist(artistName) {
    const searchInput = document.getElementById("albumSearch");
    if (searchInput) {
      searchInput.value = artistName;
      this.library.searchMode = "albums";
      this.updateSearchModeIndicator();
      this.filterAlbums(artistName);
    }
  }
}
