import { MediaCenter } from "./main/MediaCenter.js";

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.mediaCenter = new MediaCenter();
    window.mediaCenter.init();
  });
} else {
  window.mediaCenter = new MediaCenter();
  window.mediaCenter.init();
}
