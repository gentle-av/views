export class AlbumModalTracks {
  constructor(container, trackList, musicApi, universalPlayer) {
    this.container = container;
    this.trackList = trackList;
    this.musicApi = musicApi;
    this.universalPlayer = universalPlayer;
  }

  setTrackList(trackList) {
    this.trackList = trackList;
  }

  showLoading() {
    if (this.container) {
      this.container.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка треков...</div>';
    }
  }

  showError() {
    if (this.container) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки треков</div>';
    }
  }

  showEmpty() {
    if (this.container) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-exclamation-triangle"></i> Нет треков</div>';
    }
  }

  async render(album) {
    if (!this.container) return;
    if (album.tracks && album.tracks.length > 0) {
      if (this.trackList) {
        this.trackList.render(
          this.container,
          album,
          this._onEditTrack.bind(this),
          this.universalPlayer,
        );
      }
      return;
    }
    this.showLoading();
    if (this.musicApi) {
      try {
        const tracksData = await this.musicApi.getTracks(
          album.title,
          album.artist,
          true,
        );
        const coverUrl = await this.musicApi.fetchAlbumCover(
          album.title,
          album.artist,
        );
        const normalizedTracks = (tracksData || []).map((track, idx) => ({
          ...track,
          title:
            track.title || track.name || this._extractNameFromPath(track.path),
          displayName:
            track.title || track.name || this._extractNameFromPath(track.path),
          trackNumber: track.track || idx + 1,
        }));
        album.tracks = normalizedTracks;
        album.coverUrl = coverUrl;
        if (this.trackList) {
          this.trackList.render(
            this.container,
            album,
            this._onEditTrack.bind(this),
            this.universalPlayer,
          );
        }
      } catch (error) {
        this.showError();
      }
    } else {
      this.showEmpty();
    }
  }

  _onEditTrack(track, album) {
    if (window.TagEditor && window.TagEditor.showTrackTagEditor) {
      window.TagEditor.showTrackTagEditor(track, album);
    } else {
      if (window.showNotification) {
        window.showNotification("Редактор тегов недоступен", "error");
      }
    }
  }

  _extractNameFromPath(path) {
    if (!path) return "Без названия";
    const fileName = path.split("/").pop();
    return fileName.replace(/\.(flac|mp3|m4a|wav)$/i, "");
  }
}
