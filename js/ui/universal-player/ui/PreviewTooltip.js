export class PreviewTooltip {
  constructor(dom, api) {
    this.dom = dom;
    this.api = api;
    this.tooltip = null;
    this.isVisible = false;
    this.currentPath = null;
    this.hideTimeout = null;
    this.showTimeout = null;
    this.init();
  }

  init() {
    this.createTooltipElement();
    this.attachEvents();
  }

  createTooltipElement() {
    this.tooltip = document.createElement("div");
    this.tooltip.className = "universal-player-preview-tooltip";
    this.tooltip.innerHTML = `
      <div class="preview-tooltip-content">
        <div class="preview-tooltip-image-container">
          <img class="preview-tooltip-image" alt="Preview" />
          <div class="preview-tooltip-loading">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
        </div>
        <div class="preview-tooltip-info">
          <div class="preview-tooltip-title"></div>
          <div class="preview-tooltip-artist"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.tooltip);
    this.tooltipImage = this.tooltip.querySelector(".preview-tooltip-image");
    this.tooltipLoading = this.tooltip.querySelector(
      ".preview-tooltip-loading",
    );
    this.tooltipTitle = this.tooltip.querySelector(".preview-tooltip-title");
    this.tooltipArtist = this.tooltip.querySelector(".preview-tooltip-artist");
  }

  attachEvents() {
    const previewContainer = this.dom.get("universalBottomPreview");
    const altContainer = document.querySelector(
      ".universal-bottom-player-preview",
    );
    const targetContainer = previewContainer || altContainer;
    if (!targetContainer) return;

    let hoverTimer = null;

    targetContainer.addEventListener("mouseenter", (e) => {
      clearTimeout(this.hideTimeout);
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(() => {
        this.show(targetContainer);
      }, 300);
    });

    targetContainer.addEventListener("mouseleave", () => {
      clearTimeout(hoverTimer);
      clearTimeout(this.showTimeout);
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, 200);
    });
  }

  async show(targetElement) {
    if (this.isVisible) return;
    const currentFile = this.getCurrentFile();
    if (!currentFile) return;
    this.currentPath = currentFile;
    this.isVisible = true;
    this.tooltip.classList.add("visible");
    this.tooltipLoading.style.display = "flex";
    this.tooltipImage.style.display = "none";
    this.updateTrackInfo();
    await this.loadPreview(currentFile);
    this.updatePositionFromElement(targetElement);
  }

  getCurrentFile() {
    if (window.universalPlayerInstance?.core?.currentFile) {
      return window.universalPlayerInstance.core.currentFile;
    }
    const trackName = this.dom.get("universalBottomTrackName");
    const previewImg = this.dom.get("universalBottomPreviewImg");
    if (previewImg && previewImg.style.display === "block" && previewImg.src) {
      return previewImg.src;
    }
    if (trackName && trackName.textContent !== "—") {
      return trackName.textContent;
    }
    return null;
  }

  async loadPreview(filePath) {
    try {
      let imageUrl = null;
      const previewImg = this.dom.get("universalBottomPreviewImg");
      if (
        previewImg &&
        previewImg.style.display === "block" &&
        previewImg.src
      ) {
        imageUrl = previewImg.src;
      } else if (this.api && this.api.getAlbumCover) {
        imageUrl = await this.api.getAlbumCover(filePath, "", "");
      }
      if (imageUrl) {
        const img = new Image();
        img.onload = () => {
          this.tooltipImage.src = imageUrl;
          this.tooltipImage.style.display = "block";
          this.tooltipLoading.style.display = "none";
        };
        img.onerror = () => {
          this.showPlaceholder();
        };
        img.src = imageUrl;
      } else {
        this.showPlaceholder();
      }
    } catch (error) {
      this.showPlaceholder();
    }
  }

  showPlaceholder() {
    this.tooltipImage.style.display = "none";
    this.tooltipLoading.style.display = "none";
    const placeholder = document.createElement("div");
    placeholder.className = "preview-tooltip-placeholder";
    placeholder.innerHTML = '<i class="fas fa-play-circle"></i>';
    const existingPlaceholder = this.tooltip.querySelector(
      ".preview-tooltip-placeholder",
    );
    if (existingPlaceholder) {
      existingPlaceholder.remove();
    }
    this.tooltipImage.parentElement.appendChild(placeholder);
  }

  updateTrackInfo() {
    const trackName = this.dom.get("universalBottomTrackName");
    const trackArtist = this.dom.get("universalBottomTrackArtist");
    if (trackName && this.tooltipTitle) {
      let title = trackName.textContent;
      if (title && title.length > 50) title = title.slice(0, 47) + "...";
      this.tooltipTitle.textContent = title || "—";
    }
    if (trackArtist && trackArtist.textContent && this.tooltipArtist) {
      let artist = trackArtist.textContent;
      if (artist && artist.length > 50) artist = artist.slice(0, 47) + "...";
      this.tooltipArtist.textContent = artist;
      this.tooltipArtist.style.display = "block";
    } else if (this.tooltipArtist) {
      this.tooltipArtist.style.display = "none";
    }
  }

  updatePositionFromElement(element) {
    if (!this.tooltip || !element) return;
    const rect = element.getBoundingClientRect();
    let left = rect.right + 15;
    let top = rect.top - 50;
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    if (left + tooltipRect.width > viewportWidth - 10) {
      left = rect.left - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > viewportHeight - 10) {
      top = viewportHeight - tooltipRect.height - 10;
    }
    if (top < 10) {
      top = 10;
    }
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
  }

  hide() {
    if (!this.isVisible) return;
    this.isVisible = false;
    this.currentPath = null;
    this.tooltip.classList.remove("visible");
    this.tooltipImage.src = "";
    this.tooltipImage.style.display = "none";
  }

  destroy() {
    this.hide();
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
    }
    this.tooltip = null;
  }
}
