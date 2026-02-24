import { parseLoyverseError } from './errors.js';

export interface HttpClientOptions {
  baseUrl: string;
  token: string;
  timeoutMs?: number;
  maxRetries429?: number;
  retryDelayMs?: number;
}

export class LoyverseHttpClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;
  private readonly maxRetries429: number;
  private readonly retryDelayMs: number;

  constructor(opts: HttpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.token = opts.token;
    this.timeoutMs = opts.timeoutMs ?? 15_000;
    this.maxRetries429 = opts.maxRetries429 ?? 3;
    this.retryDelayMs = opts.retryDelayMs ?? 1_000;
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = this.buildUrl(path, params);
    return this.executeWithRetry<T>(url);
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = `${this.baseUrl}${path}`;
    if (!params || Object.keys(params).length === 0) return url;
    const searchParams = new URLSearchParams(params);
    return `${url}?${searchParams.toString()}`;
  }

  private async executeWithRetry<T>(url: string, attempt = 0): Promise<T> {
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err) {
      throw new Error(
        `Network error calling Loyverse API: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (response.ok) {
      return (await response.json()) as T;
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = { errors: [{ code: 'UNKNOWN', details: `HTTP ${response.status}` }] };
    }

    const apiError = parseLoyverseError(response.status, body);

    // 429: retry up to maxRetries429
    if (response.status === 429 && attempt < this.maxRetries429) {
      await this.sleep(this.retryDelayMs * Math.pow(2, attempt));
      return this.executeWithRetry<T>(url, attempt + 1);
    }

    // 5xx: retry once
    if (response.status >= 500 && attempt < 1) {
      await this.sleep(this.retryDelayMs);
      return this.executeWithRetry<T>(url, attempt + 1);
    }

    throw apiError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
