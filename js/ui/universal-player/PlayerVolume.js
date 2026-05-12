export class PlayerVolume {
  constructor(api, dom, core) {
    this.api = api;
    this.dom = dom;
    this.core = core;
    this._currentVolume = 50;
    this._isMuted = false;
    this._volumePollInterval = null;
  }

  get volume() {
    return this._currentVolume;
  }

  get isMuted() {
    return this._isMuted;
  }

  async changeVolume(delta) {
    const newVolume = Math.min(100, Math.max(0, this._currentVolume + delta));
    if (newVolume === this._currentVolume) return;
    this._currentVolume = newVolume;
    this._updateUI();
    await this.api.post("/api/audio/volume", { volume: this._currentVolume });
    if (this._isMuted && newVolume > 0) {
      this._isMuted = false;
      this._updateUI();
    }
  }

  async setVolume(volume) {
    const newVolume = Math.min(100, Math.max(0, volume));
    if (newVolume === this._currentVolume) return;
    this._currentVolume = newVolume;
    this._updateUI();
    await this.api.post("/api/audio/volume", { volume: this._currentVolume });
    if (this._isMuted && newVolume > 0) {
      this._isMuted = false;
      this._updateUI();
    }
  }

  async toggleMute() {
    try {
      const response = await this.api.post("/api/audio/volume/mute");
      if (response.success && response.data) {
        this._isMuted = response.data.muted;
        this._updateUI();
      }
    } catch (error) {}
  }

  _updateUI() {
    const volumeValue = this.dom.get("universalBottomVolumeValue");
    const volumeMute = this.dom.get("universalBottomVolumeMute");
    const volumeFill = this.dom.get("universalBottomVolumeFill");
    const volumeRange = this.dom.get("universalBottomVolumeRange");
    const displayVolume = this._isMuted ? 0 : this._currentVolume;
    if (volumeValue) {
      volumeValue.textContent = this._isMuted
        ? "0%"
        : `${this._currentVolume}%`;
    }
    if (volumeFill) {
      volumeFill.style.width = `${displayVolume}%`;
      if (this._isMuted || displayVolume === 0) {
        volumeFill.style.background = "var(--bg3)";
      } else if (displayVolume <= 33) {
        volumeFill.style.background = "var(--green)";
      } else if (displayVolume <= 66) {
        volumeFill.style.background = "var(--yellow)";
      } else {
        volumeFill.style.background = "var(--red)";
      }
    }
    if (volumeRange) {
      volumeRange.value = displayVolume;
    }
    if (volumeMute) {
      const icon = volumeMute.querySelector("i");
      if (this._isMuted || this._currentVolume === 0) {
        icon.className = "fas fa-volume-mute";
        volumeMute.title = "Включить звук";
        volumeMute.classList.add("muted");
      } else if (this._currentVolume < 30) {
        icon.className = "fas fa-volume-off";
        volumeMute.classList.remove("muted");
      } else if (this._currentVolume < 70) {
        icon.className = "fas fa-volume-down";
        volumeMute.classList.remove("muted");
      } else {
        icon.className = "fas fa-volume-up";
        volumeMute.classList.remove("muted");
      }
    }
  }

  async loadInitial() {
    try {
      const response = await this.api.get("/api/audio/volume");
      if (
        response.success &&
        response.data &&
        typeof response.data.volume === "number"
      ) {
        this._currentVolume = response.data.volume;
        this.dom._cacheElements();
        this._updateUI();
      }
    } catch (error) {}
  }

  startPolling() {
    if (this._volumePollInterval) clearInterval(this._volumePollInterval);
    this._volumePollInterval = setInterval(async () => {
      if (this.core.isDestroyed()) return;
      try {
        const response = await this.api.get("/api/audio/volume");
        if (response.success && response.data) {
          let updated = false;
          if (
            response.data.volume !== undefined &&
            this._currentVolume !== response.data.volume
          ) {
            this._currentVolume = response.data.volume;
            updated = true;
          }
          if (
            response.data.muted !== undefined &&
            this._isMuted !== response.data.muted
          ) {
            this._isMuted = response.data.muted;
            updated = true;
          }
          if (updated) {
            this.dom._cacheElements();
            this._updateUI();
          }
        }
      } catch (error) {}
    }, 2000);
  }

  stopPolling() {
    if (this._volumePollInterval) {
      clearInterval(this._volumePollInterval);
      this._volumePollInterval = null;
    }
  }
}
