export class VideoLibraryThumbnailLoader {
  constructor(api, state) {
    this.api = api;
    this.state = state;
    this.pendingFolderThumbnails = new Map();
    this.folderVideoCache = new Map();
  }

  async loadThumbnail(videoPath, options = {}) {
    const { isFolder = false, folderPath = null } = options;
    const cacheKey = isFolder ? `folder_${folderPath}` : videoPath;
    const cached = this.state.getThumbnail(cacheKey);
    if (cached) {
      console.log(`[loadThumbnail] CACHED for ${cacheKey}`);
      return cached;
    }
    console.log(
      `[loadThumbnail] FETCH for ${videoPath}, isFolder: ${isFolder}, cacheKey: ${cacheKey}`,
    );
    const url = `/api/thumbnail?path=${encodeURIComponent(videoPath)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.success && data.thumbnail) {
        console.log(
          `[loadThumbnail] STORED for ${cacheKey}, thumbnail starts with: ${data.thumbnail.substring(0, 50)}`,
        );
        this.state.setThumbnail(cacheKey, data.thumbnail);
        return data.thumbnail;
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for ${videoPath}:`, error);
    }
    return null;
  }

  async loadVisibleThumbnails(container) {
    const placeholders = container.querySelectorAll(
      ".thumbnail-placeholder[data-video-path]",
    );
    const promises = Array.from(placeholders).map(async (placeholder) => {
      const videoPath = placeholder.dataset.videoPath;
      const thumbnail = await this.loadThumbnail(videoPath);
      if (thumbnail) {
        this._applyThumbnail(placeholder, thumbnail);
      }
    });
    await Promise.all(promises);
  }

  async loadVisibleFolderPreviews(container) {
    const placeholders = container.querySelectorAll(
      ".thumbnail-placeholder.folder-placeholder[data-folder-path]",
    );
    for (const placeholder of placeholders) {
      const folderPath = placeholder.dataset.folderPath;
      if (this.pendingFolderThumbnails.has(folderPath)) {
        const thumbnail = await this.pendingFolderThumbnails.get(folderPath);
        if (thumbnail) {
          this._applyFolderThumbnail(placeholder, thumbnail);
        }
        continue;
      }
      const loadPromise = this._loadFolderThumbnail(folderPath);
      this.pendingFolderThumbnails.set(folderPath, loadPromise);
      try {
        const thumbnail = await loadPromise;
        if (thumbnail) {
          this._applyFolderThumbnail(placeholder, thumbnail);
        }
      } finally {
        this.pendingFolderThumbnails.delete(folderPath);
      }
    }
  }

  async _loadFolderThumbnail(folderPath) {
    console.log(`[_loadFolderThumbnail] Start for: ${folderPath}`);
    if (this.folderVideoCache.has(folderPath)) {
      const videoPath = this.folderVideoCache.get(folderPath);
      console.log(
        `[_loadFolderThumbnail] Cache hit for ${folderPath}: ${videoPath}`,
      );
      if (videoPath) {
        return await this.loadThumbnail(videoPath, {
          isFolder: true,
          folderPath,
        });
      }
      return null;
    }
    console.log(`[_loadFolderThumbnail] Calling api.post for ${folderPath}`);
    const data = await this.api.post(
      "/api/list?path=" + encodeURIComponent(folderPath),
      {},
    );
    console.log(`[_loadFolderThumbnail] Response for ${folderPath}:`, data);
    console.log(`[_loadFolderThumbnail] Items count: ${data.items?.length}`);
    if (data.success && data.items) {
      const firstVideo = data.items.find(
        (item) => !item.isDirectory && item.isVideo,
      );
      console.log(`[_loadFolderThumbnail] First video:`, firstVideo);
      if (firstVideo) {
        this.folderVideoCache.set(folderPath, firstVideo.path);
        const thumbnail = await this.loadThumbnail(firstVideo.path, {
          isFolder: true,
          folderPath,
        });
        console.log(
          `[_loadFolderThumbnail] Got thumbnail for ${folderPath}: ${thumbnail ? thumbnail.substring(0, 100) : "null"}`,
        );
        return thumbnail;
      }
    }
    this.folderVideoCache.set(folderPath, null);
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
