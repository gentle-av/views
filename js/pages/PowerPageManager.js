import { initPowerManagement } from "../modules/power-management/index.js";

export class PowerPageManager {
  constructor(core) {
    this.core = core;
    this.powerManagement = null;
    this._isInitialized = false;
    this._currentOutput = "speakers";
    this._currentVolume = 50;
    this._isMuted = false;
    this._tvStatusInterval = null;
    this._htmlLoaded = false;
  }

  async onPageLoaded() {
    await this._showPageContainer();
    await this._loadInitialData();
    this._bindAllEvents();
    this._startTVStatusPolling();
    this._isInitialized = true;
  }

  async _showPageContainer() {
    const powerContainer = document.getElementById("powerPageContainer");
    if (!powerContainer) return;
    if (!this._htmlLoaded) {
      const response = await fetch("/pages/power.html");
      const html = await response.text();
      powerContainer.innerHTML = html;
      this._htmlLoaded = true;
    }
  }

  async _loadInitialData() {
    await Promise.all([
      this._loadVolume(),
      this._updateTVStatus(),
      this._loadCurrentOutput(),
    ]);
    this._updateUI();
  }

  _bindAllEvents() {
    this._bindPowerEvents();
    this._bindVolumeEvents();
    this._bindAudioOutputEvents();
  }

  _startTVStatusPolling() {
    if (this._tvStatusInterval) {
      clearInterval(this._tvStatusInterval);
    }
    this._tvStatusInterval = setInterval(() => {
      this._updateTVStatus();
    }, 10000);
  }

  _bindPowerEvents() {
    const tvCard = document.getElementById("tvCard");
    if (tvCard) {
      tvCard.addEventListener("click", async () => {
        await this._toggleTV();
      });
    }
    const computerCard = document.getElementById("computerCard");
    if (computerCard) {
      computerCard.addEventListener("click", async () => {
        await this._sleepComputer();
      });
    }
  }

  async _toggleTV() {
    const statusText = document.querySelector("#tvStatus .status-text");
    const statusDot = document.querySelector("#tvStatus .status-dot");
    const isCurrentlyOn = statusDot?.classList.contains("on");
    try {
      if (statusText) {
        statusText.textContent = isCurrentlyOn
          ? "Выключение..."
          : "Включение...";
      }
      const response = await this.core.api.post("/api/power/tv-on");
      if (response && response.success) {
        this.core.events?.emit("notification:show", {
          message: response.message || "Команда отправлена",
          type: "success",
        });
        setTimeout(() => this._updateTVStatus(), 2000);
      } else {
        throw new Error(response?.message || "Ошибка");
      }
    } catch (error) {
      console.error("TV toggle error:", error);
      if (statusText) statusText.textContent = "Ошибка";
      this.core.events?.emit("notification:show", {
        message: `Ошибка: ${error.message}`,
        type: "error",
      });
    }
  }

  async _sleepComputer() {
    try {
      const confirmed = confirm("Отправить компьютер в режим сна?");
      if (!confirmed) return;
      this.core.events?.emit("notification:show", {
        message: "Компьютер уходит в сон...",
        type: "info",
      });
      const response = await this.core.api.post("/api/system/sleep");
      if (response && response.success) {
        this.core.events?.emit("notification:show", {
          message: response.message || "Система засыпает",
          type: "success",
        });
      } else {
        throw new Error(response?.message || "Ошибка");
      }
    } catch (error) {
      console.error("Sleep error:", error);
      this.core.events?.emit("notification:show", {
        message: `Ошибка: ${error.message}`,
        type: "error",
      });
    }
  }

  _bindVolumeEvents() {
    const volumeDown = document.getElementById("systemVolumeDown");
    const volumeUp = document.getElementById("systemVolumeUp");
    const volumeMute = document.getElementById("systemVolumeMute");
    const volumeRange = document.getElementById("systemVolumeRange");
    if (volumeDown)
      volumeDown.addEventListener("click", () => this._changeVolume(-5));
    if (volumeUp)
      volumeUp.addEventListener("click", () => this._changeVolume(5));
    if (volumeMute)
      volumeMute.addEventListener("click", () => this._toggleMute());
    if (volumeRange)
      volumeRange.addEventListener("input", (e) => {
        this._setVolume(parseInt(e.target.value));
      });
  }

  async _changeVolume(delta) {
    const newVol = Math.min(100, Math.max(0, this._currentVolume + delta));
    await this._setVolume(newVol);
  }

  async _setVolume(volume) {
    if (this._currentVolume === volume && !this._isMuted) return;
    this._currentVolume = volume;
    if (this._isMuted && volume > 0) {
      this._isMuted = false;
    }
    this._updateVolumeUI();
    try {
      await this.core.api.post("/api/audio/volume", {
        volume: this._currentVolume,
      });
    } catch (error) {
      console.error("Set volume error:", error);
    }
  }

  async _toggleMute() {
    try {
      await this.core.api.post("/api/audio/mute");
      const response = await this.core.api.get("/api/audio/volume");
      if (response.success && response.data) {
        if (response.data.muted !== undefined) {
          this._isMuted = response.data.muted;
        }
        if (response.data.volume !== undefined) {
          this._currentVolume = response.data.volume;
        }
        this._updateVolumeUI();
      }
    } catch (error) {
      console.error("Toggle mute error:", error);
      this._isMuted = !this._isMuted;
      this._updateVolumeUI();
    }
  }

  async _loadVolume() {
    try {
      const res = await this.core.api.get("/api/audio/volume");
      if (res.success && res.data) {
        if (res.data.volume !== undefined)
          this._currentVolume = res.data.volume;
        if (res.data.muted !== undefined) this._isMuted = res.data.muted;
        this._updateVolumeUI();
      }
    } catch (error) {
      console.error("Load volume error:", error);
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
    if (speakersBtn) {
      speakersBtn.addEventListener("click", async () => {
        try {
          speakersBtn.disabled = true;
          const res = await this.core.api.post("/api/audio/output/speakers");
          if (res && res.success) {
            this._currentOutput = "speakers";
            this._updateAudioOutputUI();
          }
        } catch (error) {
          console.error("Switch to speakers error:", error);
        } finally {
          speakersBtn.disabled = false;
        }
      });
    }
    if (headphonesBtn) {
      headphonesBtn.addEventListener("click", async () => {
        try {
          headphonesBtn.disabled = true;
          const res = await this.core.api.post("/api/audio/output/headphones");
          if (res && res.success) {
            this._currentOutput = "headphones";
            this._updateAudioOutputUI();
          }
        } catch (error) {
          console.error("Switch to headphones error:", error);
        } finally {
          headphonesBtn.disabled = false;
        }
      });
    }
  }

  async _loadCurrentOutput() {
    try {
      const res = await this.core.api.get("/api/audio/output");
      if (res.success && res.data && res.data.current) {
        this._currentOutput = res.data.current;
        this._updateAudioOutputUI();
      }
    } catch (error) {
      console.error("Load audio output error:", error);
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
        if (statusDot) {
          if (res.data.screen_on) {
            statusDot.classList.add("on");
          } else {
            statusDot.classList.remove("on");
          }
        }
        if (statusText) {
          statusText.textContent = res.data.screen_on ? "Включен" : "Выключен";
        }
      }
    } catch (error) {
      console.error("Update TV status error:", error);
      const statusText = document.querySelector("#tvStatus .status-text");
      if (statusText) statusText.textContent = "Ошибка подключения";
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
