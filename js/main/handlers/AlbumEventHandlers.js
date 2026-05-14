export class AlbumEventHandlers {
  constructor(core, playbackManager, audioPageManager) {
    this.core = core;
    this.playbackManager = playbackManager;
    this.audioPageManager = audioPageManager;
  }
  
  setup() {
    console.log('AlbumEventHandlers setup');
  }
  
  destroy() {
    console.log('AlbumEventHandlers destroy');
  }
}
