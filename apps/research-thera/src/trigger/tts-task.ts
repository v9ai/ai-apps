/**
 * TTS Tasks — Trigger.dev
 *
 * Dual-provider: Qwen TTS (DashScope) for English, OpenAI TTS for Romanian.
 * Provider is selected by model name: "qwen3-*" → DashScope, else → OpenAI.
 *
 * Fan-out pattern:
 *   tts-generate-audio  (orchestrator)
 *     └─ batchTriggerAndWait → tts-chunk × N
 *
 * Each chunk task uploads its audio to R2 as a temp file and returns the key.
 * The orchestrator downloads all chunks in order, merges them, uploads the
 * final file, updates Neon, then deletes the temp chunk files.
 */

import { task, queue, logger } from "@trigger.dev/sdk/v3";
import OpenAI from "openai";
import {
  uploadToR2,
  downloadFromR2,
  deleteFromR2,
  generateAudioKey,
} from "@/lib/r2-uploader";
import { sql as neonSql } from "@/src/db/neon";

const QWEN_MAX_CHARS = 500; // DashScope API limit: 600 chars
const OPENAI_MAX_CHARS = 4000; // OpenAI limit: 4096 chars
const WAV_HEADER_SIZE = 44;

const DASHSCOPE_BASE_URL = "https://dashscope-intl.aliyuncs.com/api/v1";
const DASHSCOPE_TTS_PATH = "/services/aigc/multimodal-generation/generation";

function isQwenModel(model: string): boolean {
  return model.startsWith("qwen");
}

// ---------------------------------------------------------------------------
// Shared queue
// ---------------------------------------------------------------------------

export const ttsChunkQueue = queue({
  name: "tts-chunks",
  concurrencyLimit: 8,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TTSPayload {
  text: string;
  storyId?: string | null;
  jobId?: string | null;
  voice?: string;
  model?: string;
  responseFormat?: string;
  speed?: number;
  instructions?: string;
  userEmail?: string;
}

interface ChunkPayload {
  chunk: string;
  index: number;
  total: number;
  tempKey: string;
  voice: string;
  model: string;
  responseFormat: string;
  speed: number;
  instructions?: string;
}

// ---------------------------------------------------------------------------
// DashScope TTS (Qwen) — returns WAV
// ---------------------------------------------------------------------------

interface DashScopeResponse {
  request_id: string;
  output: { audio: { url?: string; data?: string } };
}

async function synthesizeQwen(
  text: string,
  voice: string,
  model: string,
  instructions?: string,
): Promise<Buffer> {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) throw new Error("DASHSCOPE_API_KEY not set");

  const body: Record<string, unknown> = {
    model,
    input: {
      text,
      voice,
      ...(instructions && { instructions }),
    },
    ...(instructions && { parameters: { optimize_instructions: true } }),
  };

  const resp = await fetch(`${DASHSCOPE_BASE_URL}${DASHSCOPE_TTS_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`DashScope TTS error ${resp.status}: ${errorText}`);
  }

  const data = (await resp.json()) as DashScopeResponse;

  if (data.output.audio.url) {
    const audioResp = await fetch(data.output.audio.url);
    if (!audioResp.ok) throw new Error("Failed to download audio from DashScope URL");
    return Buffer.from(await audioResp.arrayBuffer());
  }
  if (data.output.audio.data) {
    return Buffer.from(data.output.audio.data, "base64");
  }
  throw new Error("DashScope TTS returned no audio URL or data");
}

// ---------------------------------------------------------------------------
// OpenAI TTS — returns MP3
// ---------------------------------------------------------------------------

async function synthesizeOpenAI(
  text: string,
  voice: string,
  model: string,
  responseFormat: string,
  speed: number,
  instructions?: string,
): Promise<Buffer> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const params: Parameters<typeof openai.audio.speech.create>[0] = {
    model,
    input: text,
    voice: voice as Parameters<typeof openai.audio.speech.create>[0]["voice"],
    response_format:
      responseFormat as Parameters<typeof openai.audio.speech.create>[0]["response_format"],
    ...(model !== "gpt-4o-mini-tts" ? { speed } : {}),
    ...(instructions && { instructions }),
  };
  const resp = await openai.audio.speech.create(params);
  return Buffer.from(await resp.arrayBuffer());
}

// ---------------------------------------------------------------------------
// Audio merging (WAV + MP3)
// ---------------------------------------------------------------------------

function mergeWavChunks(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];
  const parts = [buffers[0], ...buffers.slice(1).map((buf) =>
    buf.length > WAV_HEADER_SIZE ? buf.subarray(WAV_HEADER_SIZE) : buf,
  )];
  const combined = Buffer.concat(parts);
  if (combined.length > WAV_HEADER_SIZE) {
    combined.writeUInt32LE(combined.length - 8, 4);
    combined.writeUInt32LE(combined.length - WAV_HEADER_SIZE, 40);
  }
  return combined;
}

function stripId3v2(buf: Buffer): Buffer {
  if (buf.length >= 10 && buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f);
    return buf.subarray(10 + size);
  }
  return buf;
}

function mergeMp3Chunks(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];
  return Buffer.concat([buffers[0], ...buffers.slice(1).map(stripId3v2)]);
}

function mergeAudioChunks(buffers: Buffer[], format: string): Buffer {
  return format === "wav" ? mergeWavChunks(buffers) : mergeMp3Chunks(buffers);
}

// ---------------------------------------------------------------------------
// Markdown stripper
// ---------------------------------------------------------------------------

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/_(.+?)_/gs, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const DEFAULT_TTS_INSTRUCTIONS =
  "Speak in a calm, warm, and gentle therapeutic voice. Pace yourself slowly and deliberately. " +
  "Pause naturally at sentence boundaries and after pause cues. Use a soothing, reassuring tone throughout.";

// ---------------------------------------------------------------------------
// Sentence-aware text chunking (ported from crates/tts/src/split.rs)
// ---------------------------------------------------------------------------

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
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const sepLen = current ? 1 : 0;
    if (current.length + sepLen + word.length > maxChars && current) {
      chunks.push(current);
      current = "";
    }
    current = current ? `${current} ${word}` : word;
  }
  if (current) chunks.push(current);
  return chunks;
}

function chunkTextSentenceAware(text: string, maxChars: number): string[] {
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

    const sepLen = current ? 1 : 0;
    if (current.length + sepLen + trimmed.length > maxChars && current) {
      chunks.push(current.trim());
      current = "";
    }
    current = current ? `${current} ${trimmed}` : trimmed;
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

// Paragraph-then-sentence chunker for larger chunk sizes (OpenAI)
function chunkTextParagraph(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const para of text.split("\n\n")) {
    if (current.length + para.length + 2 <= maxChars) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) chunks.push(current);
      if (para.length > maxChars) {
        current = "";
        for (const sentence of para
          .replace(/\. /g, ".|")
          .replace(/! /g, "!|")
          .replace(/\? /g, "?|")
          .split("|")) {
          if (current.length + sentence.length + 1 <= maxChars) {
            current = current ? `${current} ${sentence}` : sentence;
          } else {
            if (current) chunks.push(current);
            current = sentence;
          }
        }
        if (current) {
          chunks.push(current);
          current = "";
        }
      } else {
        current = para;
      }
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

// ---------------------------------------------------------------------------
// D1 job status helpers
// ---------------------------------------------------------------------------

async function updateJob(
  jobId: string,
  status: string,
  extra?: { error?: string; result?: Record<string, unknown> },
) {
  const now = new Date().toISOString();
  if (extra?.error) {
    await neonSql`UPDATE generation_jobs SET status = ${status}, error = ${JSON.stringify({ message: extra.error })}, updated_at = ${now} WHERE id = ${jobId}`;
  } else if (extra?.result) {
    await neonSql`UPDATE generation_jobs SET status = ${status}, result = ${JSON.stringify(extra.result)}, updated_at = ${now} WHERE id = ${jobId}`;
  } else {
    await neonSql`UPDATE generation_jobs SET status = ${status}, updated_at = ${now} WHERE id = ${jobId}`;
  }
}

// ---------------------------------------------------------------------------
// Chunk task — one TTS call (Qwen or OpenAI), result stored in R2
// ---------------------------------------------------------------------------

export const ttsChunkTask = task({
  id: "tts-chunk",
  queue: ttsChunkQueue,
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 15_000,
    randomize: true,
  },
  run: async (payload: ChunkPayload) => {
    const { chunk, index, total, tempKey, voice, model, responseFormat, speed, instructions } =
      payload;

    const buf = isQwenModel(model)
      ? await synthesizeQwen(chunk, voice, model, instructions)
      : await synthesizeOpenAI(chunk, voice, model, responseFormat, speed, instructions);

    const contentType = isQwenModel(model) ? "audio/wav" : `audio/${responseFormat}`;

    await uploadToR2({
      key: tempKey,
      body: buf,
      contentType,
      metadata: { chunkIndex: String(index), total: String(total) },
    });

    logger.info("tts.chunk_done", { index, total, tempKey, sizeBytes: buf.length });
    return { tempKey, sizeBytes: buf.length };
  },
});

// ---------------------------------------------------------------------------
// Orchestrator task — fan-out, merge, final upload
// ---------------------------------------------------------------------------

export const ttsTask = task({
  id: "tts-generate-audio",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 30_000,
    randomize: true,
  },
  onFailure: async ({ payload, error }: { payload: TTSPayload; error: unknown }) => {
    const message = error instanceof Error ? error.message : "TTS generation failed";
    logger.error("tts.job_failed", {
      jobId: payload.jobId,
      storyId: payload.storyId,
      error: message,
    });
    if (payload.jobId) {
      try {
        await updateJob(payload.jobId, "FAILED", { error: message });
      } catch (dbErr) {
        logger.error("tts.job_update_failed", {
          jobId: payload.jobId,
          updateError: dbErr instanceof Error ? dbErr.message : String(dbErr),
          originalError: message,
        });
      }
    }
  },
  run: async (payload: TTSPayload) => {
    const {
      text,
      storyId,
      jobId,
      voice = "cherry",
      model = "qwen3-tts-instruct-flash",
      responseFormat = "wav",
      speed = 0.9,
      userEmail,
    } = payload;

    const qwen = isQwenModel(model);
    const maxChars = qwen ? QWEN_MAX_CHARS : OPENAI_MAX_CHARS;
    const audioFormat = qwen ? "wav" : (responseFormat || "mp3");

    // Strip any markdown formatting before chunking
    const cleanText = stripMarkdown(text);
    const instructions = payload.instructions || DEFAULT_TTS_INSTRUCTIONS;

    const chunks = qwen
      ? chunkTextSentenceAware(cleanText, maxChars)
      : chunkTextParagraph(cleanText, maxChars);

    const batchId = jobId ?? `tts-${Date.now()}`;

    logger.info("tts.started", {
      storyId,
      jobId,
      provider: qwen ? "qwen" : "openai",
      chunks: chunks.length,
      textLen: text.length,
      cleanTextLen: cleanText.length,
      voice,
      model,
    });

    if (jobId) {
      await updateJob(jobId, "RUNNING", { result: { progress: 5, stage: "started" } }).catch((e) =>
        logger.warn("tts.progress_update_failed", { jobId, stage: "started", error: String(e) }),
      );
    }

    const chunkPayloads: ChunkPayload[] = chunks.map((chunk, index) => ({
      chunk,
      index,
      total: chunks.length,
      tempKey: `tts-chunks/${batchId}-${index}.${audioFormat}`,
      voice,
      model,
      responseFormat: audioFormat,
      speed,
      instructions,
    }));

    if (jobId) {
      await updateJob(jobId, "RUNNING", { result: { progress: 10, stage: "generating_chunks" } }).catch((e) => {
        logger.warn("tts.progress_update_failed", { jobId, stage: "generating_chunks", error: String(e) });
      });
    }

    const results = await ttsChunkTask.batchTriggerAndWait(
      chunkPayloads.map((p) => ({ payload: p })),
    );

    const failedChunks = results.runs.filter((r) => !r.ok);
    if (failedChunks.length > 0) {
      const failedDetails = failedChunks.map((r) => ({
        ok: r.ok,
        error: !r.ok ? String(r.error) : undefined,
      }));
      logger.error("tts.chunks_failed", { storyId, failed: failedChunks.length, total: chunks.length, details: failedDetails });
      throw new Error(`${failedChunks.length}/${chunks.length} chunk(s) failed`);
    }

    if (jobId) {
      await updateJob(jobId, "RUNNING", { result: { progress: 60, stage: "merging" } }).catch((e) => {
        logger.warn("tts.progress_update_failed", { jobId, stage: "merging", error: String(e) });
      });
    }

    const audioBuffers = await Promise.all(
      chunkPayloads.map((p) => downloadFromR2(p.tempKey)),
    );
    const combined = mergeAudioChunks(audioBuffers, audioFormat);
    logger.info("tts.chunks_merged", { storyId, chunks: chunks.length, sizeBytes: combined.length });

    if (jobId) {
      await updateJob(jobId, "RUNNING", { result: { progress: 80, stage: "uploading" } }).catch((e) => {
        logger.warn("tts.progress_update_failed", { jobId, stage: "uploading", error: String(e) });
      });
    }

    const baseKey = generateAudioKey("graphql-tts");
    const key = audioFormat === "mp3" ? baseKey : baseKey.replace(/\.mp3$/, `.${audioFormat}`);
    const result = await uploadToR2({
      key,
      body: combined,
      contentType: `audio/${audioFormat}`,
      metadata: {
        voice,
        model,
        provider: qwen ? "qwen" : "openai",
        textLength: String(cleanText.length),
        chunks: String(chunks.length),
        ...(instructions && { instructions }),
      },
    });

    const audioUrl = result.publicUrl ?? "";
    if (!audioUrl) {
      logger.warn("tts.r2_no_public_url", { storyId, key });
    }
    logger.info("tts.r2_uploaded", { storyId, key, sizeBytes: combined.length, audioUrl });

    // Clean up temp chunk files
    await Promise.all(chunkPayloads.map((p) => deleteFromR2(p.tempKey).catch((e) => {
      logger.warn("tts.chunk_delete_failed", { tempKey: p.tempKey, error: String(e) });
    })));

    // Update Neon stories row
    if (storyId) {
      const now = new Date().toISOString();
      try {
        await neonSql`UPDATE stories SET audio_key = ${key}, audio_url = ${audioUrl}, audio_generated_at = ${now}, updated_at = ${now} WHERE id = ${storyId}`;
        logger.info("tts.story_updated", { storyId, audioUrl, key });
      } catch (dbErr) {
        logger.error("tts.story_update_failed", {
          storyId,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
        throw dbErr;
      }
    }

    // Mark job SUCCEEDED
    if (jobId) {
      try {
        await updateJob(jobId, "SUCCEEDED", { result: { audioUrl } });
        logger.info("tts.job_succeeded", { jobId, storyId, audioUrl });
      } catch (dbErr) {
        logger.error("tts.job_success_update_failed", {
          jobId,
          audioUrl,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
      }
    }

    return { audioUrl, key, sizeBytes: combined.length };
  },
});
