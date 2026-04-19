export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
  retryOnServerError: boolean;
}

export const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  jitter: true,
  retryOnServerError: true,
};

export type RetryAction = "success" | "rate_limited" | "server_error" | "client_error";

export function classifyStatus(status: number): RetryAction {
  if (status >= 200 && status <= 399) return "success";
  if (status === 429) return "rate_limited";
  if (status >= 500 && status <= 599) return "server_error";
  return "client_error";
}

export function shouldRetry(action: RetryAction): boolean {
  return action === "rate_limited" || action === "server_error";
}

export function backoffDelay(config: RetryConfig, attempt: number): number {
  const raw = config.baseDelayMs * 2 ** attempt;
  const capped = Math.min(raw, config.maxDelayMs);
  if (!config.jitter) return capped;
  // 50-100% of computed delay (matches retry.rs:68-84 which subtracts 0-50%)
  const jitterFraction = Math.random();
  const jitterMs = capped * 0.5 * jitterFraction;
  return Math.max(0, capped - jitterMs);
}

export interface FetchWithRetryOptions {
  params?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  retry?: Partial<RetryConfig>;
  apiName?: string;
  signal?: AbortSignal;
}

export class RetryHttpError extends Error {
  constructor(public readonly status: number, public readonly body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.name = "RetryHttpError";
  }
}

function buildUrl(url: string, params?: Record<string, string | number | undefined>): string {
  if (!params) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.append(k, String(v));
  }
  return u.toString();
}

function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<Response> {
  const config: RetryConfig = { ...DEFAULT_RETRY, ...options.retry };
  const fullUrl = buildUrl(url, options.params);
  const apiName = options.apiName ?? "unknown";

  let lastErr: unknown = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = backoffDelay(config, attempt - 1);
      console.warn(
        `[${apiName}] retry attempt=${attempt} delay=${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }

    try {
      const resp = await fetch(fullUrl, {
        headers: options.headers,
        signal: options.signal,
      });
      const action = classifyStatus(resp.status);
      const retryable =
        action === "rate_limited" ||
        (action === "server_error" && config.retryOnServerError);
      if (!retryable) return resp;

      const body = await resp.text().catch(() => "");
      console.warn(
        `[${apiName}] status=${resp.status} kind=${action} attempt=${attempt}/${config.maxRetries}, will retry`,
      );
      lastErr = new RetryHttpError(resp.status, body);
    } catch (err) {
      if (isRetryableNetworkError(err) && attempt < config.maxRetries) {
        console.warn(`[${apiName}] network error attempt=${attempt}, will retry: ${String(err)}`);
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw lastErr ?? new Error(`${apiName}: retries exhausted`);
}

export async function fetchJsonWithRetry<T>(
  url: string,
  options: FetchWithRetryOptions = {},
): Promise<T> {
  const resp = await fetchWithRetry(url, options);
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new RetryHttpError(resp.status, body);
  }
  return (await resp.json()) as T;
}
