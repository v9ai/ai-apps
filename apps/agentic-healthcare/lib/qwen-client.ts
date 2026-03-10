// Inlined from @repo/qwen to avoid workspace:* dependency in standalone deploys

// ─── Types ──────────────────────────────────────────────────────────────────

export interface QwenClientOptions {
  apiKey: string;
  baseURL?: string;
}

export interface EmbeddingRequest {
  model?: string;
  input: string | string[];
  dimensions?: number;
  encoding_format?: "float" | "base64";
}

interface EmbeddingData {
  object: "embedding";
  embedding: number[];
  index: number;
}

interface EmbeddingResponse {
  object: "list";
  data: EmbeddingData[];
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
  max_completion_tokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: { index: number; message: ChatMessage; finish_reason: string | null }[];
}

interface DashScopeApiError {
  error: { message: string; type: string; param: string | null; code: string };
  request_id: string;
}

// ─── Client ─────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";

export class QwenClient {
  private readonly baseURL: string;
  private readonly apiKey: string;

  constructor(options: QwenClientOptions) {
    this.apiKey = options.apiKey;
    this.baseURL = (options.baseURL ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  }

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

  async embedOne(text: string): Promise<number[]> {
    const resp = await this.embed({ input: text });
    return resp.data[0]?.embedding ?? [];
  }

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
