import { initPowerManagement } from "../../modules/power-management/index.js";

export class PowerPageManager {
  constructor(core) {
    this.core = core;
    this.powerManagement = null;
    this._isInitialized = false;
    this._currentOutput = "speakers";
    this._currentVolume = 50;
    this._isMuted = false;
    this._tvStatusInterval = null;
  }

  async onPageLoaded() {
    this._showPageContainer();
    this._updateUI();
    if (!this.powerManagement) {
      this.powerManagement = initPowerManagement(
        this.core.api,
        this.core.events,
        { tvAddress: "192.168.50.13" },
      );
      this.core.powerManagement = this.powerManagement;
    }
    this._bindPowerEvents();
    this._bindVolumeEvents();
    this._bindAudioOutputEvents();
    this._loadVolume();
    this._updateUI();
    await this._updateTVStatus();
    this._startTVStatusPolling();
    this._isInitialized = true;
  }

  _startTVStatusPolling() {
    if (this._tvStatusInterval) {
      clearInterval(this._tvStatusInterval);
    }
    this._tvStatusInterval = setInterval(() => {
      this._updateTVStatus();
    }, 10000);
  }

  async _showPageContainer() {
    const videoContainer = document.getElementById("videoPageContainer");
    const pageContainer = document.getElementById("pageContainer");
    if (videoContainer) videoContainer.style.display = "none";
    if (pageContainer) {
      pageContainer.style.display = "block";
      const response = await fetch("/pages/power.html");
      const html = await response.text();
      pageContainer.innerHTML = html;
    }
  }

  _bindPowerEvents() {
    const tvPowerBtn = document.getElementById("tvPowerBtn");
    tvPowerBtn?.addEventListener("click", async () => {
      try {
        const statusText = document.querySelector("#tvStatus .status-text");
        if (statusText) statusText.textContent = "Переключение...";
        await this.core.api.post("/api/adb/connect", {
          address: "192.168.50.13",
        });
        await this.core.api.post("/api/adb/keyevent", { keycode: 26 });
        setTimeout(() => this._updateTVStatus(), 1000);
      } catch (error) {
        console.error("Failed to toggle TV:", error);
        const statusText = document.querySelector("#tvStatus .status-text");
        if (statusText) statusText.textContent = "Ошибка";
        setTimeout(() => this._updateTVStatus(), 2000);
      }
    });
    const sleepBtn = document.getElementById("sleepBtn");
    sleepBtn?.addEventListener("click", async () => {
      await this.core.api.post("/api/system/sleep");
    });
  }

  _bindVolumeEvents() {
    const volumeDown = document.getElementById("systemVolumeDown");
    const volumeUp = document.getElementById("systemVolumeUp");
    const volumeMute = document.getElementById("systemVolumeMute");
    const volumeRange = document.getElementById("systemVolumeRange");
    volumeDown?.addEventListener("click", () => this._changeVolume(-10));
    volumeUp?.addEventListener("click", () => this._changeVolume(10));
    volumeMute?.addEventListener("click", () => this._toggleMute());
    volumeRange?.addEventListener("input", (e) =>
      this._setVolume(parseInt(e.target.value)),
    );
  }

  async _changeVolume(delta) {
    const newVol = Math.min(100, Math.max(0, this._currentVolume + delta));
    await this._setVolume(newVol);
  }

  async _setVolume(volume) {
    this._currentVolume = volume;
    try {
      await this.core.api.post("/api/audio/volume", { volume });
      this._updateVolumeUI();
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  }

  async _toggleMute() {
    this._isMuted = !this._isMuted;
    try {
      await this.core.api.post("/api/audio/mute");
      this._updateVolumeUI();
    } catch (error) {
      console.error("Failed to toggle mute:", error);
    }
  }

  async _loadVolume() {
    try {
      const res = await this.core.api.get("/api/audio/volume");
      if (res.success && res.data) {
        this._currentVolume = res.data.volume || 50;
        this._updateVolumeUI();
      }
    } catch (error) {
      console.warn("Failed to load volume:", error);
    }
  }

  _updateVolumeUI() {
    const fill = document.getElementById("systemVolumeFill");
    const range = document.getElementById("systemVolumeRange");
    const value = document.getElementById("systemVolumeValue");
    const muteBtn = document.getElementById("systemVolumeMute");
    const displayVol = this._isMuted ? 0 : this._currentVolume;
    if (fill) fill.style.width = `${displayVol}%`;
    if (range) range.value = this._currentVolume;
    if (value)
      value.textContent = this._isMuted ? "0%" : `${this._currentVolume}%`;
    if (muteBtn) {
      const icon = muteBtn.querySelector("i");
      if (this._isMuted || this._currentVolume === 0) {
        icon.className = "fas fa-volume-mute";
      } else if (this._currentVolume < 30) {
        icon.className = "fas fa-volume-off";
      } else if (this._currentVolume < 70) {
        icon.className = "fas fa-volume-down";
      } else {
        icon.className = "fas fa-volume-up";
      }
    }
  }

  _bindAudioOutputEvents() {
    const speakersBtn = document.getElementById("audioSpeakersBtn");
    const headphonesBtn = document.getElementById("audioHeadphonesBtn");
    speakersBtn?.addEventListener("click", async () => {
      const res = await this.core.api.post("/api/audio/output/speakers");
      if (res.success) {
        this._currentOutput = "speakers";
        this._updateAudioOutputUI();
      }
    });
    headphonesBtn?.addEventListener("click", async () => {
      const res = await this.core.api.post("/api/audio/output/headphones");
      if (res.success) {
        this._currentOutput = "headphones";
        this._updateAudioOutputUI();
      }
    });
    this._loadCurrentOutput();
  }

  async _loadCurrentOutput() {
    try {
      const res = await this.core.api.get("/api/audio/output");
      if (res.success && res.data && res.data.current) {
        this._currentOutput = res.data.current;
        this._updateAudioOutputUI();
      }
    } catch (error) {
      console.warn("Failed to load current output:", error);
    }
  }

  _updateAudioOutputUI() {
    const speakersBtn = document.getElementById("audioSpeakersBtn");
    const headphonesBtn = document.getElementById("audioHeadphonesBtn");
    if (speakersBtn) {
      if (this._currentOutput === "speakers") {
        speakersBtn.classList.add("active");
      } else {
        speakersBtn.classList.remove("active");
      }
    }
    if (headphonesBtn) {
      if (this._currentOutput === "headphones") {
        headphonesBtn.classList.add("active");
      } else {
        headphonesBtn.classList.remove("active");
      }
    }
  }

  async _updateTVStatus() {
    try {
      const res = await this.core.api.get("/api/power/tv-state");
      if (res.success && res.data) {
        const statusDot = document.querySelector("#tvStatus .status-dot");
        const statusText = document.querySelector("#tvStatus .status-text");
        if (statusDot) statusDot.classList.toggle("on", res.data.screen_on);
        if (statusText)
          statusText.textContent = res.data.screen_on ? "Включен" : "Выключен";
      }
    } catch (error) {
      console.error("Failed to get TV status:", error);
      const statusText = document.querySelector("#tvStatus .status-text");
      if (statusText) statusText.textContent = "Ошибка";
    }
  }

  _updateUI() {
    if (this.core._updateUIForPage) {
      this.core._updateUIForPage("power");
    }
  }

  destroy() {
    if (this._tvStatusInterval) {
      clearInterval(this._tvStatusInterval);
      this._tvStatusInterval = null;
    }
    if (this.powerManagement?.destroy) {
      this.powerManagement.destroy();
    }
    this.powerManagement = null;
    this._isInitialized = false;
  }
}
