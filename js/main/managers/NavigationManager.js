export class NavigationManager {
  static init(events) {
    this.events = events;
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
    this.events.emit(`page:${page}Loaded`);
  }

  static getCurrentPage() {
    const activeItem = document.querySelector(".sidebar-btn.active");
    return activeItem?.dataset?.page || "video";
  }
}
