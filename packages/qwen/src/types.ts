// ─── Client options ──────────────────────────────────────────────────────────

export interface QwenClientOptions {
  apiKey: string;
  /** Defaults to https://dashscope-intl.aliyuncs.com/compatible-mode/v1 */
  baseURL?: string;
}

// ─── Embeddings ──────────────────────────────────────────────────────────────

export interface EmbeddingRequest {
  model?: string;
  input: string | string[];
  /** 64–2048 for text-embedding-v4. Defaults to 1024. */
  dimensions?: number;
  encoding_format?: "float" | "base64";
}

export interface EmbeddingData {
  object: "embedding";
  embedding: number[];
  index: number;
}

export interface EmbeddingUsage {
  prompt_tokens: number;
  total_tokens: number;
}

export interface EmbeddingResponse {
  object: "list";
  data: EmbeddingData[];
  model: string;
  usage: EmbeddingUsage;
}

// ─── Chat completions ────────────────────────────────────────────────────────

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

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string | null;
}

export interface ChatResponse {
  id: string;
  model: string;
  choices: ChatChoice[];
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export interface DashScopeApiError {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string;
  };
  request_id: string;
}
