export class PowerManagementUI {
  constructor(container, state) {
    this.container = container;
    this.state = state;
    this.tvCard = null;
    this.computerCard = null;
    this.tvStatusText = null;
    this.tvStatusDot = null;
  }

  render() {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="page power-page">
        <div class="power-management-container">
          <div class="power-cards-grid">
            <div class="power-card tv-card" id="tvCard">
              <div class="power-card-icon">
                <i class="fas fa-tv"></i>
              </div>
              <h3 class="power-card-title">Телевизор</h3>
              <p class="power-card-status" id="tvStatus">
                <span class="status-dot" id="tvStatusDot"></span>
                <span class="status-text" id="tvStatusText">Проверка...</span>
              </p>
            </div>
            <div class="power-card computer-card" id="computerCard">
              <div class="power-card-icon">
                <i class="fas fa-desktop"></i>
              </div>
              <h3 class="power-card-title">Компьютер</h3>
              <p class="power-card-status">
                <span class="status-dot on"></span>
                <span class="status-text">Активен</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
    this.cacheElements();
  }

  cacheElements() {
    this.tvCard = document.getElementById("tvCard");
    this.computerCard = document.getElementById("computerCard");
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

  getTvCard() {
    return this.tvCard;
  }

  getComputerCard() {
    return this.computerCard;
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
}
