const VideoExplorer = {
  currentPath: "/mnt/video",
  history: [],
  isPlayingVideo: false,
  initialized: false,
  contextMenu: null,

  getServerUrl() {
    return `http://${window.location.hostname}:${window.location.port}`;
  },

  async init() {
    if (this.initialized) {
      const videoContent = document.getElementById("videoContent");
      if (videoContent && videoContent.innerHTML.includes("Загрузка")) {
        await this.loadDirectory(this.currentPath);
      }
      return;
    }
    this.initialized = true;
    const videoContent = document.getElementById("videoContent");
    if (videoContent) {
      await this.loadDirectory(this.currentPath);
    }
  },

  async loadDirectory(path, addToHistory = true) {
    const videoContent = document.getElementById("videoContent");
    if (!videoContent) {
      console.error("videoContent element not found");
      return;
    }
    console.log("loadDirectory called with path:", path);
    if (addToHistory && this.currentPath && this.currentPath !== path) {
      this.history.push(this.currentPath);
    }
    this.currentPath = path;
    this.updateBreadcrumbs();
    videoContent.innerHTML =
      '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
    const url = `${this.getServerUrl()}/api/list`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path }),
      });
      const data = await response.json();
      if (data.success) {
        this.renderContent(data.items);
      } else {
        videoContent.innerHTML = `<div class="empty"><i class="fas fa-exclamation-triangle"></i> ${data.error || "Ошибка загрузки"}</div>`;
      }
    } catch (error) {
      console.error("Error loading directory:", error);
      videoContent.innerHTML =
        '<div class="empty"><i class="fas fa-wifi"></i> Ошибка подключения к серверу: ' +
        error.message +
        "</div>";
    }
  },

  renderContent(items) {
    const content = document.getElementById("videoContent");
    if (!content) return;
    const visibleItems = items.filter((item) => !Utils.isHiddenFile(item.name));
    if (visibleItems.length === 0) {
      content.innerHTML =
        '<div class="empty"><i class="fas fa-folder-open"></i> Папка пуста</div>';
      return;
    }
    content.innerHTML = visibleItems
      .map(
        (item) => `
          <div class="item-card" data-path="${item.path}" data-is-dir="${item.isDirectory}" data-name="${Utils.escapeHtml(item.name)}">
            <div class="item-card-content">
              <i class="fas ${item.isDirectory ? "fa-folder folder-icon" : "fa-file-video video-icon"}"></i>
              <div class="item-name" title="${Utils.escapeHtml(item.name)}">${Utils.escapeHtml(item.name)}</div>
              ${!item.isDirectory ? `<div class="item-size">${item.size || ""}</div>` : ""}
            </div>
            <div class="swipe-actions">
              <button class="swipe-delete-btn" data-path="${item.path}" data-name="${Utils.escapeHtml(item.name)}" data-is-dir="${item.isDirectory}">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
      `,
      )
      .join("");
    this.attachItemEvents();
  },

  attachItemEvents() {
    const content = document.getElementById("videoContent");
    if (!content) return;
    let touchStartX = 0;
    let touchEndX = 0;
    let currentCard = null;
    document.querySelectorAll(".item-card").forEach((card) => {
      const newCard = card.cloneNode(true);
      card.parentNode.replaceChild(newCard, card);
      const path = newCard.dataset.path;
      const isDir = newCard.dataset.isDir === "true";
      const fileName = newCard.dataset.name || path.split("/").pop();
      const deleteBtn = newCard.querySelector(".swipe-delete-btn");
      if (deleteBtn) {
        const newDeleteBtn = deleteBtn.cloneNode(true);
        deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);
        newDeleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          newCard.classList.remove("swipe-left");
          await this.deleteItem(path, fileName, isDir);
        });
      }
      newCard.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
        currentCard = newCard;
        document.querySelectorAll(".item-card.swipe-left").forEach((card) => {
          if (card !== newCard) card.classList.remove("swipe-left");
        });
      });
      newCard.addEventListener("touchmove", (e) => {
        if (!currentCard) return;
        const currentX = e.changedTouches[0].screenX;
        const diff = touchStartX - currentX;
        if (diff > 30 && !currentCard.classList.contains("swipe-left")) {
          currentCard.classList.add("swipe-left");
        } else if (diff < -30 && currentCard.classList.contains("swipe-left")) {
          currentCard.classList.remove("swipe-left");
        }
      });
      newCard.addEventListener("touchend", (e) => {
        currentCard = null;
      });
      newCard.addEventListener("click", async (e) => {
        if (e.target.closest(".swipe-delete-btn")) return;
        if (newCard.classList.contains("swipe-left")) {
          newCard.classList.remove("swipe-left");
          return;
        }
        if (isDir) {
          await this.loadDirectory(path, true);
        } else {
          await this.playVideo(path, fileName);
        }
      });
      newCard.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.clientX, e.clientY, path, fileName, isDir);
      });
    });
  },

  showContextMenu(x, y, path, name, isDirectory) {
    this.hideContextMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    if (isDirectory) {
      menu.innerHTML = `
        <div class="context-menu-item delete-item" data-action="delete">
          <i class="fas fa-trash-alt"></i>
          <span>Удалить папку</span>
        </div>
      `;
    } else {
      menu.innerHTML = `
        <div class="context-menu-item delete-item" data-action="delete">
          <i class="fas fa-trash-alt"></i>
          <span>Удалить файл</span>
        </div>
      `;
    }
    document.body.appendChild(menu);
    this.contextMenu = menu;
    const deleteBtn = menu.querySelector(".delete-item");
    deleteBtn.addEventListener("click", async () => {
      await this.deleteItem(path, name, isDirectory);
      this.hideContextMenu();
    });
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        this.hideContextMenu();
        document.removeEventListener("click", closeMenu);
        document.removeEventListener("contextmenu", closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", closeMenu);
      document.addEventListener("contextmenu", closeMenu);
    }, 0);
  },

  hideContextMenu() {
    if (this.contextMenu && this.contextMenu.parentNode) {
      this.contextMenu.parentNode.removeChild(this.contextMenu);
      this.contextMenu = null;
    }
  },

  async deleteItem(path, name, isDirectory) {
    const confirmed = await CustomDeleteDialogInstance.showConfirm(
      name,
      isDirectory,
    );
    if (!confirmed) return;
    try {
      const response = await fetch(`${this.getServerUrl()}/api/trash`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: path }),
      });
      const data = await response.json();
      if (data.success) {
        const typeText = isDirectory ? "Папка" : "Файл";
        Utils.showNotification(
          `${typeText} "${name}" перемещен(а) в корзину`,
          "success",
        );
        await this.loadDirectory(this.currentPath, false);
      } else {
        Utils.showNotification(
          data.error || data.message || "Ошибка при удалении",
          "error",
        );
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      Utils.showNotification("Ошибка при удалении: " + error.message, "error");
    }
  },

  async playVideo(path, fileName = null) {
    console.log("playVideo called with path:", path);
    const displayName = fileName || path.split("/").pop();
    try {
      if (typeof PlayerManager !== "undefined" && PlayerManager.playMedia) {
        await PlayerManager.playMedia(path);
      } else {
        const response = await fetch(`${this.getServerUrl()}/api/open`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: path }),
        });
        const data = await response.json();
        if (data.success) {
          if (typeof PlayerManager !== "undefined") {
            PlayerManager.mpvSocket = data.socket;
            PlayerManager.showControl();
            PlayerManager.currentFile = path;
            PlayerManager.playerActive = true;
            PlayerManager.isPlaying = true;
            PlayerManager.updateUI();
          }
          Utils.showNotification(`Воспроизведение: ${displayName}`, "success");
        } else {
          Utils.showNotification(
            data.error || "Ошибка воспроизведения",
            "error",
          );
        }
      }
    } catch (error) {
      console.error("Error playing video:", error);
      Utils.showNotification("Ошибка подключения к серверу", "error");
    }
  },

  updateBreadcrumbs() {
    const breadcrumbs = document.getElementById("videoBreadcrumbs");
    if (!breadcrumbs) return;
    breadcrumbs.innerHTML = "";
    const rootPath = "/mnt/video";
    const rootBreadcrumb = document.createElement("div");
    rootBreadcrumb.className = "breadcrumb-root";
    rootBreadcrumb.innerHTML =
      '<i class="fas fa-film"></i><span>Главная</span>';
    rootBreadcrumb.addEventListener("click", () => {
      this.loadDirectory(rootPath, true);
    });
    breadcrumbs.appendChild(rootBreadcrumb);
    if (this.currentPath === rootPath) return;
    let relativePath = this.currentPath.substring(rootPath.length);
    if (relativePath.startsWith("/")) relativePath = relativePath.substring(1);
    const pathParts = relativePath.split("/").filter((part) => part.length > 0);
    let currentPath = rootPath;
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath += "/" + part;
      const crumb = document.createElement("div");
      crumb.className = "breadcrumb";
      crumb.innerHTML = `<i class="fas fa-folder"></i><span class="breadcrumb-text" title="${Utils.escapeHtml(part)}">${Utils.escapeHtml(part)}</span>`;
      if (i === pathParts.length - 1) {
        crumb.classList.add("active");
      } else {
        crumb.addEventListener("click", (e) => {
          e.stopPropagation();
          this.loadDirectory(currentPath, true);
        });
      }
      breadcrumbs.appendChild(crumb);
    }
  },
};
