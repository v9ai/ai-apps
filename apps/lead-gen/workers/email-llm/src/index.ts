/**
 * Cloudflare Worker: OpenAI-compatible `/v1/chat/completions` backed by
 * Workers AI running Mistral-7B-Instruct-v0.2 with an uploaded LoRA adapter.
 *
 * Exists so the existing Python LangGraph backend (which speaks OpenAI-HTTP
 * via langchain_openai.ChatOpenAI) can call Workers AI with zero code change —
 * only LLM_BASE_URL / LLM_API_KEY / LLM_MODEL env vars flip in backend/wrangler.jsonc.
 *
 * Routes:
 *   POST /v1/chat/completions  — wraps env.AI.run(model, {messages, raw: true, lora}).
 *   GET  /v1/models            — single-entry model list (for client probes).
 *   GET  /health               — liveness.
 *
 * Auth: Bearer token in `Authorization` header matched against the
 * EMAIL_LLM_SHARED_SECRET secret using a constant-time comparison.
 *
 * FINETUNE_ID secret is optional — when unset the base Mistral-7B model is
 * invoked without a LoRA (useful for Phase 1 eval before the adapter exists).
 */

interface Env {
  AI: Ai;
  MODEL_NAME: string;
  MODEL_ALIAS: string;
  EMAIL_LLM_SHARED_SECRET: string;
  FINETUNE_ID?: string;
}

type ChatRole = "system" | "user" | "assistant";
interface ChatMessage {
  role: ChatRole;
  content: string;
}
interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

const DEFAULT_MAX_TOKENS = 200;
const DEFAULT_TEMPERATURE = 0.2;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function authorize(req: Request, expected: string): boolean {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return safeEqual(match[1].trim(), expected);
}

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

function errJson(message: string, status: number, type = "invalid_request_error"): Response {
  return json({ error: { message, type } }, status);
}

function newCompletionId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `chatcmpl-${hex}`;
}

async function handleChatCompletions(req: Request, env: Env): Promise<Response> {
  if (!authorize(req, env.EMAIL_LLM_SHARED_SECRET)) {
    return errJson("unauthorized", 401, "authentication_error");
  }

  let body: ChatCompletionRequest;
  try {
    body = (await req.json()) as ChatCompletionRequest;
  } catch {
    return errJson("invalid JSON body", 400);
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return errJson("`messages` must be a non-empty array", 400);
  }
  if (body.stream) {
    return errJson("streaming is not supported by this endpoint", 400);
  }

  // Workers AI accepts a `lora` field (finetune id or name) that @cloudflare/workers-types
  // does not yet declare — cast to a loosened shape.
  const aiInput: Record<string, unknown> = {
    messages: body.messages,
    raw: true,
    max_tokens: body.max_tokens ?? DEFAULT_MAX_TOKENS,
    temperature: body.temperature ?? DEFAULT_TEMPERATURE,
    stream: false,
  };
  if (body.top_p !== undefined) aiInput.top_p = body.top_p;
  if (env.FINETUNE_ID) aiInput.lora = env.FINETUNE_ID;

  type RunResp = { response?: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
  let aiResp: RunResp;
  try {
    // Model slug + LoRA input are not in the generated type catalog; the
    // runtime accepts strings at this binding.
    aiResp = (await (env.AI.run as unknown as (m: string, i: unknown) => Promise<RunResp>)(
      env.MODEL_NAME,
      aiInput,
    ));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return errJson(`workers-ai error: ${msg}`, 502, "api_error");
  }

  const completion = aiResp.response ?? "";
  const usage = aiResp.usage;

  return json({
    id: newCompletionId(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: body.model ?? env.MODEL_ALIAS,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content: completion },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: usage?.prompt_tokens ?? 0,
      completion_tokens: usage?.completion_tokens ?? 0,
      total_tokens: usage?.total_tokens ?? 0,
    },
  });
}

function handleListModels(env: Env): Response {
  return json({
    object: "list",
    data: [
      {
        id: env.MODEL_ALIAS,
        object: "model",
        created: 0,
        owned_by: "cloudflare-workers-ai",
      },
    ],
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;

    if (req.method === "GET" && pathname === "/health") {
      return json({ ok: true, model: env.MODEL_ALIAS, lora: Boolean(env.FINETUNE_ID) });
    }

    if (req.method === "GET" && pathname === "/v1/models") {
      if (!authorize(req, env.EMAIL_LLM_SHARED_SECRET)) {
        return errJson("unauthorized", 401, "authentication_error");
      }
      return handleListModels(env);
    }

    if (req.method === "POST" && pathname === "/v1/chat/completions") {
      return handleChatCompletions(req, env);
    }

    return errJson(`no route for ${req.method} ${pathname}`, 404, "not_found_error");
  },
};
