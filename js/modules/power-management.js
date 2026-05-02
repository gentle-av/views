class PowerManagement {
  constructor(apiClient, events, options = {}) {
    this.api = apiClient;
    this.events = events;
    this.container = options.container || null;
    this.tvStatus = "unknown";
    this.tvAddress = "192.168.50.13";
    this.pollInterval = null;
    this.isDestroyed = false;
    this.tvPowerBtn = null;
    this.sleepBtn = null;
    this.tvStatusText = null;
    this.tvStatusDot = null;
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.checkTVStatus();
    this.startPolling();
  }

  render() {
    if (this.container) {
      this.container.innerHTML = `
        <div class="page power-page">
          <div class="power-management-container">
            <div class="power-cards-grid">
              <div class="power-card tv-card">
                <div class="power-card-icon">
                  <i class="fas fa-tv"></i>
                </div>
                <h3 class="power-card-title">Телевизор</h3>
                <p class="power-card-status" id="tvStatus">
                  <span class="status-dot" id="tvStatusDot"></span>
                  <span class="status-text" id="tvStatusText">Проверка...</span>
                </p>
                <button class="power-btn tv-power-btn" id="tvPowerBtn">
                  <i class="fas fa-power-off"></i>
                  <span>Вкл/Выкл</span>
                </button>
              </div>
              <div class="power-card computer-card">
                <div class="power-card-icon">
                  <i class="fas fa-desktop"></i>
                </div>
                <h3 class="power-card-title">Компьютер</h3>
                <p class="power-card-status">
                  <span class="status-dot on"></span>
                  <span class="status-text">Активен</span>
                </p>
                <button class="power-btn sleep-btn" id="sleepBtn">
                  <i class="fas fa-moon"></i>
                  <span>Сон</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    this.tvPowerBtn = document.getElementById("tvPowerBtn");
    this.sleepBtn = document.getElementById("sleepBtn");
    this.tvStatusText = document.getElementById("tvStatusText");
    this.tvStatusDot = document.getElementById("tvStatusDot");
  }

  bindEvents() {
    if (this.tvPowerBtn) {
      this.tvPowerBtn.addEventListener("click", () => this.toggleTV());
    }
    if (this.sleepBtn) {
      this.sleepBtn.addEventListener("click", () => this.sleepComputer());
    }
  }

  async toggleTV() {
    try {
      this.showNotification("Подключение к телевизору...", "info");
      await this.api.post("/api/adb/kill-server");
      await this.api.post("/api/adb/start-server");
      await this.api.post("/api/adb/connect", { address: this.tvAddress });
      const response = await this.api.post("/api/adb/keyevent", {
        keycode: 26,
      });
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

  async sleepComputer() {
    try {
      const confirmed = confirm("Отправить компьютер в режим сна?");
      if (!confirmed) return;
      this.showNotification("Компьютер уходит в сон...", "info");
      const response = await this.api.post("/api/system/sleep");
      if (response.success) {
        this.showNotification("Система засыпает", "success");
      } else {
        this.showNotification("Ошибка отправки в сон", "error");
      }
    } catch (error) {
      this.showNotification("Ошибка соединения с сервером", "error");
    }
  }

  async checkTVStatus() {
    if (this.isDestroyed) return;
    try {
      const response = await this.api.get("/api/power/tv-state");
      if (response.success && response.data) {
        this.tvStatus = response.data.screen_on ? "on" : "off";
        this.updateTVStatusUI();
      } else {
        this.tvStatus = "unknown";
        this.updateTVStatusUI();
      }
    } catch (error) {
      console.error("Failed to check TV status:", error);
      if (this.tvStatusText) {
        this.tvStatusText.textContent = "Ошибка";
      }
      if (this.tvStatusDot) {
        this.tvStatusDot.className = "status-dot off";
      }
    }
  }

  updateTVStatusUI() {
    if (!this.tvStatusText || !this.tvStatusDot) return;
    if (this.tvStatus === "on") {
      this.tvStatusText.textContent = "Включен";
      this.tvStatusDot.className = "status-dot on";
    } else if (this.tvStatus === "off") {
      this.tvStatusText.textContent = "Выключен";
      this.tvStatusDot.className = "status-dot off";
    } else {
      this.tvStatusText.textContent = "Неизвестно";
      this.tvStatusDot.className = "status-dot";
    }
  }

  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      this.checkTVStatus();
    }, 30000);
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
        alert(message);
      }
    }
  }

  destroy() {
    this.isDestroyed = true;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
