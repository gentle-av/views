import { initPowerManagement } from "../../modules/power-management/index.js";

export class PowerPageManager {
  constructor(core) {
    this.core = core;
    this.powerManagement = null;
    this._isInitialized = false;
  }

  onPageLoaded() {
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
    this._isInitialized = true;
  }

  _showPageContainer() {
    const videoContainer = document.getElementById("videoPageContainer");
    const pageContainer = document.getElementById("pageContainer");
    if (videoContainer) videoContainer.style.display = "none";
    if (pageContainer) {
      pageContainer.style.display = "block";
      pageContainer.innerHTML = `
        <div class="power-page">
          <div class="power-management-container">
            <div class="power-cards-grid">
              <div class="power-card tv-card">
                <div class="power-card-icon"><i class="fas fa-tv"></i></div>
                <h3 class="power-card-title">Телевизор</h3>
                <p class="power-card-status" id="tvStatus">
                  <span class="status-dot"></span>
                  <span class="status-text">Проверка...</span>
                </p>
                <button class="power-btn tv-power-btn" id="tvPowerBtn">
                  <i class="fas fa-power-off"></i>
                  <span>Вкл/Выкл</span>
                </button>
              </div>
              <div class="power-card computer-card">
                <div class="power-card-icon"><i class="fas fa-desktop"></i></div>
                <h3 class="power-card-title">Компьютер</h3>
                <p class="power-card-status" id="computerStatus">
                  <span class="status-dot"></span>
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
  }

  _updateUI() {
    if (this.core._updateUIForPage) {
      this.core._updateUIForPage("power");
    }
  }

  destroy() {
    if (this.powerManagement?.destroy) {
      this.powerManagement.destroy();
    }
    this.powerManagement = null;
    this._isInitialized = false;
  }
}
