import { PowerManagementState } from "./PowerManagementState.js";
import { PowerManagementUI } from "./PowerManagementUI.js";
import { PowerManagementTV } from "./PowerManagementTV.js";

export class PowerManagement {
  constructor(apiClient, events, options = {}) {
    this.api = apiClient;
    this.events = events;
    this.state = new PowerManagementState(options);
    this.ui = new PowerManagementUI(options.container, this.state);
    this.tvHandler = new PowerManagementTV(apiClient, events, this.state);
    this.sleepBtn = null;
    this.isDestroyed = false;
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.tvHandler.setUI(this.ui);
    this.tvHandler.checkTVStatus();
    this.tvHandler.startPolling();
  }

  render() {
    this.ui.render();
    this.sleepBtn = document.getElementById("sleepBtn");
  }

  bindEvents() {
    const tvPowerBtn = this.ui.getTVPowerBtn();
    if (tvPowerBtn) {
      tvPowerBtn.addEventListener("click", () => this.tvHandler.toggleTV());
    }
    if (this.sleepBtn) {
      this.sleepBtn.addEventListener("click", () => this.sleepComputer());
    }
  }

  async sleepComputer() {
    try {
      const confirmed = confirm("Отправить компьютер в режим сна?");
      if (!confirmed) return;
      this.ui.showNotification(
        "Компьютер уходит в сон...",
        "info",
        this.events,
      );
      const response = await this.api.post("/api/system/sleep");
      if (response.success) {
        this.ui.showNotification("Система засыпает", "success", this.events);
      } else {
        this.ui.showNotification("Ошибка отправки в сон", "error", this.events);
      }
    } catch (error) {
      this.ui.showNotification(
        "Ошибка соединения с сервером",
        "error",
        this.events,
      );
    }
  }

  destroy() {
    this.isDestroyed = true;
    this.tvHandler.destroy();
    this.state.reset();
  }
}
