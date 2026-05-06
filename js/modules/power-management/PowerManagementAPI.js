export class PowerManagementAPI {
  constructor(apiClient, events) {
    this.api = apiClient;
    this.events = events;
  }

  async getTVState() {
    try {
      const response = await this.api.get("/api/power/tv-state");
      if (response.success && response.data) {
        return { success: true, isOn: response.data.screen_on };
      }
      return { success: false, isOn: null };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async connectToTV(address) {
    try {
      await this.api.post("/api/adb/kill-server");
      await this.api.post("/api/adb/start-server");
      await this.api.post("/api/adb/connect", { address });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sendKeyEvent(keycode) {
    try {
      const response = await this.api.post("/api/adb/keyevent", { keycode });
      return { success: response.success };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async sleepComputer() {
    try {
      const response = await this.api.post("/api/system/sleep");
      return { success: response.success };
    } catch (error) {
      console.error("Failed to sleep computer:", error);
      return { success: false, error: error.message };
    }
  }
}
