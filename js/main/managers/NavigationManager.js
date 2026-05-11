export class NavigationManager {
  static init(events, uiManager) {
    this.events = events;
    this.uiManager = uiManager;
    this._setupNavigationListeners();
  }

  static _setupNavigationListeners() {
    const navItems = document.querySelectorAll(".sidebar-btn");
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const page = item.dataset.page;
        if (page) this.switchTo(page);
      });
    });
    const mobileNavBtns = document.querySelectorAll(
      "#mobileNavButtons .header-btn",
    );
    mobileNavBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        if (btn.id === "navVideoBtn") this.switchTo("video");
        else if (btn.id === "navAudioBtn") this.switchTo("audio");
        else if (btn.id === "navPowerBtn") this.switchTo("power");
      });
    });
  }

  static async switchTo(page) {
    if (this.uiManager) {
      this.uiManager.updateUIForPage(page);
    }
    const sidebarBtns = document.querySelectorAll(".sidebar-btn");
    sidebarBtns.forEach((btn) => {
      if (btn.dataset.page === page) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    const mobileBtns = document.querySelectorAll(
      "#mobileNavButtons .header-btn",
    );
    mobileBtns.forEach((btn) => {
      btn.classList.remove("active");
      if (
        (btn.id === "navVideoBtn" && page === "video") ||
        (btn.id === "navAudioBtn" && page === "audio") ||
        (btn.id === "navPowerBtn" && page === "power")
      ) {
        btn.classList.add("active");
      }
    });
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) {
      if (page === "video")
        pageTitle.innerHTML = '<i class="fas fa-video"></i> Видео';
      else if (page === "audio")
        pageTitle.innerHTML = '<i class="fas fa-music"></i> Аудио';
      else if (page === "power")
        pageTitle.innerHTML = '<i class="fas fa-plug"></i> Питание';
    }
    const videoContainer = document.getElementById("videoPageContainer");
    const audioContainer = document.getElementById("audioPageContainer");
    const powerContainer = document.getElementById("powerPageContainer");
    if (videoContainer)
      videoContainer.style.display = page === "video" ? "flex" : "none";
    if (audioContainer)
      audioContainer.style.display = page === "audio" ? "block" : "none";
    if (powerContainer)
      powerContainer.style.display = page === "power" ? "block" : "none";
    this.events.emit(`page:${page}Loaded`);
  }

  static getCurrentPage() {
    const activeItem = document.querySelector(".sidebar-btn.active");
    return activeItem?.dataset?.page || "video";
  }
}
