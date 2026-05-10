export class VideoLibraryRenderer {
  constructor(dom, state) {
    this.dom = dom;
    this.state = state;
  }

  render(items) {
    const container = this.dom.getContainer();
    if (!container) {
      return [];
    }
    const visibleItems = items.filter((item) => !item.name.startsWith("."));
    if (visibleItems.length === 0) {
      this.dom.showEmpty();
      return [];
    }
    const html = visibleItems.map((item) => this._renderItem(item)).join("");
    container.innerHTML = html;
    return visibleItems;
  }

  _renderItem(item) {
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
  }

  ensureIconsVisible() {
    setTimeout(() => {
      const container = this.dom.getContainer();
      if (!container) return;
      const icons = container.querySelectorAll(".thumbnail-placeholder i");
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

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
