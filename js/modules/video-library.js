class VideoLibrary {
  constructor(apiClient, events, navigationManager) {
    this.api = apiClient;
    this.events = events;
    this.navigation = navigationManager;
    this.currentPath = "/mnt/video";
    this.history = [];
    this.container = document.getElementById("videoContent");
    this.breadcrumbs = document.getElementById("videoBreadcrumbs");
    this.thumbnailCache = new Map();
    this._debounceTimeout = null;
    this._bindEvents();
    this.loadDirectory(this.currentPath, false);
  }

  destroy() {
    if (this.container) {
      this.container.innerHTML = "";
    }
    if (this.thumbnailCache) {
      this.thumbnailCache.clear();
    }
    this.currentPath = null;
    this.history = [];
  }

  _bindEvents() {
    this.events.on("video:delete", (data) =>
      this.deleteItem(data.path, data.name, data.isDir),
    );
    this.events.on("navigation:videoPage", () => this.refresh());
    this.events.on("video:refresh", () => this.refresh());
  }

  async loadDirectory(path, addToHistory = true) {
    console.log("[VideoLibrary] loadDirectory:", path);
    this.currentPath = path;
    if (addToHistory) this.history.push(path);
    this._updateBreadcrumbs();
    this._showLoading();
    const data = await this.api.post("/api/list", { path });
    console.log("[VideoLibrary] list response:", data);
    if (data.success) {
      this._renderContent(data.items);
    } else {
      this._showError(data.error || "Ошибка загрузки");
    }
  }

  async _loadThumbnail(videoPath) {
    if (this.thumbnailCache.has(videoPath)) {
      return this.thumbnailCache.get(videoPath);
    }
    const url = `/api/thumbnail?path=${encodeURIComponent(videoPath)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && data.thumbnail) {
        this.thumbnailCache.set(videoPath, data.thumbnail);
        return data.thumbnail;
      }
    } catch (error) {
      console.error("Failed to load thumbnail:", error);
    }
    return null;
  }

  _renderContent(items) {
    console.log("[VideoLibrary] _renderContent, items count:", items.length);
    const visibleItems = items.filter((item) => !item.name.startsWith("."));
    if (visibleItems.length === 0) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-folder-open"></i> Папка пуста</div>';
      return;
    }
    this.container.innerHTML = visibleItems
      .map((item) => {
        const iconClass = item.isDirectory ? "fa-folder" : "fa-play-circle";
        const placeholderClass = item.isDirectory
          ? "folder-placeholder"
          : "video-placeholder";
        const dataAttr = item.isDirectory
          ? `data-folder-path="${item.path}"`
          : `data-video-path="${item.path}"`;
        return `
          <div class="item-card" data-path="${item.path}" data-is-dir="${item.isDirectory}" data-name="${this._escape(item.name)}">
            <div class="item-card-content">
              <div class="thumbnail-placeholder ${placeholderClass}" ${dataAttr}>
                <i class="fas ${iconClass}" style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; font-size: 20px; position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); border-radius: 6px; z-index: 100; margin: 0; padding: 0;"></i>
              </div>
              <div class="item-name" title="${this._escape(item.name)}">${this._escape(item.name)}</div>
              ${!item.isDirectory ? `<div class="item-size">${item.size || ""}</div>` : ""}
            </div>
            <div class="swipe-actions">
              <button class="swipe-delete-btn" data-path="${item.path}" data-name="${this._escape(item.name)}" data-is-dir="${item.isDirectory}">
                <i class="fas fa-trash-alt"></i>
              </button>
            </div>
          </div>
        `;
      })
      .join("");
    this._attachItemEvents();
    this._loadVisibleThumbnails();
    this._loadVisibleFolderPreviews();
    this._ensureIconsVisible();
    this._adjustBottomPadding();
  }

  _adjustBottomPadding() {
    setTimeout(() => {
      const player = document.querySelector(".universal-bottom-player");
      const contentGrid = this.container;
      if (player && player.classList.contains("active") && contentGrid) {
        const playerHeight = player.offsetHeight;
        contentGrid.style.paddingBottom = playerHeight + 20 + "px";
      } else if (contentGrid) {
        if (window.innerWidth <= 768) {
          contentGrid.style.paddingBottom = "150px";
        } else if (window.innerWidth <= 480) {
          contentGrid.style.paddingBottom = "170px";
        } else {
          contentGrid.style.paddingBottom = "100px";
        }
      }
    }, 100);
  }

  async _loadVisibleThumbnails() {
    const placeholders = this.container.querySelectorAll(
      ".thumbnail-placeholder[data-video-path]",
    );
    for (const placeholder of placeholders) {
      const videoPath = placeholder.dataset.videoPath;
      const thumbnail = await this._loadThumbnail(videoPath);
      if (thumbnail) {
        placeholder.style.backgroundImage = `url('${thumbnail}')`;
        placeholder.style.backgroundSize = "cover";
        placeholder.style.backgroundPosition = "center";
        const icon = placeholder.querySelector("i");
        if (icon) {
          icon.style.display = "flex";
          icon.style.position = "absolute";
          icon.style.bottom = "8px";
          icon.style.left = "8px";
          icon.style.background = "rgba(0, 0, 0, 0.7)";
          icon.style.borderRadius = "6px";
          icon.style.padding = "6px";
          icon.style.zIndex = "100";
          icon.style.width = "auto";
          icon.style.height = "auto";
          icon.style.fontSize = "20px";
          if (icon.classList.contains("fa-play-circle")) {
            icon.style.color = "#3498db";
          } else {
            icon.style.color = "#f39c12";
          }
        }
      }
    }
  }

  _attachItemEvents() {
    console.log("[VideoLibrary] _attachItemEvents");
    this.container.querySelectorAll(".item-card").forEach((card) => {
      if (card._eventsAttached) return;
      card._eventsAttached = true;
      const path = card.dataset.path;
      const isDir = card.dataset.isDir === "true";
      const name = card.querySelector(".item-name")?.textContent || "";
      let clickTimeout = null;
      const clickHandler = async (e) => {
        if (e.target.closest(".swipe-delete-btn")) {
          console.log("[VideoLibrary] Delete button clicked, ignoring");
          return;
        }
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
          return;
        }
        clickTimeout = setTimeout(async () => {
          clickTimeout = null;
          if (isDir) {
            console.log("[VideoLibrary] Loading directory:", path);
            await this.loadDirectory(path, true);
          } else {
            console.log("[VideoLibrary] Emitting video:play event for:", path);
            this.events.emit("video:play", path);
          }
        }, 200);
      };
      card.addEventListener("click", clickHandler);
      card._clickHandler = clickHandler;
      const deleteBtn = card.querySelector(".swipe-delete-btn");
      if (deleteBtn && !deleteBtn._handlerAdded) {
        deleteBtn._handlerAdded = true;
        const deleteHandler = async (e) => {
          e.stopPropagation();
          console.log("[VideoLibrary] Delete button clicked for:", name);
          const confirmed = await CustomDeleteDialogInstance.showConfirm(
            name,
            isDir,
          );
          if (confirmed) {
            await this.deleteItem(path, name, isDir);
            if (CustomDeleteDialogInstance.close) {
              CustomDeleteDialogInstance.close();
            }
          }
        };
        deleteBtn.addEventListener("click", deleteHandler);
        deleteBtn._deleteHandler = deleteHandler;
      }
      const contextHandler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._showContextMenu(e.clientX, e.clientY, path, name, isDir);
      };
      if (!card._contextHandler) {
        card.addEventListener("contextmenu", contextHandler);
        card._contextHandler = contextHandler;
      }
    });
  }

  _showContextMenu(x, y, path, name, isDirectory) {
    this._hideContextMenu();
    const menu = document.createElement("div");
    menu.className = "context-menu";
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.innerHTML = `<div class="context-menu-item delete-item" data-action="delete"><i class="fas fa-trash-alt"></i><span>Удалить</span></div>`;
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
        await this.deleteItem(path, name, isDirectory);
        if (CustomDeleteDialogInstance.close) {
          CustomDeleteDialogInstance.close();
        }
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

  async deleteItem(path, name, isDirectory) {
    const response = await this.api.post("/api/trash", { path });
    if (response.success) {
      Utils.showNotification(
        `${isDirectory ? "Папка" : "Файл"} "${name}" ${isDirectory ? "удалена" : "удален"}`,
        "success",
      );
      this.thumbnailCache.clear();
      await this.loadDirectory(this.currentPath, false);
    } else {
      Utils.showNotification(response.error || "Ошибка удаления", "error");
    }
  }

  refresh() {
    if (this.currentPath) {
      this.thumbnailCache.clear();
      this.loadDirectory(this.currentPath, false);
      this._ensureIconsVisible();
      this._adjustBottomPadding();
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

  async _getFirstVideoInFolder(folderPath) {
    const data = await this.api.post("/api/list", { path: folderPath });
    if (data.success) {
      const firstVideo = data.items.find(
        (item) => !item.isDirectory && item.isVideo,
      );
      if (firstVideo) {
        return firstVideo.path;
      }
    }
    return null;
  }

  _ensureIconsVisible() {
    setTimeout(() => {
      const icons = this.container.querySelectorAll(".thumbnail-placeholder i");
      icons.forEach((icon) => {
        if (icon.style.display === "none" || !icon.style.display) {
          icon.style.display = "flex";
          icon.style.position = "absolute";
          icon.style.bottom = "8px";
          icon.style.left = "8px";
          icon.style.background = "rgba(0, 0, 0, 0.7)";
          icon.style.borderRadius = "6px";
          icon.style.padding = "6px";
          icon.style.zIndex = "100";
          icon.style.width = "auto";
          icon.style.height = "auto";
          icon.style.fontSize = "20px";

          if (icon.classList.contains("fa-folder")) {
            icon.style.color = "#f39c12";
          } else if (icon.classList.contains("fa-play-circle")) {
            icon.style.color = "#3498db";
          }
        }
      });
    }, 50);
  }

  async _loadVisibleFolderPreviews() {
    const placeholders = this.container.querySelectorAll(
      ".thumbnail-placeholder.folder-placeholder[data-folder-path]",
    );
    for (const placeholder of placeholders) {
      const folderPath = placeholder.dataset.folderPath;
      const firstVideoPath = await this._getFirstVideoInFolder(folderPath);
      if (firstVideoPath) {
        const thumbnail = await this._loadThumbnail(firstVideoPath);
        if (thumbnail) {
          placeholder.style.backgroundImage = `url('${thumbnail}')`;
          placeholder.style.backgroundSize = "cover";
          placeholder.style.backgroundPosition = "center";
          const icon = placeholder.querySelector("i");
          if (icon) {
            icon.style.display = "flex";
            icon.style.position = "absolute";
            icon.style.bottom = "8px";
            icon.style.left = "8px";
            icon.style.background = "rgba(0, 0, 0, 0.7)";
            icon.style.borderRadius = "6px";
            icon.style.padding = "6px";
            icon.style.zIndex = "100";
            icon.style.width = "auto";
            icon.style.height = "auto";
            icon.style.fontSize = "20px";
            icon.style.color = "#f39c12"; // Цвет для папки
          }
        }
      }
    }
  }

  goBack() {
    if (this.history.length > 1) {
      this.history.pop();
      const previousPath = this.history[this.history.length - 1];
      this.loadDirectory(previousPath, false);
    }
  }

  getCurrentPath() {
    return this.currentPath;
  }

  async refreshCurrentDirectory() {
    await this.loadDirectory(this.currentPath, false);
  }
}
