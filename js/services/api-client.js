class ApiClient {
  constructor() {
    this.baseUrl = `http://${window.location.hostname}:${window.location.port}`;
  }

  _debugLog(message, data = null) {
    const timestamp = new Date().toISOString().split("T")[1].slice(0, 12);
    console.log(`[API-DEBUG ${timestamp}] ${message}`, data || "");
  }

  async request(endpoint, options = {}) {
    const startTime = Date.now();
    this._debugLog(`REQUEST ${options.method || "GET"} ${endpoint}`);
    try {
      const response = await fetch(endpoint, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const duration = Date.now() - startTime;
      const data = await response.json();
      this._debugLog(`RESPONSE ${duration}ms ${endpoint}`, {
        status: response.status,
        success: data?.success,
      });
      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      this._debugLog(`ERROR ${duration}ms ${endpoint}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
