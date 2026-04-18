class VideoLibrary {
  constructor(apiClient, events, navigationManager) {
    this.api = apiClient;
    this.events = events;
    this.navigation = navigationManager;
    this.currentPath = "/mnt/video";
    this.history = [];
    this.container = document.getElementById("videoContent");
    this.breadcrumbs = document.getElementById("videoBreadcrumbs");
    this._bindEvents();
  }

  _bindEvents() {
    this.events.on("video:play", (path) => this.playVideo(path));
    this.events.on("video:delete", (data) =>
      this.deleteItem(data.path, data.name, data.isDir),
    );
    this.events.on("navigation:videoPage", () => this.refresh());
    this.events.on("video:refresh", () => this.refresh());
  }

  async loadDirectory(path, addToHistory = true) {
    this.currentPath = path;
    if (addToHistory) this.history.push(path);
    this._updateBreadcrumbs();
    this._showLoading();
    const data = await this.api.post("/api/list", { path });
    if (data.success) {
      this._renderContent(data.items);
    } else {
      this._showError(data.error || "Ошибка загрузки");
    }
  }

  _renderContent(items) {
    const visibleItems = items.filter((item) => !item.name.startsWith("."));
    if (visibleItems.length === 0) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-folder-open"></i> Папка пуста</div>';
      return;
    }
    this.container.innerHTML = visibleItems
      .map(
        (item) => `
            <div class="item-card" data-path="${item.path}" data-is-dir="${item.isDirectory}">
                <div class="item-card-content">
                    <i class="fas ${item.isDirectory ? "fa-folder folder-icon" : "fa-file-video video-icon"}"></i>
                    <div class="item-name" title="${this._escape(item.name)}">${this._escape(item.name)}</div>
                    ${!item.isDirectory ? `<div class="item-size">${item.size || ""}</div>` : ""}
                </div>
                <div class="swipe-actions">
                    <button class="swipe-delete-btn" data-path="${item.path}" data-name="${this._escape(item.name)}" data-is-dir="${item.isDirectory}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
    this._attachItemEvents();
  }

  _attachItemEvents() {
    this.container.querySelectorAll(".item-card").forEach((card) => {
      const path = card.dataset.path;
      const isDir = card.dataset.isDir === "true";
      const name = card.querySelector(".item-name")?.textContent || "";
      card.addEventListener("click", async (e) => {
        if (e.target.closest(".swipe-delete-btn")) return;
        if (isDir) {
          await this.loadDirectory(path, true);
        } else {
          this.events.emit("video:play", path);
        }
      });
      const deleteBtn = card.querySelector(".swipe-delete-btn");
      if (deleteBtn) {
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const confirmed = await CustomDeleteDialogInstance.showConfirm(
            name,
            isDir,
          );
          if (confirmed) {
            this.events.emit("video:delete", { path, name, isDir });
          }
        });
      }
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._showContextMenu(e.clientX, e.clientY, path, name, isDir);
      });
    });
  }

  _showContextMenu(x, y, path, name, isDirectory) {
    this._hideContextMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.innerHTML = `
            <div class="context-menu-item delete-item" data-action="delete">
                <i class="fas fa-trash-alt"></i>
                <span>Удалить</span>
            </div>
        `;
    document.body.appendChild(menu);
    this._currentContextMenu = menu;
    const deleteBtn = menu.querySelector(".delete-item");
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      this._hideContextMenu();
      const confirmed = await CustomDeleteDialogInstance.showConfirm(
        name,
        isDirectory,
      );
      if (confirmed) {
        this.events.emit("video:delete", { path, name, isDir: isDirectory });
      }
    });
    const closeMenu = (e) => {
      if (!menu.contains(e.target)) {
        this._hideContextMenu();
        document.removeEventListener("click", closeMenu);
        document.removeEventListener("contextmenu", closeMenu);
      }
    };
    setTimeout(() => {
      document.addEventListener("click", closeMenu);
      document.addEventListener("contextmenu", closeMenu);
    }, 0);
  }

  _hideContextMenu() {
    if (this._currentContextMenu && this._currentContextMenu.parentNode) {
      this._currentContextMenu.parentNode.removeChild(this._currentContextMenu);
      this._currentContextMenu = null;
    }
  }

  async playVideo(path) {
    this.events.emit("playback:videoStart", path);
    const response = await this.api.post("/api/open", { path });
    if (response.success) {
      this.events.emit("player:show", "video");
      Utils.showNotification(
        `Воспроизведение: ${path.split("/").pop()}`,
        "success",
      );
    } else {
      Utils.showNotification("Ошибка воспроизведения", "error");
    }
  }

  async deleteItem(path, name, isDirectory) {
    const response = await this.api.post("/api/trash", { path });
    if (response.success) {
      Utils.showNotification(
        `${isDirectory ? "Папка" : "Файл"} "${name}" удален`,
        "success",
      );
      await this.loadDirectory(this.currentPath, false);
    } else {
      Utils.showNotification(response.error || "Ошибка удаления", "error");
    }
  }

  refresh() {
    if (this.currentPath) {
      this.loadDirectory(this.currentPath, false);
    }
  }

  _updateBreadcrumbs() {
    if (!this.breadcrumbs) return;
    this.breadcrumbs.innerHTML = "";
    const rootPath = "/mnt/video";
    const rootBreadcrumb = document.createElement("div");
    rootBreadcrumb.className = "breadcrumb-root";
    rootBreadcrumb.innerHTML =
      '<i class="fas fa-film"></i><span>Главная</span>';
    rootBreadcrumb.addEventListener("click", () => {
      this.loadDirectory(rootPath, true);
    });
    this.breadcrumbs.appendChild(rootBreadcrumb);
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
      crumb.innerHTML = `<i class="fas fa-folder"></i><span class="breadcrumb-text" title="${this._escape(part)}">${this._escape(part)}</span>`;
      if (i === pathParts.length - 1) {
        crumb.classList.add("active");
      } else {
        crumb.addEventListener("click", (e) => {
          e.stopPropagation();
          this.loadDirectory(currentPath, true);
        });
      }
      this.breadcrumbs.appendChild(crumb);
    }
  }

  _showLoading() {
    if (this.container) {
      this.container.innerHTML =
        '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
    }
  }

  _showError(message) {
    if (this.container) {
      this.container.innerHTML = `<div class="empty"><i class="fas fa-exclamation-triangle"></i> ${this._escape(message)}</div>`;
    }
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
