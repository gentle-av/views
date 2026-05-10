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
    getVideoCloseModal,
  ) {
    this.api = api;
    this.events = events;
    this.state = state;
    this.dom = dom;
    this.renderer = renderer;
    this.thumbnailLoader = thumbnailLoader;
    this.onPlayVideo = onPlayVideo;
    this.onLoadDirectory = onLoadDirectory;
    this.getVideoCloseModal = getVideoCloseModal;
    this._currentContextMenu = null;
  }

  bindEvents() {
    this.events.on("video:delete", (data) => this.onDeleteItem(data));
    this.events.on("navigation:videoPage", () => this.onRefresh());
    this.events.on("video:refresh", () => this.onRefresh());
    this.events.on("player:closeVideo", async (videoPath) => {
      const modal = this.getVideoCloseModal();
      if (modal) {
        await modal.show(videoPath);
      }
    });
  }

  attachItemEvents(container) {
    if (!container) return;
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
        if (
          window.deleteDialog &&
          typeof window.deleteDialog.showConfirm === "function"
        ) {
          const confirmed = await window.deleteDialog.showConfirm(name, isDir);
          if (confirmed) {
            await this.onDeleteItem({ path, name, isDir: isDir });
          }
        } else {
          const confirmed = confirm(
            `Удалить ${isDir ? "папку" : "файл"} "${name}"?`,
          );
          if (confirmed) {
            await this.onDeleteItem({ path, name, isDir: isDir });
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
    let swipeThresholdReached = false;
    const content = card.querySelector(".item-card-content");
    const swipeActions = card.querySelector(".swipe-actions");
    const onTouchStart = (e) => {
      if (e.target.closest(".swipe-delete-btn")) return;
      touchStartX = e.changedTouches[0].clientX;
      isSwiping = false;
      swipeThresholdReached = false;
      if (content) {
        content.style.transition = "none";
      }
    };
    const onTouchMove = (e) => {
      const deltaX = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) > 10 && !isSwiping) {
        isSwiping = true;
      }
      if (isSwiping && deltaX < 0 && content) {
        if (e.cancelable) {
          e.preventDefault();
        }
        touchMoveX = e.changedTouches[0].clientX;
        const translateX = Math.max(-80, deltaX);
        content.style.transform = `translateX(${translateX}px)`;
        if (swipeActions && deltaX < -30) {
          swipeActions.style.opacity = "1";
          swipeActions.style.visibility = "visible";
          swipeThresholdReached = true;
        }
      }
    };
    const onTouchEnd = () => {
      if (!content) return;
      if (!isSwiping) {
        content.style.transition = "";
        return;
      }
      const deltaX = touchMoveX - touchStartX;
      content.style.transition = "transform 0.3s ease";
      if (deltaX < -40) {
        card.classList.add("swipe-left");
        content.style.transform = "translateX(-80px)";
        if (swipeActions) {
          swipeActions.style.opacity = "1";
          swipeActions.style.visibility = "visible";
        }
      } else {
        card.classList.remove("swipe-left");
        content.style.transform = "translateX(0)";
        if (swipeActions) {
          swipeActions.style.opacity = "0";
          swipeActions.style.visibility = "hidden";
        }
      }
      setTimeout(() => {
        if (content) {
          content.style.transition = "";
        }
      }, 300);

      isSwiping = false;
      swipeThresholdReached = false;
    };
    const onClickOutside = (e) => {
      if (card.classList.contains("swipe-left") && !card.contains(e.target)) {
        card.classList.remove("swipe-left");
        if (content) {
          content.style.transform = "translateX(0)";
        }
        if (swipeActions) {
          swipeActions.style.opacity = "0";
          swipeActions.style.visibility = "hidden";
        }
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
      if (
        window.deleteDialog &&
        typeof window.deleteDialog.showConfirm === "function"
      ) {
        const confirmed = await window.deleteDialog.showConfirm(
          name,
          isDirectory,
        );
        if (confirmed) {
          await this.onDeleteItem({ path, name, isDir: isDirectory });
        }
      } else {
        const confirmed = confirm(
          `Удалить ${isDirectory ? "папку" : "файл"} "${name}"?`,
        );
        if (confirmed) {
          await this.onDeleteItem({ path, name, isDir: isDirectory });
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
    if (response && response.success) {
      if (typeof Utils !== "undefined" && Utils.showNotification) {
        Utils.showNotification(
          `${isDir ? "Папка" : "Файл"} "${name}" ${isDir ? "удалена" : "удален"}`,
          "success",
        );
      }
      this.state.clearCache();
      await this.onLoadDirectory(this.state.getCurrentPath(), false);
    } else {
      const errorMsg = response?.error || "Ошибка удаления";
      if (typeof Utils !== "undefined" && Utils.showNotification) {
        Utils.showNotification(errorMsg, "error");
      } else {
      }
    }
  }

  onRefresh() {
    if (this.state.getCurrentPath()) {
      this.state.clearCache();
      this.onLoadDirectory(this.state.getCurrentPath(), false);
      if (this.renderer) {
        this.renderer.ensureIconsVisible();
      }
      if (this.dom) {
        this.dom.adjustBottomPadding();
      }
    }
  }

  cleanup(card) {
    if (card._cleanupSwipe) {
      card._cleanupSwipe();
    }
  }
}
