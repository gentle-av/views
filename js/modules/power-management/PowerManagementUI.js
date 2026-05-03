export class PowerManagementUI {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.tvPowerBtn = null;
    this.tvStatusText = null;
    this.tvStatusDot = null;
  }

  render() {
    if (!this.container) return;
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
    this.cacheElements();
  }

  cacheElements() {
    this.tvPowerBtn = document.getElementById("tvPowerBtn");
    this.tvStatusText = document.getElementById("tvStatusText");
    this.tvStatusDot = document.getElementById("tvStatusDot");
  }

  updateTVStatusUI(status) {
    if (!this.tvStatusText || !this.tvStatusDot) return;
    if (status === "on") {
      this.tvStatusText.textContent = "Включен";
      this.tvStatusDot.className = "status-dot on";
    } else if (status === "off") {
      this.tvStatusText.textContent = "Выключен";
      this.tvStatusDot.className = "status-dot off";
    } else {
      this.tvStatusText.textContent = "Неизвестно";
      this.tvStatusDot.className = "status-dot";
    }
  }

  showNotification(message, type = "info", events) {
    if (events) {
      events.emit("notification:show", { message, type });
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

  getTVPowerBtn() {
    return this.tvPowerBtn;
  }
}
