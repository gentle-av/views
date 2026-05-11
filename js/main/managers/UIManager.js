export class UIManager {
  constructor(core) {
    this.core = core;
  }

  updateUIForPage(page) {
    const mainContent = document.querySelector(".main-content");
    const headerPlaylistBtn = document.getElementById("headerPlaylistBtn");
    const headerRefreshMetadataBtn = document.getElementById(
      "headerRefreshMetadataBtn",
    );
    const globalSearchBox = document.getElementById("globalSearchBox");
    const searchButton = document.getElementById("searchButton");
    const refreshBtn = document.getElementById("headerRefreshBtn");
    const isAudio = page === "audio";
    const isPower = page === "power";
    if (mainContent) {
      mainContent.classList.toggle("audio-page", isAudio);
      mainContent.classList.toggle("video-page", !isAudio && !isPower);
      mainContent.classList.toggle("power-page", isPower);
    }
    if (headerPlaylistBtn) {
      headerPlaylistBtn.style.display = isAudio ? "flex" : "none";
    }
    if (headerRefreshMetadataBtn) {
      headerRefreshMetadataBtn.style.display = isAudio ? "flex" : "none";
    }
    if (globalSearchBox) {
      globalSearchBox.style.display = "none";
    }
    if (searchButton) {
      searchButton.style.display = isAudio ? "flex" : "none";
    }
    if (refreshBtn) {
      refreshBtn.style.display = "none";
    }
  }

  setupSearchUI(onSearch, onClear) {
    const searchInput = document.getElementById("globalSearchInput");
    const searchClearBtn = document.getElementById("searchClearBtn");
    if (!searchInput) return;
    searchInput.value = "";
    const updateClearButton = () => {
      if (searchClearBtn) {
        const shouldShow =
          searchInput.value.length > 0 &&
          document.activeElement === searchInput;
        searchClearBtn.style.display = shouldShow ? "flex" : "none";
      }
    };

    searchInput.oninput = (e) => {
      if (onSearch) onSearch(e.target.value);
      updateClearButton();
    };
    searchInput.onfocus = () => updateClearButton();
    searchInput.onblur = () => {
      setTimeout(() => {
        if (searchClearBtn && document.activeElement !== searchInput) {
          searchClearBtn.style.display = "none";
        }
      }, 100);
    };
    if (searchClearBtn) {
      searchClearBtn.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        searchInput.value = "";
        if (onClear) onClear();
        updateClearButton();
        searchInput.focus();
        return false;
      };
    }
    updateClearButton();
  }

  showOverlay() {
    let overlay = document.querySelector(".overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "overlay";
      document.body.insertBefore(overlay, document.body.firstChild);
    }
    overlay.classList.add("active");
    overlay.style.display = "block";
  }

  hideOverlay() {
    const overlay = document.querySelector(".overlay");
    if (overlay) {
      overlay.classList.remove("active");
      overlay.style.display = "none";
    }
  }
}
