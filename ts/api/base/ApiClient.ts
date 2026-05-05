import { ApiResponse, RequestOptions } from "../types/api";

export class ApiClient {
  protected baseUrl: string;
  protected defaultHeaders: HeadersInit;
  protected timeout: number;

  constructor(baseUrl?: string, timeout: number = 30000) {
    this.baseUrl = baseUrl || this.getDefaultBaseUrl();
    this.timeout = timeout;
    this.defaultHeaders = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private getDefaultBaseUrl(): string {
    if (typeof window !== "undefined" && window.location) {
      return `http://${window.location.hostname}:${window.location.port}`;
    }
    return "http://192.168.50.11:9093";
  }

  setAuthToken(token: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      Authorization: `Bearer ${token}`,
    };
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders = {
      ...this.defaultHeaders,
      [key]: value,
    };
  }

  removeHeader(key: string): void {
    const newHeaders = { ...this.defaultHeaders };
    delete newHeaders[key];
    this.defaultHeaders = newHeaders;
  }

  async get<T = any>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data,
    });
  }

  async put<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body: data });
  }

  async delete<T = any>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  async patch<T = any>(
    endpoint: string,
    data?: any,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data,
    });
  }

  async upload<T = any>(
    endpoint: string,
    file: File,
    fieldName: string = "file",
    additionalData?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
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
      return await this.parseResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error);
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestOptions,
  ): Promise<ApiResponse<T>> {
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
      return await this.parseResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        return this.handleError(new Error("Request timeout"));
      }
      return this.handleError(error);
    }
  }

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith("/")
      ? endpoint.slice(1)
      : endpoint;
    return `${this.baseUrl}/${cleanEndpoint}`;
  }

  private stringifyBody(body: any): string {
    if (typeof body === "string") return body;
    return JSON.stringify(body);
  }

  private async parseResponse<T = any>(
    response: Response,
  ): Promise<ApiResponse<T>> {
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
        return data as ApiResponse<T>;
      }
      return { success: true, data: data };
    }
    const text = await response.text();
    return { success: true, data: text as T };
  }

  private handleError(error: unknown): ApiResponse {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error occurred" };
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await this.get("/api/health");
      return response.success === true;
    } catch {
      return false;
    }
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setTimeout(timeout: number): void {
    this.timeout = timeout;
  }
}
