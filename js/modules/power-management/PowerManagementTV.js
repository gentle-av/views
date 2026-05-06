import { PowerManagementAPI } from "./PowerManagementAPI.js";

export class PowerManagementTV {
  constructor(apiClient, events, state) {
    this.api = apiClient;
    this.events = events;
    this.state = state;
    this.apiHandler = new PowerManagementAPI(apiClient, events);
    this.ui = null;
    this.isDestroyed = false;
    this.debugLogs = [];
  }

  setUI(ui) {
    this.ui = ui;
  }

  addDebugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, data };
    this.debugLogs.push(logEntry);
    if (this.events) {
      this.events.emit("tv:debug", { message, timestamp, data });
    }
  }

  async toggleTV() {
    this.addDebugLog("=== НАЧАЛО toggleTV ===");
    try {
      this.showNotification("Подключение к телевизору...", "info");
      this.addDebugLog("Адрес телевизора:", this.state.getTVAddress());
      const connected = await this.apiHandler.connectToTV(
        this.state.getTVAddress(),
      );
      this.addDebugLog("Результат подключения:", connected);
      if (!connected.success) {
        this.addDebugLog("ОШИБКА подключения:", connected.error);
        this.showNotification(
          `Ошибка подключения: ${connected.error || "неизвестно"}`,
          "error",
        );
        return;
      }
      this.addDebugLog("Отправляем KEYCODE_POWER (26)");
      const response = await this.apiHandler.sendKeyEvent(26);
      this.addDebugLog("Результат отправки:", response);
      if (response.success) {
        this.showNotification("Команда отправлена", "success");
        setTimeout(() => this.checkTVStatus(), 1500);
      } else {
        this.showNotification(
          `Ошибка: ${response.error || "неизвестно"}`,
          "error",
        );
      }
    } catch (error) {
      this.addDebugLog("ИСКЛЮЧЕНИЕ:", error);
      this.showNotification(`Ошибка: ${error.message}`, "error");
    }
  }

  async checkTVStatus() {
    if (this.isDestroyed) return;
    this.addDebugLog("Проверка статуса телевизора");
    const result = await this.apiHandler.getTVState();
    this.addDebugLog("Статус получен:", result);
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
    const interval = setInterval(() => this.checkTVStatus(), intervalMs);
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
