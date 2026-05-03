export class PowerManagementState {
  constructor(options = {}) {
    this.tvStatus = "unknown";
    this.tvAddress = options.tvAddress || "192.168.50.13";
    this.container = options.container || null;
    this.pollInterval = null;
  }

  getTVStatus() {
    return this.tvStatus;
  }

  setTVStatus(status) {
    this.tvStatus = status;
  }

  getTVAddress() {
    return this.tvAddress;
  }

  setPollInterval(interval) {
    this.pollInterval = interval;
  }

  getPollInterval() {
    return this.pollInterval;
  }

  reset() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.tvStatus = "unknown";
  }
}
