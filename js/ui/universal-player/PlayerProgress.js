export class PlayerProgress {
  constructor(dom) {
    this.dom = dom;
    this.duration = 0;
    this.currentTime = 0;
  }

  update(currentTime, duration) {
    this.currentTime = currentTime;
    this.duration = duration;
    const progressFill = this.dom.get("universalBottomProgressFill");
    if (progressFill && duration > 0) {
      progressFill.style.width = `${(currentTime / duration) * 100}%`;
    }
    this._updateTimeDisplay(currentTime, duration);
  }

  _updateTimeDisplay(currentTime, duration) {
    const timeCurrent = this.dom.get("universalBottomCurrentTime");
    const timeTotal = this.dom.get("universalBottomDuration");
    if (timeCurrent) {
      timeCurrent.textContent = this._formatTime(currentTime);
    }
    if (timeTotal) {
      timeTotal.textContent =
        duration > 0 ? this._formatTime(duration) : "0:00";
    }
  }

  reset() {
    this.currentTime = 0;
    this.duration = 0;
    const progressFill = this.dom.get("universalBottomProgressFill");
    const timeCurrent = this.dom.get("universalBottomCurrentTime");
    const timeTotal = this.dom.get("universalBottomDuration");
    if (progressFill) progressFill.style.width = "0%";
    if (timeCurrent) timeCurrent.textContent = "0:00";
    if (timeTotal) timeTotal.textContent = "0:00";
  }

  getSeekTimeFromClick(event) {
    const progressBar = this.dom.get("universalBottomProgressBar");
    if (!progressBar || this.duration === 0) return null;
    const rect = progressBar.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(this.duration, this.duration * percent));
  }

  _formatTime(seconds) {
    if (!seconds || seconds < 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}
