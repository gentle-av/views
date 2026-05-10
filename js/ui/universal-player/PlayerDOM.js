export class PlayerDOM {
  constructor() {
    this.element = null;
    this.elements = {};
    this._hasActivePlayback = false;
  }

  init() {
    this.element = document.getElementById("universalBottomPlayer");
    if (!this.element) return false;
    this._cacheElements();
    this.element.style.display = "none";
    this.element.classList.remove("active");
    return true;
  }

  ensureOutputButtons() {
    const settings = this.elements.universalBottomSettings;
    if (!settings) return;
    let speakersBtn = this.elements.universalBottomSpeakersBtn;
    let headphonesBtn = this.elements.universalBottomHeadphonesBtn;
    if (speakersBtn && headphonesBtn) return;
    let outputSection = settings.querySelector(
      ".universal-bottom-player-output-section",
    );
    if (!outputSection) {
      outputSection = document.createElement("div");
      outputSection.className = "universal-bottom-player-output-section";
      const label = document.createElement("span");
      label.className = "universal-bottom-player-output-label";
      label.innerHTML = '<i class="fas fa-exchange-alt"></i> Аудиовыход:';
      outputSection.appendChild(label);
      settings.appendChild(outputSection);
    }
    if (!speakersBtn) {
      speakersBtn = document.createElement("button");
      speakersBtn.id = "universalBottomSpeakersBtn";
      speakersBtn.className = "universal-bottom-player-output-btn speakers-btn";
      speakersBtn.innerHTML =
        '<i class="fas fa-volume-up"></i><span>Колонки</span>';
      outputSection.appendChild(speakersBtn);
      this.elements.universalBottomSpeakersBtn = speakersBtn;
    }
    if (!headphonesBtn) {
      headphonesBtn = document.createElement("button");
      headphonesBtn.id = "universalBottomHeadphonesBtn";
      headphonesBtn.className =
        "universal-bottom-player-output-btn headphones-btn";
      headphonesBtn.innerHTML =
        '<i class="fas fa-headphones"></i><span>Наушники</span>';
      outputSection.appendChild(headphonesBtn);
      this.elements.universalBottomHeadphonesBtn = headphonesBtn;
    }
  }

  setHasActivePlayback(hasActive) {
    this._hasActivePlayback = hasActive;
    if (
      !this._hasActivePlayback &&
      this.element &&
      this.element.style.display === "flex"
    ) {
      this.hide();
    }
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
