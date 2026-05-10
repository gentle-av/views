export class PlayerEvents {
  constructor(handlers) {
    this.handlers = handlers;
    this.boundHandlers = new Map();
  }

  attach(dom) {
    const elements = dom.getAll();
    this._attachClick(elements.universalBottomPlayPauseBtn, () =>
      this.handlers.onTogglePlayPause?.(),
    );
    this._attachClick(elements.universalBottomPrevBtn, () =>
      this.handlers.onPrev?.(),
    );
    this._attachClick(elements.universalBottomNextBtn, () =>
      this.handlers.onNext?.(),
    );
    this._attachClick(elements.universalBottomStopBtn, () =>
      this.handlers.onStop?.(),
    );
    this._attachClick(elements.universalBottomFullscreenBtn, () =>
      this.handlers.onFullscreen?.(),
    );
    this._attachClick(elements.universalMinimizeBar, () =>
      this.handlers.onToggleMinimize?.(),
    );
    this._attachClick(elements.universalBottomSettingsToggle, () =>
      this.handlers.onToggleSettings?.(),
    );
    this._attachClick(elements.universalBottomVolumeDown, () =>
      this.handlers.onVolumeDown?.(),
    );
    this._attachClick(elements.universalBottomVolumeUp, () =>
      this.handlers.onVolumeUp?.(),
    );
    this._attachClick(elements.universalBottomVolumeMute, () =>
      this.handlers.onToggleMute?.(),
    );
    this._attachClick(elements.universalBottomSpeakersBtn, () =>
      this.handlers.onSpeakers?.(),
    );
    this._attachClick(elements.universalBottomHeadphonesBtn, () =>
      this.handlers.onHeadphones?.(),
    );
    if (elements.universalBottomProgressBar) {
      const handler = (e) => this.handlers.onProgressClick?.(e);
      elements.universalBottomProgressBar.addEventListener("click", handler);
      this.boundHandlers.set("progressClick", handler);
    }
  }

  _attachClick(element, handler) {
    if (element && handler) {
      element.addEventListener("click", handler);
      this.boundHandlers.set(element.id, handler);
    }
  }

  detach(dom) {
    const elements = dom.getAll();
    for (const [id, handler] of this.boundHandlers) {
      const element = elements[id];
      if (element) {
        element.removeEventListener("click", handler);
      }
    }
    this.boundHandlers.clear();
  }
}
