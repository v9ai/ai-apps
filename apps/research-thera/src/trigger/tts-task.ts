/**
 * TTS Tasks — Trigger.dev
 *
 * Fan-out pattern:
 *   tts-generate-audio  (orchestrator)
 *     └─ batchTriggerAndWait → tts-chunk × N  (one OpenAI call each)
 *
 * Each chunk task uploads its audio to R2 as a temp file and returns the key.
 * The orchestrator downloads all chunks in order, merges them, uploads the
 * final file, updates D1, then deletes the temp chunk files.
 */

import { task, queue, logger } from "@trigger.dev/sdk/v3";
import OpenAI from "openai";
import {
  uploadToR2,
  downloadFromR2,
  deleteFromR2,
  generateAudioKey,
} from "@/lib/r2-uploader";
import { d1 } from "@/src/db/d1";

const MAX_CHARS = 4000;

// ---------------------------------------------------------------------------
// Shared queue — limits concurrent OpenAI TTS calls to avoid rate limits
// ---------------------------------------------------------------------------

export const ttsChunkQueue = queue({
  name: "tts-chunks",
  concurrencyLimit: 5,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TTSPayload {
  text: string;
  storyId?: string | null;
  goalStoryId?: string | null;
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
// Audio merging
// ---------------------------------------------------------------------------

/**
 * Strip an ID3v2 tag from the start of a buffer (if present).
 *
 * OpenAI TTS returns MP3 data with an ID3v2 header on every chunk.
 * Concatenating raw chunks leaves multiple ID3 headers mid-stream, which
 * confuses many decoders. We keep the header from the first chunk only and
 * strip it from all subsequent ones before joining.
 *
 * ID3v2 layout:
 *   [0-2]  "ID3"
 *   [3-4]  version
 *   [5]    flags
 *   [6-9]  size as 4 × 7-bit synchsafe integer (big-endian, MSB first)
 */
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

function mergeAudioChunks(buffers: Buffer[], format: string): Buffer {
  if (buffers.length === 1) return buffers[0];

  if (format === "mp3") {
    // Keep ID3 header from first chunk; strip from the rest
    return Buffer.concat([buffers[0], ...buffers.slice(1).map(stripId3v2)]);
  }

  // wav/flac/opus/aac/pcm — straight concat (WAV header will only be valid
  // for single-chunk output; multi-chunk WAV needs a proper mux, but OpenAI
  // TTS output is always mp3 by default)
  return Buffer.concat(buffers);
}

// ---------------------------------------------------------------------------
// Text chunking
// ---------------------------------------------------------------------------

function chunkText(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];

  const chunks: string[] = [];
  let current = "";

  for (const para of text.split("\n\n")) {
    if (current.length + para.length + 2 <= MAX_CHARS) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) chunks.push(current);
      if (para.length > MAX_CHARS) {
        current = "";
        for (const sentence of para
          .replace(/\. /g, ".|")
          .replace(/! /g, "!|")
          .replace(/\? /g, "?|")
          .split("|")) {
          if (current.length + sentence.length + 1 <= MAX_CHARS) {
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
    await d1.execute({
      sql: `UPDATE generation_jobs SET status = ?, error = ?, updated_at = ? WHERE id = ?`,
      args: [status, JSON.stringify({ message: extra.error }), now, jobId],
    });
  } else if (extra?.result) {
    await d1.execute({
      sql: `UPDATE generation_jobs SET status = ?, result = ?, updated_at = ? WHERE id = ?`,
      args: [status, JSON.stringify(extra.result), now, jobId],
    });
  } else {
    await d1.execute({
      sql: `UPDATE generation_jobs SET status = ?, updated_at = ? WHERE id = ?`,
      args: [status, now, jobId],
    });
  }
}

// ---------------------------------------------------------------------------
// Chunk task — one OpenAI TTS call, result stored in R2
// ---------------------------------------------------------------------------

export const ttsChunkTask = task({
  id: "tts-chunk",
  queue: ttsChunkQueue,
  maxDuration: 120, // single chunk should never take >2 min
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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const params: Parameters<typeof openai.audio.speech.create>[0] = {
      model,
      input: chunk,
      voice: voice as Parameters<typeof openai.audio.speech.create>[0]["voice"],
      response_format:
        responseFormat as Parameters<typeof openai.audio.speech.create>[0]["response_format"],
      ...(model !== "gpt-4o-mini-tts" ? { speed } : {}),
      ...(instructions && { instructions }),
    };

    const resp = await openai.audio.speech.create(params);
    const buf = Buffer.from(await resp.arrayBuffer());

    await uploadToR2({
      key: tempKey,
      body: buf,
      contentType: `audio/${responseFormat}`,
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
    if (payload.jobId) {
      const message = error instanceof Error ? error.message : "TTS generation failed";
      await updateJob(payload.jobId, "FAILED", { error: message }).catch(() => {});
      logger.error("tts.job_failed", { jobId: payload.jobId, storyId: payload.storyId, error: message });
    }
  },
  run: async (payload: TTSPayload) => {
    const {
      text,
      storyId,
      goalStoryId,
      jobId,
      voice = "onyx",
      model = "gpt-4o-mini-tts",
      responseFormat = "mp3",
      speed = 0.9,
      instructions,
      userEmail,
    } = payload;

    const chunks = chunkText(text);
    const batchId = jobId ?? `tts-${Date.now()}`;

    logger.info("tts.started", {
      storyId,
      jobId,
      chunks: chunks.length,
      textLen: text.length,
      voice,
      model,
    });

    // Build chunk payloads — assign temp R2 keys upfront so we can clean up on failure
    const chunkPayloads: ChunkPayload[] = chunks.map((chunk, index) => ({
      chunk,
      index,
      total: chunks.length,
      tempKey: `tts-chunks/${batchId}-${index}.${responseFormat}`,
      voice,
      model,
      responseFormat,
      speed,
      instructions,
    }));

    // Fan-out: all chunks run in parallel, capped by ttsChunkQueue concurrencyLimit
    const results = await ttsChunkTask.batchTriggerAndWait(
      chunkPayloads.map((p) => ({ payload: p })),
    );

    const failedChunks = results.runs.filter((r) => !r.ok);
    if (failedChunks.length > 0) {
      throw new Error(`${failedChunks.length}/${chunks.length} chunk(s) failed`);
    }

    // Download chunks in order and merge
    const audioBuffers = await Promise.all(
      chunkPayloads.map((p) => downloadFromR2(p.tempKey)),
    );
    const combined = mergeAudioChunks(audioBuffers, responseFormat);
    logger.info("tts.chunks_merged", { storyId, chunks: chunks.length, sizeBytes: combined.length });

    // Upload final audio
    const baseKey = generateAudioKey("graphql-tts");
    const key = responseFormat === "mp3" ? baseKey : baseKey.replace(/\.mp3$/, `.${responseFormat}`);
    const result = await uploadToR2({
      key,
      body: combined,
      contentType: `audio/${responseFormat}`,
      metadata: {
        voice,
        model,
        textLength: String(text.length),
        chunks: String(chunks.length),
        ...(instructions && { instructions }),
      },
    });

    const audioUrl = result.publicUrl ?? "";
    logger.info("tts.r2_uploaded", { storyId, key, sizeBytes: combined.length });

    // Clean up temp chunk files
    await Promise.all(chunkPayloads.map((p) => deleteFromR2(p.tempKey).catch(() => {})));
    logger.info("tts.chunks_cleaned", { storyId, count: chunkPayloads.length });

    // Update D1 stories row
    if (goalStoryId) {
      const now = new Date().toISOString();
      await d1.execute({
        sql: `UPDATE goal_stories SET audio_key = ?, audio_url = ?, audio_generated_at = ?, updated_at = ? WHERE id = ?`,
        args: [key, audioUrl, now, now, goalStoryId],
      });
      logger.info("tts.goal_story_updated", { goalStoryId, audioUrl });
    } else if (storyId && userEmail) {
      const now = new Date().toISOString();
      await d1.execute({
        sql: `UPDATE stories SET audio_key = ?, audio_url = ?, audio_generated_at = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
        args: [key, audioUrl, now, now, storyId, userEmail],
      });
      logger.info("tts.story_updated", { storyId, audioUrl });
    }

    // Mark job SUCCEEDED
    if (jobId) {
      await updateJob(jobId, "SUCCEEDED", { result: { audioUrl } });
    }

    return { audioUrl, key, sizeBytes: combined.length };
  },
});
