import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getConfig, buildHeaders, chatCompletion, LLMError } from "./llm";

describe("getConfig", () => {
  const orig = { ...process.env };

  afterEach(() => {
    process.env = { ...orig };
  });

  it("returns defaults when no env vars set", () => {
    delete process.env.LLM_BASE_URL;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_TIMEOUT_MS;

    const cfg = getConfig();
    expect(cfg.baseUrl).toBe("http://localhost:8080/v1");
    expect(cfg.model).toBe("mlx-community/Qwen2.5-7B-Instruct-4bit");
    expect(cfg.apiKey).toBe("");
    expect(cfg.timeoutMs).toBe(120_000);
  });

  it("reads from env vars when set", () => {
    process.env.LLM_BASE_URL = "http://localhost:9090/v1";
    process.env.LLM_MODEL = "mlx-community/Llama-3.1-8B-Instruct-4bit";
    process.env.LLM_API_KEY = "sk-test-123";
    process.env.LLM_TIMEOUT_MS = "30000";

    const cfg = getConfig();
    expect(cfg.baseUrl).toBe("http://localhost:9090/v1");
    expect(cfg.model).toBe("mlx-community/Llama-3.1-8B-Instruct-4bit");
    expect(cfg.apiKey).toBe("sk-test-123");
    expect(cfg.timeoutMs).toBe(30_000);
  });
});

describe("buildHeaders", () => {
  it("omits Authorization when apiKey is empty", () => {
    const headers = buildHeaders("");
    expect(headers).toEqual({ "Content-Type": "application/json" });
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("includes Authorization when apiKey is set", () => {
    const headers = buildHeaders("sk-abc");
    expect(headers).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer sk-abc",
    });
  });
});

describe("chatCompletion", () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const BASE = "http://localhost:8080/v1";
  const MODEL = "mlx-community/Qwen2.5-7B-Instruct-4bit";

  it("sends correct request to LLM endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hello from Qwen" } }],
      }),
    });

    const messages = [{ role: "user", content: "Hi" }];
    const result = await chatCompletion(messages, {
      baseUrl: BASE,
      model: MODEL,
      apiKey: "",
    });

    expect(result.content).toBe("Hello from Qwen");
    expect(mockFetch).toHaveBeenCalledWith(
      `${BASE}/chat/completions`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, messages }),
      }),
    );
  });

  it("includes auth header when apiKey provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
      }),
    });

    await chatCompletion([{ role: "user", content: "test" }], {
      apiKey: "sk-key",
    });

    const call = mockFetch.mock.calls[0];
    expect(call[1].headers["Authorization"]).toBe("Bearer sk-key");
  });

  it("returns empty string when choices missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const result = await chatCompletion([{ role: "user", content: "test" }]);
    expect(result.content).toBe("");
  });

  it("throws LLMError on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    await expect(
      chatCompletion([{ role: "user", content: "test" }]),
    ).rejects.toThrow(LLMError);

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => "Service Unavailable",
    });

    try {
      await chatCompletion([{ role: "user", content: "test" }]);
    } catch (err) {
      expect(err).toBeInstanceOf(LLMError);
      expect((err as LLMError).status).toBe(503);
      expect((err as LLMError).details).toBe("Service Unavailable");
    }
  });

  it("allows partial config override", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "custom model" } }],
      }),
    });

    await chatCompletion([{ role: "user", content: "test" }], {
      model: "mlx-community/Llama-3.1-8B-Instruct-4bit",
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("mlx-community/Llama-3.1-8B-Instruct-4bit");
  });

  it("wraps connection refused as LLMError 502", async () => {
    mockFetch.mockRejectedValueOnce(
      new TypeError("fetch failed: ECONNREFUSED"),
    );

    try {
      await chatCompletion([{ role: "user", content: "test" }]);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LLMError);
      expect((err as LLMError).status).toBe(502);
      expect((err as LLMError).details).toContain("Cannot reach LLM server");
      expect((err as LLMError).details).toContain("ECONNREFUSED");
    }
  });

  it("wraps timeout as LLMError 408", async () => {
    const abort = new DOMException("signal timed out", "TimeoutError");
    mockFetch.mockRejectedValueOnce(abort);

    try {
      await chatCompletion([{ role: "user", content: "test" }], {
        timeoutMs: 5000,
      });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(LLMError);
      expect((err as LLMError).status).toBe(408);
      expect((err as LLMError).details).toContain("timed out");
      expect((err as LLMError).details).toContain("5000ms");
    }
  });

  it("passes AbortSignal.timeout to fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "ok" } }],
      }),
    });

    await chatCompletion([{ role: "user", content: "test" }], {
      timeoutMs: 60_000,
    });

    const call = mockFetch.mock.calls[0];
    expect(call[1].signal).toBeInstanceOf(AbortSignal);
  });
});
