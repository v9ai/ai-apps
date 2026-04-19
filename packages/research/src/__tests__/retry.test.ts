import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_RETRY,
  backoffDelay,
  classifyStatus,
  shouldRetry,
} from "../retry";

describe("classifyStatus", () => {
  it("maps 2xx/3xx to success", () => {
    expect(classifyStatus(200)).toBe("success");
    expect(classifyStatus(204)).toBe("success");
    expect(classifyStatus(301)).toBe("success");
  });

  it("maps 429 to rate_limited", () => {
    expect(classifyStatus(429)).toBe("rate_limited");
  });

  it("maps 5xx to server_error", () => {
    expect(classifyStatus(500)).toBe("server_error");
    expect(classifyStatus(503)).toBe("server_error");
  });

  it("maps other 4xx to client_error", () => {
    expect(classifyStatus(400)).toBe("client_error");
    expect(classifyStatus(404)).toBe("client_error");
  });
});

describe("shouldRetry", () => {
  it("retries rate_limited and server_error", () => {
    expect(shouldRetry("rate_limited")).toBe(true);
    expect(shouldRetry("server_error")).toBe(true);
  });
  it("does not retry success or client_error", () => {
    expect(shouldRetry("success")).toBe(false);
    expect(shouldRetry("client_error")).toBe(false);
  });
});

describe("backoffDelay", () => {
  const noJitter = { ...DEFAULT_RETRY, jitter: false };

  it("grows exponentially without jitter", () => {
    expect(backoffDelay(noJitter, 0)).toBe(1000);
    expect(backoffDelay(noJitter, 1)).toBe(2000);
    expect(backoffDelay(noJitter, 2)).toBe(4000);
    expect(backoffDelay(noJitter, 3)).toBe(8000);
  });

  it("caps at maxDelayMs", () => {
    expect(backoffDelay({ ...noJitter, maxDelayMs: 3000 }, 10)).toBe(3000);
  });

  it("jitter stays within 50-100% of capped delay", () => {
    const cfg = { ...DEFAULT_RETRY, jitter: true };
    for (let i = 0; i < 50; i++) {
      const d = backoffDelay(cfg, 2);
      expect(d).toBeGreaterThanOrEqual(2000);
      expect(d).toBeLessThanOrEqual(4000);
    }
  });
});
