export class AlbumEventHandlers {
  constructor(core, playbackManager, audioPageManager) {
    this.core = core;
    this.playbackManager = playbackManager;
    this.audioPageManager = audioPageManager;
    this._boundHandlers = new Map();
  }

  setup() {
    this._register("album:play", this._handlePlayAlbum.bind(this));
    this._register("album:addToPlaylist", this._handleAddToPlaylist.bind(this));
    this._register("album:playMusium", this._handlePlayMusium.bind(this));
    this._register(
      "album:replacePlaylist",
      this._handleReplacePlaylist.bind(this),
    );
    this._register("album:playTrack", this._handlePlayTrack.bind(this));
    this._register(
      "track:editMetadata",
      this._handleTrackEditMetadata.bind(this),
    );
  }

  _register(event, handler) {
    this.core.events.on(event, handler);
    this._boundHandlers.set(event, handler);
  }

  _handlePlayAlbum(album) {
    if (!album.tracks?.length) return;
    const trackPaths = album.tracks.map((track) => track.path);
    if (this.core.musicApi?.playTracks) {
      this.core.musicApi
        .playTracks(trackPaths)
        .then(() => {
          setTimeout(() => {
            if (this.playbackManager.universalPlayer?.startPlaybackExternal) {
              this.playbackManager.universalPlayer.startPlaybackExternal();
            }
          }, 500);
        })
        .catch((err) => console.error("[DEBUG] playTracks error:", err));
    } else if (this.playbackManager.universalPlayer?.startPlayback) {
      this.playbackManager.universalPlayer.startPlayback(
        album.tracks[0].path,
        "audio",
      );
    }
  }

  async _handleAddToPlaylist(album) {
    await this.playbackManager.addAlbumToPlaylist(album);
  }

  async _handlePlayMusium(album) {
    const tracks = [...(album.tracks || [])];
    if (tracks.length === 0 && this.core.musicApi?.getTracks) {
      try {
        const tracksData = await this.core.musicApi.getTracks(
          album.title,
          album.artist,
          true,
        );
        tracks.push(...tracksData);
      } catch (error) {}
    }
    const trackPaths = tracks.map((track) => track.path);
    if (this.core.musicApi?.openMusium) {
      await this.core.musicApi.openMusium(trackPaths);
    }
  }

  async _handleReplacePlaylist(album) {
    await this.playbackManager.clearPlaylist();
    await this.playbackManager.addAlbumToPlaylist(album);
    this.core.events.emit("playlistCleared");
    this.core.events.emit("playlistChanged");
  }

  _handlePlayTrack({ album, trackIndex }) {
    this.playbackManager.playTrack(album, trackIndex);
  }

  _handleTrackEditMetadata({ album, track, trackIndex }) {
    if (window.TagEditor && window.TagEditor.showTrackTagEditor) {
      window.TagEditor.showTrackTagEditor(track, album);
    } else {
      if (window.showNotification) {
        window.showNotification("Редактор тегов недоступен", "error");
      }
    }
  }

  destroy() {
    for (const [event, handler] of this._boundHandlers) {
      this.core.events.off(event, handler);
    }
    this._boundHandlers.clear();
  }
}
