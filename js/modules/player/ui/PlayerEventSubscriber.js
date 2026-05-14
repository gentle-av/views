export class PlayerEventSubscriber {
  constructor(events, mediaHandler) {
    this.events = events;
    this.mediaHandler = mediaHandler;
  }

  subscribe() {
    this.events.on("video:play", (path) =>
      this.mediaHandler.startPlayback(path, "video"),
    );
    this.events.on("playback:audioStart", (path) =>
      this.mediaHandler.startPlayback(path, "audio"),
    );
    this.events.on("playback:videoStopped", () => this.mediaHandler.stop());
    this.events.on("playback:audioStopped", () => this.mediaHandler.stop());
  }

  unsubscribe() {
    this.events.off("video:play");
    this.events.off("playback:audioStart");
    this.events.off("playback:videoStopped");
    this.events.off("playback:audioStopped");
  }
}
