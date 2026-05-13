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
      const percent = (currentTime / duration) * 100;
      progressFill.style.width = `${percent}%`;
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
      if (duration > 0) {
        timeTotal.textContent = this._formatTime(duration);
      } else {
        timeTotal.textContent = "0:00";
      }
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
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }
}
