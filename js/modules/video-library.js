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
    console.log("[VideoLibrary] destroy called");
    if (this.container) {
      this.container.innerHTML = "";
    }
    if (this.thumbnailCache) {
      this.thumbnailCache.clear();
    }
    if (this.activeVideos) {
      this.activeVideos.clear();
    }
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

  playVideo(path) {
    if (this._debounceTimeout) {
      clearTimeout(this._debounceTimeout);
    }
    this._debounceTimeout = setTimeout(() => {
      this._executePlayVideo(path);
    }, 300);
  }

  async _executePlayVideo(path) {
    if (this.activeVideos && this.activeVideos.has(path)) {
      console.log("playVideo ignored - video already playing:", path);
      return;
    }
    if (!this.activeVideos) {
      this.activeVideos = new Set();
    }
    const onClose = () => {
      console.log("video closed, removing from active set:", path);
      if (this.activeVideos) {
        this.activeVideos.delete(path);
      }
      this.events.off("playback:videoClose", onClose);
      this.events.off("playback:timeUpdate", onTimeUpdate);
    };
    const onTimeUpdate = (currentTime, duration) => {
      if (currentTime === 0 && (duration === 0 || duration === undefined)) {
        console.log("triggering closeWindow");
        // this.events.emit("playback:closeWindow");
        this.activeVideos.delete(path);
        this.events.off("playback:videoClose", onClose);
        this.events.off("playback:timeUpdate", onTimeUpdate);
      }
    };
    this.events.on("playback:videoClose", onClose);
    this.events.on("playback:timeUpdate", onTimeUpdate);
    this.activeVideos.add(path);
    console.log("playVideo called with path:", path);
    this.events.emit("playback:videoStart", path);
    setTimeout(() => {
      if (this.activeVideos && this.activeVideos.has(path)) {
        this.activeVideos.delete(path);
      }
      this.events.off("playback:timeUpdate", onTimeUpdate);
    }, 3600000);
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

  goBack() {
    if (this.history.length > 1) {
      this.history.pop();
      const previousPath = this.history[this.history.length - 1];
      this.loadDirectory(previousPath, false);
    }
  }

  async renameItem(path, name, isDirectory) {
    const newName = prompt(
      `Введите новое имя для ${isDirectory ? "папки" : "файла"}:`,
      name,
    );
    if (!newName || newName === name) return;

    const dirPath = path.substring(0, path.lastIndexOf("/"));
    const newPath = dirPath + "/" + newName;

    const response = await this.api.post("/api/rename", { path, newPath });
    if (response.success) {
      Utils.showNotification(
        `${isDirectory ? "Папка" : "Файл"} переименован в "${newName}"`,
        "success",
      );
      this.thumbnailCache.clear();
      await this.loadDirectory(this.currentPath, false);
    } else {
      Utils.showNotification(
        response.error || "Ошибка переименования",
        "error",
      );
    }
  }

  async copyItem(path, name, isDirectory) {
    const response = await this.api.post("/api/copy", { path });
    if (response.success) {
      Utils.showNotification(
        `${isDirectory ? "Папка" : "Файл"} "${name}" скопирован`,
        "success",
      );
      this.thumbnailCache.clear();
      await this.loadDirectory(this.currentPath, false);
    } else {
      Utils.showNotification(response.error || "Ошибка копирования", "error");
    }
  }

  async moveItem(path, name, isDirectory) {
    const targetPath = prompt("Введите путь назначения:", "/mnt/video/");
    if (!targetPath) return;

    const response = await this.api.post("/api/move", {
      path,
      newPath: targetPath + "/" + name,
    });
    if (response.success) {
      Utils.showNotification(
        `${isDirectory ? "Папка" : "Файл"} "${name}" перемещен`,
        "success",
      );
      this.thumbnailCache.clear();
      await this.loadDirectory(this.currentPath, false);
    } else {
      Utils.showNotification(response.error || "Ошибка перемещения", "error");
    }
  }

  clearHistory() {
    this.history = [this.currentPath];
  }

  getCurrentPath() {
    return this.currentPath;
  }

  async refreshCurrentDirectory() {
    await this.loadDirectory(this.currentPath, false);
  }
}
