import { AlbumModalState } from "./AlbumModalState.js";
import { AlbumModalHeader } from "./AlbumModalHeader.js";
import { AlbumModalActions } from "./AlbumModalActions.js";
import { AlbumModalTracks } from "./AlbumModalTracks.js";
import { AlbumModalUI } from "./AlbumModalUI.js";
import { AlbumModalEvents } from "./AlbumModalEvents.js";

export class AlbumModal {
  constructor(events, musicApi = null, universalPlayer = null) {
    this.events = events;
    this.musicApi = musicApi;
    this.universalPlayer = universalPlayer;
    this.state = new AlbumModalState();
    this.ui = new AlbumModalUI(this.state.getModal());
    this.header = new AlbumModalHeader(this.state.getTitleEl());
    this.tracks = new AlbumModalTracks(
      this.state.getTracksContainer(),
      null,
      this.musicApi,
      this.universalPlayer,
    );
    this.actions = null;
    this.eventsHandler = null;
    this._currentAlbum = null;
    this._init();
  }

  _init() {
    this.actions = new AlbumModalActions(
      this.state.getModal(),
      this.events,
      this.musicApi,
      this.universalPlayer,
      () => this.hide(),
    );
    this.eventsHandler = new AlbumModalEvents(this.state.getModal(), (album) =>
      this._onShow(album),
    );
    this.eventsHandler.bind(this.events);
  }

  setMusicApi(musicApi) {
    this.musicApi = musicApi;
    this.tracks.musicApi = musicApi;
  }

  setUniversalPlayer(universalPlayer) {
    this.universalPlayer = universalPlayer;
    this.tracks.universalPlayer = universalPlayer;
    if (this.actions) {
      this.actions.universalPlayer = universalPlayer;
    }
  }

  setTrackList(trackList) {
    this.tracks.setTrackList(trackList);
  }

  async _onShow(album) {
    if (!this.state.getModal() || !album) return;
    this._currentAlbum = album;
    this.ui.show();
    this.header.render(album);
    this.actions.render(album);
    await this.tracks.render(album);
  }

  async show(album) {
    await this._onShow(album);
  }

  hide() {
    this.ui.hide();
    this._currentAlbum = null;
  }
}
