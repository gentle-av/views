export class PlayerUIUpdater {
  constructor(dom, progress) {
    this.dom = dom;
    this.progress = progress;
  }

  updateTrackInfo(title, artist) {
    const trackName = this.dom.get("universalBottomTrackName");
    const trackArtist = this.dom.get("universalBottomTrackArtist");
    if (trackName && title) {
      trackName.textContent = this._escape(title);
    }
    if (trackArtist) {
      trackArtist.textContent = artist ? this._escape(artist) : "";
      trackArtist.style.display = artist ? "block" : "none";
    }
  }

  updateFileInfo(path) {
    const trackName = this.dom.get("universalBottomTrackName");
    if (!trackName) return;

    if (!path) {
      trackName.textContent = "—";
      return;
    }
    let fileName = path.split("/").pop();
    fileName = fileName.replace(
      /\.(flac|mp3|m4a|wav|ogg|aac|mkv|mp4|avi)$/i,
      "",
    );
    const match = fileName.match(/^\d+\s*[-.]?\s*(.+)$/);
    if (match) fileName = match[1];
    trackName.textContent = this._escape(fileName);
  }

  updateTrackFullInfo(title, artist, coverUrl) {
    console.log("[DEBUG] updateTrackFullInfo called:", {
      title,
      artist,
      coverUrl: coverUrl ? "exists" : "null",
    });
    const trackName = this.dom.get("universalBottomTrackName");
    console.log("[DEBUG] trackName element:", trackName);
    if (trackName && title) {
      let trackTitle = title;
      const match = trackTitle.match(/^\d+\s*[-.]?\s*(.+)$/);
      if (match) trackTitle = match[1];
      trackName.textContent = this._escape(trackTitle);
      console.log("[DEBUG] trackName set to:", trackName.textContent);
    }
    const trackArtist = this.dom.get("universalBottomTrackArtist");
    console.log("[DEBUG] trackArtist element:", trackArtist);
    if (trackArtist) {
      trackArtist.textContent = artist ? this._escape(artist) : "";
      trackArtist.style.display = artist ? "block" : "none";
      console.log(
        "[DEBUG] trackArtist set to:",
        trackArtist.textContent,
        "display:",
        trackArtist.style.display,
      );
    }
    if (coverUrl) {
      console.log("[DEBUG] calling showPreviewImage with coverUrl");
      this.showPreviewImage(coverUrl);
    } else {
      console.log("[DEBUG] no coverUrl provided");
    }
  }

  updatePlayPauseButton(isPlaying) {
    const btn = this.dom.get("universalBottomPlayPauseBtn");
    if (btn) {
      btn.innerHTML = isPlaying
        ? '<i class="fas fa-pause"></i>'
        : '<i class="fas fa-play"></i>';
    }
  }

  updateMediaIcon(mediaType) {
    const previewIcon = this.dom.get("universalBottomPreviewIcon");
    if (previewIcon) {
      previewIcon.className =
        mediaType === "video" ? "fas fa-video" : "fas fa-music";
    }
  }

  updateTrackCount(currentIndex, totalTracks) {
    const trackCount = this.dom.get("universalBottomTrackCount");
    if (trackCount && currentIndex !== undefined && totalTracks !== undefined) {
      trackCount.textContent = `${currentIndex + 1}/${totalTracks}`;
    }
  }

  showPreviewImage(src) {
    const previewImg = this.dom.get("universalBottomPreviewImg");
    const previewIcon = this.dom.get("universalBottomPreviewIcon");
    if (previewImg && previewIcon) {
      if (this._currentPreviewUrl && this._currentPreviewUrl !== src) {
        URL.revokeObjectURL(this._currentPreviewUrl);
      }
      previewImg.src = src;
      previewImg.style.display = "block";
      previewIcon.style.display = "none";
      this._currentPreviewUrl = src;
    }
  }

  hidePreviewImage() {
    const previewImg = this.dom.get("universalBottomPreviewImg");
    const previewIcon = this.dom.get("universalBottomPreviewIcon");
    if (previewImg) {
      if (this._currentPreviewUrl) {
        URL.revokeObjectURL(this._currentPreviewUrl);
        this._currentPreviewUrl = null;
      }
      previewImg.src = "";
      previewImg.style.display = "none";
    }
    if (previewIcon) {
      previewIcon.style.display = "flex";
      previewIcon.className = "fas fa-play-circle";
    }
  }

  reset() {
    this.updateFileInfo(null);
    this.updateTrackInfo("—", "", "");
    this.hidePreviewImage();
    this.updatePlayPauseButton(false);
    this.progress.reset();
  }

  toggleMinimize(isMinimized) {
    const minimizeBar = this.dom.get("universalMinimizeBar");
    if (minimizeBar) {
      minimizeBar.innerHTML = isMinimized
        ? '<i class="fas fa-chevron-up"></i>'
        : '<i class="fas fa-chevron-down"></i>';
    }
    if (isMinimized) {
      this.dom.addClass("minimized");
    } else {
      this.dom.removeClass("minimized");
    }
  }

  toggleSettings(isCollapsed) {
    const settings = this.dom.get("universalBottomSettings");
    const toggle = this.dom.get("universalBottomSettingsToggle");
    if (settings) {
      if (isCollapsed) {
        settings.classList.add("collapsed");
      } else {
        settings.classList.remove("collapsed");
      }
    }
    if (toggle) {
      if (isCollapsed) {
        toggle.classList.add("collapsed");
      } else {
        toggle.classList.remove("collapsed");
      }
    }
  }

  _escape(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
}
