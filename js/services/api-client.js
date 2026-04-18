class ApiClient {
  constructor() {
    this.baseUrl = `http://${window.location.hostname}:${window.location.port}`;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      return await response.json();
    } catch (error) {
      console.error(`API Error: ${endpoint}`, error);
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
