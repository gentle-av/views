import { PowerManagementAPI } from "./PowerManagementAPI.js";

export class PowerManagementTV {
  constructor(apiClient, events, state) {
    this.api = apiClient;
    this.events = events;
    this.state = state;
    this.apiHandler = new PowerManagementAPI(apiClient, events);
    this.ui = null; // будет установлен извне
    this.isDestroyed = false;
  }

  setUI(ui) {
    this.ui = ui;
  }

  async toggleTV() {
    try {
      this.showNotification("Подключение к телевизору...", "info");

      const connected = await this.apiHandler.connectToTV(
        this.state.getTVAddress(),
      );
      if (!connected.success) {
        this.showNotification("Ошибка подключения к телевизору", "error");
        return;
      }
      const response = await this.apiHandler.sendKeyEvent(26);
      if (response.success) {
        this.showNotification("Команда отправлена", "success");
        setTimeout(() => this.checkTVStatus(), 1500);
      } else {
        this.showNotification("Ошибка отправки команды", "error");
      }
    } catch (error) {
      this.showNotification("Ошибка подключения к телевизору", "error");
    }
  }

  async checkTVStatus() {
    if (this.isDestroyed) return;
    const result = await this.apiHandler.getTVState();
    if (result.success && result.isOn !== null) {
      const newStatus = result.isOn ? "on" : "off";
      this.state.setTVStatus(newStatus);
      if (this.ui) {
        this.ui.updateTVStatusUI(newStatus);
      }
    } else {
      this.state.setTVStatus("unknown");
      if (this.ui) {
        this.ui.updateTVStatusUI("unknown");
      }
    }
  }

  startPolling(intervalMs = 30000) {
    if (this.state.getPollInterval()) {
      clearInterval(this.state.getPollInterval());
    }
    const interval = setInterval(() => {
      this.checkTVStatus();
    }, intervalMs);
    this.state.setPollInterval(interval);
  }

  showNotification(message, type = "info") {
    if (this.events) {
      this.events.emit("notification:show", { message, type });
    } else {
      const notification = document.getElementById("notification");
      if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type}`;
        notification.style.display = "block";
        setTimeout(() => {
          notification.style.display = "none";
        }, 3000);
      } else {
        console.log(`[${type}] ${message}`);
      }
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.state.getPollInterval()) {
      clearInterval(this.state.getPollInterval());
      this.state.setPollInterval(null);
    }
  }
}
