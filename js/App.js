import { MediaCenter } from "./main/MediaCenter.js";
import RefreshButtonManager from "./services/RefreshManager.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.mediaCenter = new MediaCenter();
    window.mediaCenter.init();
    window.refreshManager = new RefreshButtonManager();
  });
} else {
  window.mediaCenter = new MediaCenter();
  window.mediaCenter.init();
  window.refreshManager = new RefreshButtonManager();
}
