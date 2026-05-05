export class ApiClient {
    constructor(baseUrl, timeout = 30000) {
        this.baseUrl = baseUrl || this.getDefaultBaseUrl();
        this.timeout = timeout;
        this.defaultHeaders = {
            "Content-Type": "application/json",
            Accept: "application/json",
        };
    }
    getDefaultBaseUrl() {
        if (typeof window !== "undefined" && window.location) {
            return `http://${window.location.hostname}:${window.location.port}`;
        }
        return "http://192.168.50.11:9093";
    }
    setAuthToken(token) {
        this.defaultHeaders = {
            ...this.defaultHeaders,
            Authorization: `Bearer ${token}`,
        };
    }
    setHeader(key, value) {
        this.defaultHeaders = {
            ...this.defaultHeaders,
            [key]: value,
        };
    }
    removeHeader(key) {
        const newHeaders = { ...this.defaultHeaders };
        delete newHeaders[key];
        this.defaultHeaders = newHeaders;
    }
    async get(endpoint, options) {
        return this.request(endpoint, { ...options, method: "GET" });
    }
    async post(endpoint, data, options) {
        return this.request(endpoint, {
            ...options,
            method: "POST",
            body: data,
        });
    }
    async put(endpoint, data, options) {
        return this.request(endpoint, { ...options, method: "PUT", body: data });
    }
    async delete(endpoint, options) {
        return this.request(endpoint, { ...options, method: "DELETE" });
    }
    async patch(endpoint, data, options) {
        return this.request(endpoint, {
            ...options,
            method: "PATCH",
            body: data,
        });
    }
    async upload(endpoint, file, fieldName = "file", additionalData) {
        const formData = new FormData();
        formData.append(fieldName, file);
        if (additionalData) {
            Object.entries(additionalData).forEach(([key, value]) => {
                formData.append(key, String(value));
            });
        }
        const url = this.buildUrl(endpoint);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { Accept: "application/json" },
                body: formData,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return await this.parseResponse(response);
        }
        catch (error) {
            clearTimeout(timeoutId);
            return this.handleError(error);
        }
    }
    async request(endpoint, options) {
        const url = this.buildUrl(endpoint);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        try {
            const response = await fetch(url, {
                method: options.method || "GET",
                headers: { ...this.defaultHeaders, ...options.headers },
                body: options.body ? this.stringifyBody(options.body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return await this.parseResponse(response);
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error instanceof Error && error.name === "AbortError") {
                return this.handleError(new Error("Request timeout"));
            }
            return this.handleError(error);
        }
    }
    buildUrl(endpoint) {
        const cleanEndpoint = endpoint.startsWith("/")
            ? endpoint.slice(1)
            : endpoint;
        return `${this.baseUrl}/${cleanEndpoint}`;
    }
    stringifyBody(body) {
        if (typeof body === "string")
            return body;
        return JSON.stringify(body);
    }
    async parseResponse(response) {
        if (!response.ok) {
            return {
                success: false,
                statusCode: response.status,
                statusText: response.statusText,
                error: `HTTP ${response.status}: ${response.statusText}`,
            };
        }
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
            const data = await response.json();
            if (data && typeof data === "object" && "success" in data) {
                return data;
            }
            return { success: true, data: data };
        }
        const text = await response.text();
        return { success: true, data: text };
    }
    handleError(error) {
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "Unknown error occurred" };
    }
    async checkAvailability() {
        try {
            const response = await this.get("/api/health");
            return response.success === true;
        }
        catch {
            return false;
        }
    }
    getBaseUrl() {
        return this.baseUrl;
    }
    setBaseUrl(url) {
        this.baseUrl = url;
    }
    setTimeout(timeout) {
        this.timeout = timeout;
    }
}
