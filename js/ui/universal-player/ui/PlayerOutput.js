export class PlayerOutput {
  constructor(api, dom, core) {
    this.api = api;
    this.dom = dom;
    this.core = core;
    this._currentOutput = "speakers";
    this._outputPollInterval = null;
  }

  get currentOutput() {
    return this._currentOutput;
  }

  async switchToSpeakers() {
    try {
      const response = await this.api.post("/api/audio/output/speakers");
      if (response.success) {
        this._currentOutput = "speakers";
        this._updateUI();
      }
    } catch (error) {}
  }

  async switchToHeadphones() {
    try {
      const response = await this.api.post("/api/audio/output/headphones");
      if (response.success) {
        this._currentOutput = "headphones";
        this._updateUI();
      }
    } catch (error) {}
  }

  _updateUI() {
    const speakersBtn = this.dom.get("universalBottomSpeakersBtn");
    const headphonesBtn = this.dom.get("universalBottomHeadphonesBtn");
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

  async loadInitial() {
    try {
      const response = await this.api.get("/api/audio/output");
      if (response.success && response.data) {
        const current =
          response.data.current ||
          response.data.current_output ||
          response.data.output;
        if (current) {
          this._currentOutput = current;
          setTimeout(() => this._updateUI(), 100);
        }
      }
    } catch (error) {}
  }

  startPolling() {
    if (this._outputPollInterval) clearInterval(this._outputPollInterval);
    this._outputPollInterval = setInterval(async () => {
      if (this.core.isDestroyed()) return;
      try {
        const response = await this.api.get("/api/audio/output");
        if (
          response.success &&
          response.data &&
          response.data.current !== this._currentOutput
        ) {
          this._currentOutput = response.data.current;
          this._updateUI();
        }
      } catch (error) {}
    }, 3000);
  }

  stopPolling() {
    if (this._outputPollInterval) {
      clearInterval(this._outputPollInterval);
      this._outputPollInterval = null;
    }
  }
}
