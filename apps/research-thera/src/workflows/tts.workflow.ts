import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { sql as neonSql } from "@/src/db/neon";
import { uploadToR2 } from "@/lib/r2-uploader";
import { randomUUID } from "crypto";

const QWEN_MAX_CHARS = 500;
const OPENAI_MAX_CHARS = 4000;
const WAV_HEADER_SIZE = 44;
const DASHSCOPE_URL =
  "https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

const DEFAULT_TTS_INSTRUCTIONS =
  "Speak in a calm, warm, and gentle therapeutic voice. " +
  "Pace yourself slowly and deliberately. " +
  "Pause naturally at sentence boundaries and after pause cues. " +
  "Use a soothing, reassuring tone throughout.";

const inputSchema = z.object({
  story_id: z.number().int().nullable().optional(),
  language: z.string().nullable().optional(),
  voice: z.string().nullable().optional(),
  instructions: z.string().nullable().optional(),
  user_email: z.string().nullable().optional(),
});

const outputSchema = z.object({
  audio_url: z.string().optional(),
  audio_key: z.string().optional(),
  error: z.string().optional(),
});

const loadedSchema = z.object({
  storyId: z.number().int().nullable(),
  text: z.string(),
  voice: z.string(),
  model: z.string(),
  isQwen: z.boolean(),
  chunks: z.array(z.string()),
  instructions: z.string().nullable(),
  error: z.string().optional(),
});

const synthesizedSchema = loadedSchema.extend({
  audioBase64: z.string().optional(),
});

function splitSentences(text: string): string[] {
  const sentences: string[] = [];
  let current = "";
  for (const ch of text) {
    current += ch;
    if (ch === "." || ch === "!" || ch === "?") {
      sentences.push(current);
      current = "";
    }
  }
  if (current.trim()) sentences.push(current);
  return sentences;
}

function hardSplit(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const sep = current ? 1 : 0;
    if (current.length + sep + word.length > maxChars && current) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current} ${word}` : word;
  }
  if (current) chunks.push(current);
  return chunks;
}

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const sentences = splitSentences(text);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...hardSplit(trimmed, maxChars));
      continue;
    }
    const sep = current ? 1 : 0;
    if (current.length + sep + trimmed.length > maxChars && current) {
      chunks.push(current.trim());
      current = "";
    }
    current = current ? `${current} ${trimmed}` : trimmed;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

function stripMarkdown(text: string): string {
  let out = text;
  out = out.replace(/\*\*(.+?)\*\*/gs, "$1");
  out = out.replace(/\*(.+?)\*/gs, "$1");
  out = out.replace(/__(.+?)__/gs, "$1");
  out = out.replace(/_(.+?)_/gs, "$1");
  out = out.replace(/^#{1,6}\s+/gm, "");
  out = out.replace(/^\s*[-*+]\s+/gm, "");
  out = out.replace(/^\s*\d+\.\s+/gm, "");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

async function synthesizeQwen(
  text: string,
  voice: string,
  model: string,
  instructions: string | null,
): Promise<Uint8Array> {
  const apiKey = process.env.DASHSCOPE_API_KEY || "";
  const body: Record<string, unknown> = {
    model,
    input: instructions ? { text, voice, instructions } : { text, voice },
  };
  if (instructions) body.parameters = { optimize_instructions: true };

  const resp = await fetch(DASHSCOPE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    const err = new Error(`DashScope HTTP ${resp.status}: ${t.slice(0, 200)}`);
    (err as Error & { status?: number }).status = resp.status;
    throw err;
  }
  const data = (await resp.json()) as {
    output?: { audio?: { url?: string; data?: string } };
  };
  const audioUrl = data.output?.audio?.url;
  if (audioUrl) {
    const r = await fetch(audioUrl);
    if (!r.ok) throw new Error(`DashScope audio URL fetch failed: ${r.status}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  const audioData = data.output?.audio?.data;
  if (audioData) {
    return Uint8Array.from(Buffer.from(audioData, "base64"));
  }
  throw new Error("DashScope returned no audio URL or data");
}

async function synthesizeOpenAI(
  text: string,
  voice: string,
  model: string,
  instructions: string | null,
): Promise<Uint8Array> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  const body: Record<string, unknown> = {
    model,
    input: text,
    voice,
    response_format: "mp3",
  };
  if (instructions) body.instructions = instructions;
  const resp = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    const err = new Error(`OpenAI TTS HTTP ${resp.status}: ${t.slice(0, 200)}`);
    (err as Error & { status?: number }).status = resp.status;
    throw err;
  }
  return new Uint8Array(await resp.arrayBuffer());
}

function mergeWav(buffers: Uint8Array[]): Uint8Array {
  if (buffers.length === 1) return buffers[0];
  const first = buffers[0];
  const tails = buffers
    .slice(1)
    .map((b) => (b.length > WAV_HEADER_SIZE ? b.slice(WAV_HEADER_SIZE) : b));
  const total = first.length + tails.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  out.set(first, 0);
  let offset = first.length;
  for (const t of tails) {
    out.set(t, offset);
    offset += t.length;
  }
  if (out.length > WAV_HEADER_SIZE) {
    const view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    view.setUint32(4, out.length - 8, true);
    view.setUint32(40, out.length - WAV_HEADER_SIZE, true);
  }
  return out;
}

function stripId3v2(buf: Uint8Array): Uint8Array {
  if (
    buf.length >= 10 &&
    buf[0] === 0x49 &&
    buf[1] === 0x44 &&
    buf[2] === 0x33
  ) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    return buf.slice(10 + size);
  }
  return buf;
}

function mergeMp3(buffers: Uint8Array[]): Uint8Array {
  if (buffers.length === 1) return buffers[0];
  const parts = [buffers[0], ...buffers.slice(1).map(stripId3v2)];
  const total = parts.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function synthesizeWithRetry(
  chunk: string,
  isQwen: boolean,
  voice: string,
  model: string,
  instructions: string | null,
): Promise<Uint8Array> {
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return isQwen
        ? await synthesizeQwen(chunk, voice, model, instructions)
        : await synthesizeOpenAI(chunk, voice, model, instructions);
    } catch (exc) {
      const err = exc as Error & { status?: number };
      lastErr = err;
      if (err.status === 429 && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
        continue;
      }
      throw err;
    }
  }
  throw lastErr ?? new Error("synthesize failed");
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const runners: Promise<void>[] = [];
  for (let i = 0; i < Math.min(concurrency, items.length); i += 1) {
    runners.push(
      (async () => {
        for (;;) {
          const idx = next;
          next += 1;
          if (idx >= items.length) return;
          results[idx] = await worker(items[idx], idx);
        }
      })(),
    );
  }
  await Promise.all(runners);
  return results;
}

const loadStory = createStep({
  id: "load_story",
  inputSchema,
  outputSchema: loadedSchema,
  execute: async ({ inputData }) => {
    const storyId = inputData.story_id ?? null;
    const base = {
      storyId,
      text: "",
      voice: "",
      model: "",
      isQwen: false,
      chunks: [] as string[],
      instructions: null as string | null,
    };
    if (!storyId) return { ...base, error: "story_id is required" };

    let text = "";
    let dbLang: string | null = null;
    try {
      const rows = await neonSql`
        SELECT content, language FROM stories WHERE id = ${storyId}
      `;
      if (rows.length === 0) {
        return { ...base, error: `Story ${storyId} not found` };
      }
      text = (rows[0].content as string) || "";
      dbLang = (rows[0].language as string | null) ?? null;
    } catch (exc) {
      const msg = exc instanceof Error ? exc.message : String(exc);
      return { ...base, error: `load_story failed: ${msg}` };
    }

    const language = inputData.language || dbLang || "English";
    const isRomanian = language.toLowerCase() === "romanian";
    const isQwen = !isRomanian;

    let voice: string;
    let model: string;
    const instructions = inputData.instructions || DEFAULT_TTS_INSTRUCTIONS;
    if (isQwen) {
      voice = inputData.voice || "ethan";
      model = instructions ? "qwen3-tts-instruct-flash" : "qwen3-tts-flash";
    } else {
      voice = inputData.voice || "onyx";
      model = "gpt-4o-mini-tts";
    }

    const cleanText = stripMarkdown(text);
    const maxChars = isQwen ? QWEN_MAX_CHARS : OPENAI_MAX_CHARS;
    const chunks = chunkText(cleanText, maxChars);

    return {
      storyId,
      text: cleanText,
      voice,
      model,
      isQwen,
      chunks,
      instructions,
    };
  },
});

const synthesize = createStep({
  id: "synthesize",
  inputSchema: loadedSchema,
  outputSchema: synthesizedSchema,
  execute: async ({ inputData }) => {
    if (inputData.error) return { ...inputData };
    if (inputData.chunks.length === 0) {
      return { ...inputData, error: "no text chunks to synthesize" };
    }

    const concurrency = inputData.isQwen ? 3 : 5;
    try {
      const buffers = await runWithConcurrency(
        inputData.chunks,
        concurrency,
        (chunk) =>
          synthesizeWithRetry(
            chunk,
            inputData.isQwen,
            inputData.voice,
            inputData.model,
            inputData.instructions,
          ),
      );
      const merged = inputData.isQwen ? mergeWav(buffers) : mergeMp3(buffers);
      const audioBase64 = Buffer.from(merged).toString("base64");
      return { ...inputData, audioBase64 };
    } catch (exc) {
      const msg = exc instanceof Error ? exc.message : String(exc);
      return { ...inputData, error: `synthesize failed: ${msg}` };
    }
  },
});

const uploadAndSave = createStep({
  id: "upload_and_save",
  inputSchema: synthesizedSchema,
  outputSchema,
  execute: async ({ inputData }) => {
    if (inputData.error) return { error: inputData.error };
    if (!inputData.audioBase64) return { error: "no audio bytes" };

    const audio = Buffer.from(inputData.audioBase64, "base64");
    const ext = inputData.isQwen ? "wav" : "mp3";
    const contentType = `audio/${ext}`;
    const key = `graphql-tts/${randomUUID()}.${ext}`;

    let publicUrl: string;
    try {
      const uploaded = await uploadToR2({
        key,
        body: audio,
        contentType,
      });
      publicUrl = uploaded.publicUrl ?? uploaded.key;
    } catch (exc) {
      const msg = exc instanceof Error ? exc.message : String(exc);
      return { error: `R2 upload failed: ${msg}` };
    }

    if (inputData.storyId) {
      try {
        const now = new Date().toISOString();
        await neonSql`
          UPDATE stories
          SET audio_key = ${key},
              audio_url = ${publicUrl},
              audio_generated_at = ${now},
              updated_at = ${now}
          WHERE id = ${inputData.storyId}
        `;
      } catch (exc) {
        const msg = exc instanceof Error ? exc.message : String(exc);
        return { error: `DB update failed: ${msg}` };
      }
    }

    return { audio_url: publicUrl, audio_key: key };
  },
});

export const ttsWorkflow = createWorkflow({
  id: "tts",
  inputSchema,
  outputSchema,
})
  .then(loadStory)
  .then(synthesize)
  .then(uploadAndSave)
  .commit();
