// js/ui/universal-player/PlayerDOM.js
export class PlayerDOM {
  constructor() {
    this.element = null;
    this.elements = {};
  }

  init() {
    this.element = document.getElementById("universalBottomPlayer");
    if (!this.element) return false;
    this._cacheElements();
    return true;
  }

  _cacheElements() {
    const ids = [
      "universalBottomPlayPauseBtn",
      "universalBottomPrevBtn",
      "universalBottomNextBtn",
      "universalBottomStopBtn",
      "universalBottomFullscreenBtn",
      "universalBottomProgressBar",
      "universalBottomProgressFill",
      "universalBottomTrackName",
      "universalBottomTrackArtist",
      "universalBottomTrackCount",
      "universalBottomCurrentTime",
      "universalBottomDuration",
      "universalBottomPreviewImg",
      "universalBottomPreviewIcon",
      "universalMinimizeBar",
      "universalBottomSettingsToggle",
      "universalBottomSettings",
      "universalBottomVolumeDown",
      "universalBottomVolumeUp",
      "universalBottomVolumeMute",
      "universalBottomVolumeValue",
      "universalBottomSpeakersBtn",
      "universalBottomHeadphonesBtn",
    ];
    ids.forEach((id) => {
      this.elements[id] = document.getElementById(id);
    });
  }

  get(id) {
    return this.elements[id];
  }

  getAll() {
    return this.elements;
  }

  show() {
    if (this.element) {
      this.element.classList.add("active");
      this.element.style.display = "flex";
    }
  }

  hide() {
    if (this.element) {
      this.element.classList.remove("active");
      this.element.style.display = "none";
    }
  }

  addClass(className) {
    this.element?.classList.add(className);
  }

  removeClass(className) {
    this.element?.classList.remove(className);
  }

  hasClass(className) {
    return this.element?.classList.contains(className);
  }

  toggleClass(className) {
    if (this.hasClass(className)) {
      this.removeClass(className);
    } else {
      this.addClass(className);
    }
  }
}
