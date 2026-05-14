export class VideoEventHandlers {
  constructor(core, videoPageManager) {
    this.core = core;
    this.videoPageManager = videoPageManager;
  }
  
  setup() {
    console.log('VideoEventHandlers setup');
  }
  
  destroy() {
    console.log('VideoEventHandlers destroy');
  }
}
