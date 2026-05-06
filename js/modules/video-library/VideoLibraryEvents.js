export class VideoLibraryEvents {
  constructor(
    api,
    events,
    state,
    dom,
    renderer,
    thumbnailLoader,
    onPlayVideo,
    onLoadDirectory,
  ) {
    this.api = api;
    this.events = events;
    this.state = state;
    this.dom = dom;
    this.renderer = renderer;
    this.thumbnailLoader = thumbnailLoader;
    this.onPlayVideo = onPlayVideo;
    this.onLoadDirectory = onLoadDirectory;
    this._currentContextMenu = null;
  }

  bindEvents() {
    this.events.on("video:delete", (data) => this.onDeleteItem(data));
    this.events.on("navigation:videoPage", () => this.onRefresh());
    this.events.on("video:refresh", () => this.onRefresh());
  }

  attachItemEvents(container) {
    container.querySelectorAll(".item-card").forEach((card) => {
      if (card._eventsAttached) return;
      card._eventsAttached = true;
      const path = card.dataset.path;
      const isDir = card.dataset.isDir === "true";
      const name = card.querySelector(".item-name")?.textContent || "";
      let clickTimeout = null;
      const clickHandler = async (e) => {
        if (e.target.closest(".swipe-delete-btn")) return;
        if (clickTimeout) {
          clearTimeout(clickTimeout);
          clickTimeout = null;
          return;
        }
        clickTimeout = setTimeout(async () => {
          clickTimeout = null;
          if (isDir) {
            await this.onLoadDirectory(path, true);
          } else {
            this.onPlayVideo(path);
          }
        }, 200);
      };
      card.addEventListener("click", clickHandler);
      card._clickHandler = clickHandler;
      this._attachDeleteButton(card, path, name, isDir);
      this._attachContextMenu(card, path, name, isDir);
      this._attachSwipeEvents(card, path, name, isDir);
    });
  }

  _attachDeleteButton(card, path, name, isDir) {
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
          await this.onDeleteItem({ path, name, isDir });
          if (CustomDeleteDialogInstance.close) {
            CustomDeleteDialogInstance.close();
          }
        }
      };
      deleteBtn.addEventListener("click", deleteHandler);
      deleteBtn._deleteHandler = deleteHandler;
    }
  }

  _attachContextMenu(card, path, name, isDir) {
    const contextHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._showContextMenu(e.clientX, e.clientY, path, name, isDir);
    };
    if (!card._contextHandler) {
      card.addEventListener("contextmenu", contextHandler);
      card._contextHandler = contextHandler;
    }
  }

  _attachSwipeEvents(card, path, name, isDir) {
    if (card._swipeAttached) return;
    card._swipeAttached = true;
    let touchStartX = 0;
    let touchMoveX = 0;
    let isSwiping = false;
    const content = card.querySelector(".item-card-content");
    const onTouchStart = (e) => {
      if (e.target.closest(".swipe-delete-btn")) return;
      touchStartX = e.changedTouches[0].clientX;
      isSwiping = false;
      content.style.transition = "none";
    };
    const onTouchMove = (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 10 && !isSwiping) {
        isSwiping = true;
      }
      if (isSwiping && deltaX < 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
        touchMoveX = e.changedTouches[0].clientX;
        const translateX = Math.max(-80, deltaX);
        content.style.transform = `translateX(${translateX}px)`;
      }
    };
    const onTouchEnd = () => {
      if (!isSwiping) {
        content.style.transition = "";
        return;
      }
      const deltaX = touchMoveX - touchStartX;
      content.style.transition = "transform 0.3s ease";
      if (deltaX < -40) {
        card.classList.add("swipe-left");
        content.style.transform = "translateX(-80px)";
      } else {
        card.classList.remove("swipe-left");
        content.style.transform = "translateX(0)";
      }
      setTimeout(() => {
        content.style.transition = "";
      }, 300);
      isSwiping = false;
    };
    const onClickOutside = (e) => {
      if (card.classList.contains("swipe-left") && !card.contains(e.target)) {
        card.classList.remove("swipe-left");
        content.style.transform = "translateX(0)";
      }
    };
    card.addEventListener("touchstart", onTouchStart, { passive: true });
    card.addEventListener("touchmove", onTouchMove, { passive: false });
    card.addEventListener("touchend", onTouchEnd);
    document.addEventListener("click", onClickOutside);
    card._cleanupSwipe = () => {
      card.removeEventListener("touchstart", onTouchStart);
      card.removeEventListener("touchmove", onTouchMove);
      card.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("click", onClickOutside);
    };
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
        await this.onDeleteItem({ path, name, isDir: isDirectory });
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

  async onDeleteItem({ path, name, isDir }) {
    const endpoint = isDir ? "/api/delete-directory" : "/api/trash";
    const response = await this.api.post(endpoint, { path });
    if (response.success) {
      Utils.showNotification(
        `${isDir ? "Папка" : "Файл"} "${name}" ${isDir ? "удалена" : "удален"}`,
        "success",
      );
      this.state.clearCache();
      await this.onLoadDirectory(this.state.getCurrentPath(), false);
    } else {
      Utils.showNotification(response.error || "Ошибка удаления", "error");
    }
  }

  onRefresh() {
    if (this.state.getCurrentPath()) {
      this.state.clearCache();
      this.onLoadDirectory(this.state.getCurrentPath(), false);
      this.renderer.ensureIconsVisible();
      this.dom.adjustBottomPadding();
    }
  }

  cleanup(card) {
    if (card._cleanupSwipe) {
      card._cleanupSwipe();
    }
  }
}
