import type {
  QwenClientOptions,
  EmbeddingRequest,
  EmbeddingResponse,
  ChatRequest,
  ChatResponse,
  DashScopeApiError,
} from "./types";

const DEFAULT_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export class QwenClient {
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(options: QwenClientOptions) {
    this.apiKey = options.apiKey;
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

  // ─── Embeddings ───────────────────────────────────────────────────────────

  /** Generate embeddings. Defaults to text-embedding-v4, 1024 dimensions. */
  async embed(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return this.post<EmbeddingResponse>("/embeddings", {
      model: request.model ?? "text-embedding-v4",
      input: request.input,
      dimensions: request.dimensions ?? 1024,
      ...(request.encoding_format && {
        encoding_format: request.encoding_format,
      }),
    });
  }

  /** Convenience: embed a single string and return the vector. */
  async embedOne(text: string): Promise<number[]> {
    const resp = await this.embed({ input: text });
    return resp.data[0]?.embedding ?? [];
  }

  // ─── Chat completions ─────────────────────────────────────────────────────

  /** Send a chat completion request. Defaults to qwen-plus. */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    return this.post<ChatResponse>("/chat/completions", {
      model: request.model ?? "qwen-plus",
      messages: request.messages,
      ...(request.max_completion_tokens != null && {
        max_completion_tokens: request.max_completion_tokens,
      }),
      ...(request.temperature != null && {
        temperature: request.temperature,
      }),
    });
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseURL}${path}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      let message = `DashScope API error ${response.status}`;
      try {
        const err = JSON.parse(text) as DashScopeApiError;
        message = `${message}: [${err.error.code}] ${err.error.message}`;
      } catch {
        message = `${message}: ${text}`;
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }
}
