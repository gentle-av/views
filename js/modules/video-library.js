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
    this._bindEvents();
    this.loadDirectory(this.currentPath, false);
  }

  destroy() {
    console.log("[VideoLibrary] destroy called");
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.thumbnailCache.clear();
    this.currentPath = null;
    this.history = [];
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
    const visibleItems = items.filter((item) => !item.name.startsWith("."));
    if (visibleItems.length === 0) {
      this.container.innerHTML =
        '<div class="empty"><i class="fas fa-folder-open"></i> Папка пуста</div>';
      return;
    }
    this.container.innerHTML = visibleItems
      .map(
        (item) => `
    <div class="item-card" data-path="${item.path}" data-is-dir="${item.isDirectory}" data-name="${this._escape(item.name)}">
        <div class="item-card-content">
            ${
              item.isDirectory
                ? `<div class="thumbnail-placeholder folder-placeholder" data-folder-path="${item.path}" style="background-image: url(''); background-size: cover; background-position: center;">
                    <i class="fas fa-folder folder-icon"></i>
                  </div>`
                : `<div class="thumbnail-placeholder video-placeholder" data-video-path="${item.path}" style="background-image: url(''); background-size: cover; background-position: center;">
                    <i class="fas fa-play-circle video-icon-loading"></i>
                  </div>`
            }
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
    this._loadVisibleThumbnails();
    this._loadVisibleFolderPreviews();
  }

  async _loadVisibleThumbnails() {
    const placeholders = this.container.querySelectorAll(
      ".thumbnail-placeholder[data-video-path]",
    );
    for (const placeholder of placeholders) {
      const videoPath = placeholder.dataset.videoPath;
      const thumbnail = await this._loadThumbnail(videoPath);
      if (thumbnail && placeholder.parentElement) {
        placeholder.style.backgroundImage = `url('${thumbnail}')`;
        placeholder.style.backgroundSize = "cover";
        placeholder.style.backgroundPosition = "center";
      }
    }
  }

  _attachItemEvents() {
    this.container.querySelectorAll(".item-card").forEach((card) => {
      if (card._eventsAttached) return;
      card._eventsAttached = true;
      const path = card.dataset.path;
      const isDir = card.dataset.isDir === "true";
      const name = card.querySelector(".item-name")?.textContent || "";
      const clickHandler = async (e) => {
        if (e.target.closest(".swipe-delete-btn")) return;
        if (isDir) {
          await this.loadDirectory(path, true);
        } else {
          this.events.emit("video:play", path);
        }
      };
      card.addEventListener("click", clickHandler);
      card._clickHandler = clickHandler;
      const deleteBtn = card.querySelector(".swipe-delete-btn");
      if (deleteBtn && !deleteBtn._handlerAdded) {
        deleteBtn._handlerAdded = true;
        const deleteHandler = async (e) => {
          e.stopPropagation();
          const confirmed = await CustomDeleteDialogInstance.showConfirm(
            name,
            isDir,
          );
          if (confirmed) {
            this.events.emit("video:delete", { path, name, isDir });
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

  async playVideo(path) {
    if (this._playingNow === path) {
      console.log("playVideo ignored - already playing this file:", path);
      return;
    }
    this._playingNow = path;
    console.log("playVideo called with path:", path);
    this.events.emit("playback:videoStart", path);
    setTimeout(() => {
      this._playingNow = null;
    }, 1000);
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

  async _loadFolderThumbnail(folderPath, placeholder) {
    const videoPath = await this._getFirstVideoInFolder(folderPath);
    if (videoPath) {
      const thumbnail = await this._loadThumbnail(videoPath);
      if (thumbnail) {
        placeholder.style.backgroundImage = `url('${thumbnail}')`;
        placeholder.style.backgroundSize = "cover";
        placeholder.style.backgroundPosition = "center";
      }
    }
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
        }
      }
    }
  }
}
