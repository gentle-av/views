export class VideoLibraryThumbnailLoader {
  constructor(api, state) {
    this.api = api;
    this.state = state;
    this.pendingFolderThumbnails = new Map();
    this.folderVideoCache = new Map();
    this.debug = false;
  }
  _getStableRepresentative(videos, folderPath) {
    if (!videos || videos.length === 0) return null;
    const sorted = [...videos].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (nameA.includes("episode") && !nameB.includes("episode")) return -1;
      if (!nameA.includes("episode") && nameB.includes("episode")) return 1;
      if (nameA.includes("season") && !nameB.includes("season")) return -1;
      if (!nameA.includes("season") && nameB.includes("season")) return 1;
      return nameA.localeCompare(nameB);
    });
    return sorted[0];
  }

  async loadThumbnail(videoPath, options = {}) {
    const { isFolder = false, folderPath = null } = options;
    const cacheKey = isFolder ? `folder_${folderPath}` : videoPath;
    const cached = this.state.getThumbnail(cacheKey);
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch("/api/thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: videoPath, width: 320, quality: 85 }),
      });
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (data.success && data.thumbnail) {
        this.state.setThumbnail(cacheKey, data.thumbnail);
        return data.thumbnail;
      }
      if (data.use_icon) {
      }
    } catch (error) {}
    return null;
  }

  async loadVisibleThumbnails(container) {
    const placeholders = container.querySelectorAll(
      ".thumbnail-placeholder[data-video-path]",
    );
    const promises = Array.from(placeholders).map(async (placeholder) => {
      const videoPath = placeholder.dataset.videoPath;
      const thumbnail = await this.loadThumbnail(videoPath);
      if (thumbnail) this._applyThumbnail(placeholder, thumbnail);
    });
    await Promise.all(promises);
  }

  async loadVisibleFolderPreviews(container) {
    const placeholders = container.querySelectorAll(
      ".thumbnail-placeholder.folder-placeholder[data-folder-path]",
    );
    for (const placeholder of placeholders) {
      const folderPath = placeholder.dataset.folderPath;
      if (!folderPath) continue;
      if (this.pendingFolderThumbnails.has(folderPath)) {
        const thumbnail = await this.pendingFolderThumbnails.get(folderPath);
        if (thumbnail) this._applyFolderThumbnail(placeholder, thumbnail);
        continue;
      }
      const loadPromise = this._loadFolderThumbnail(folderPath);
      this.pendingFolderThumbnails.set(folderPath, loadPromise);
      try {
        const thumbnail = await loadPromise;
        if (thumbnail) this._applyFolderThumbnail(placeholder, thumbnail);
      } finally {
        this.pendingFolderThumbnails.delete(folderPath);
      }
    }
  }

  async _loadFolderThumbnail(folderPath) {
    const cacheKey = `folder_videos_${folderPath}`;
    if (this.folderVideoCache.has(cacheKey)) {
      const videoPath = this.folderVideoCache.get(cacheKey);
      if (videoPath) {
        return await this.loadThumbnail(videoPath, {
          isFolder: true,
          folderPath,
        });
      }
      return null;
    }
    try {
      const response = await fetch("/api/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath }),
      });
      const data = await response.json();
      if (data.success && data.items) {
        const videoFiles = data.items.filter(
          (item) => !item.isDirectory && item.isVideo,
        );
        if (videoFiles.length > 0) {
          const representative = this._getStableRepresentative(
            videoFiles,
            folderPath,
          );
          this.folderVideoCache.set(cacheKey, representative.path);
          const thumbnail = await this.loadThumbnail(representative.path, {
            isFolder: true,
            folderPath,
          });
          return thumbnail;
        }
      }
    } catch (error) {}
    this.folderVideoCache.set(cacheKey, null);
    return null;
  }

  _applyThumbnail(placeholder, thumbnail) {
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

  _applyFolderThumbnail(placeholder, thumbnail) {
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
      icon.style.color = "#f39c12";
    }
  }
}
