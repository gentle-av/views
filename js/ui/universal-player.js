import { UniversalPlayer } from "./universal-player/UniversalPlayer.js";

window.UniversalPlayer = UniversalPlayer;

if (typeof window !== "undefined" && !window.universalPlayerInstance) {
  window.universalPlayerInstance = null;
}

export { UniversalPlayer };
export default UniversalPlayer;
