class ApiClient {
  constructor() {
    this.baseUrl = `http://${window.location.hostname}:${window.location.port}`;
    this._pendingRequests = new Map();
  }

  _debugLog(message, data = null) {}

  async request(endpoint, options = {}) {
    const cacheKey = `${options.method || "GET"}:${endpoint}`;
    if (this._pendingRequests.has(cacheKey)) {
      return this._pendingRequests.get(cacheKey);
    }
    const promise = this._doRequest(endpoint, options);
    this._pendingRequests.set(cacheKey, promise);
    try {
      const result = await promise;
      return result;
    } finally {
      setTimeout(() => this._pendingRequests.delete(cacheKey), 100);
    }
  }

  async _doRequest(endpoint, options = {}) {
    const startTime = Date.now();
    this._debugLog(`REQUEST ${options.method || "GET"} ${endpoint}`);
    try {
      const headers = { ...options.headers };
      if (options.method === "POST" && options.body) {
        headers["Content-Type"] = "application/json";
      }
      const response = await fetch(endpoint, {
        method: options.method || "GET",
        headers: headers,
        body: options.body || undefined,
      });
      const duration = Date.now() - startTime;
      let data;
      try {
        data = await response.json();
      } catch (e) {
        data = { success: false, error: "Invalid JSON response" };
      }
      const success = data?.success !== undefined ? data.success : response.ok;
      const result = { success, ...data };
      this._debugLog(`RESPONSE ${duration}ms ${endpoint}`, {
        status: response.status,
        success: result.success,
        hasData: !!result.data,
      });
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this._debugLog(`ERROR ${duration}ms ${endpoint}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
