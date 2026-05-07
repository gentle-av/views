class Album {
  constructor(data) {
    this.title = data.title || "";
    this.artist = data.artist || "";
    this.year = data.year || "";
    this.tracks = data.tracks || [];
    this.coverUrl = data.coverUrl || null;
    this.trackCount = this.tracks.length;
  }
}

export class AlbumLibraryLoader {
  constructor(api, state) {
    this.api = api;
    this.state = state;
    this.PARALLEL_LIMIT = 5;
    this.cancelRequested = false;
  }

  cancel() {
    this.cancelRequested = true;
  }

  async loadArtistsAndFirstAlbums(onProgress) {
    if (this.state.loading || this.state.isDestroyed) return false;
    this.state.loading = true;
    this.cancelRequested = false;
    if (onProgress)
      onProgress({ percent: 5, message: "Загрузка списка исполнителей..." });
    this.state.artistsList = await this.api.getArtists();
    if (this.cancelRequested) {
      this.state.loading = false;
      return false;
    }
    if (
      !this.state.artistsList ||
      this.state.artistsList.length === 0 ||
      this.state.isDestroyed
    ) {
      this.state.loading = false;
      return false;
    }
    this.state.albums = [];
    this.state.filteredAlbums = [];
    this.state.currentArtistIndex = 0;
    this.state.currentPage = 1;
    if (onProgress) {
      onProgress({
        percent: 10,
        message: `Загружено исполнителей: ${this.state.artistsList.length}`,
      });
    }
    await this.loadMoreAlbums(onProgress);
    this.state.loading = false;
    return true;
  }

  async loadMoreAlbums(onProgress) {
    if (this.state.isLoadingMore || this.state.isDestroyed) return false;
    this.state.isLoadingMore = true;
    const totalArtists = this.state.artistsList.length;
    const totalAlbumsEstimate = totalArtists * 5;
    while (
      this.state.currentArtistIndex < totalArtists &&
      !this.cancelRequested
    ) {
      const batchArtists = this.state.artistsList.slice(
        this.state.currentArtistIndex,
        this.state.currentArtistIndex + this.PARALLEL_LIMIT,
      );
      const batchResults = await Promise.all(
        batchArtists.map((artist) =>
          this.api.getAlbumsPaginated(
            artist,
            this.state.currentPage,
            this.state.pageSize,
          ),
        ),
      );
      if (this.cancelRequested) break;
      const allAlbums = [];
      for (const result of batchResults) {
        if (result.albums) allAlbums.push(...result.albums);
      }
      const albumsWithCovers = await Promise.all(
        allAlbums.map(async (albumData) => {
          const key = `${albumData.artist}|${albumData.album}`;
          if (
            !this.state.albums.some((a) => `${a.artist}|${a.title}` === key)
          ) {
            const coverUrl = await this.api.fetchAlbumCover(
              albumData.album,
              albumData.artist,
            );
            return new Album({
              title: albumData.album,
              artist: albumData.artist,
              year: albumData.year,
              tracks: [],
              coverUrl,
            });
          }
          return null;
        }),
      );
      for (const album of albumsWithCovers) {
        if (album) this.state.albums.push(album);
      }
      this.state.filteredAlbums = [...this.state.albums];
      if (onProgress) {
        const artistProgress =
          ((this.state.currentArtistIndex + batchArtists.length) /
            totalArtists) *
          80;
        const percent = Math.min(80, Math.max(10, artistProgress));
        const processed = this.state.albums.length;
        const total = totalAlbumsEstimate;
        const remaining = Math.max(0, total - processed);
        onProgress({
          percent: percent,
          message: `Загрузка альбомов...`,
          processedFiles: processed,
          totalFiles: total,
          remainingFiles: remaining,
          addedFiles: this.state.albums.length,
        });
      }
      let hasNext = false;
      for (const result of batchResults) {
        if (result.pagination && result.pagination.hasNext) {
          hasNext = true;
          break;
        }
      }
      if (hasNext) {
        this.state.currentPage++;
        this.state.isLoadingMore = false;
        return true;
      }
      this.state.currentArtistIndex += this.PARALLEL_LIMIT;
      this.state.currentPage = 1;
    }
    this.state.isLoadingMore = false;
    return false;
  }

  async refresh(onProgress) {
    this.state.reset();
    this.cancelRequested = false;
    if (onProgress) onProgress({ percent: 0, message: "Начало обновления..." });
    const result = await this.loadArtistsAndFirstAlbums(onProgress);
    if (onProgress && !this.cancelRequested) {
      onProgress({ percent: 100, message: "Завершено", inProgress: false });
    }
    return result;
  }
}
