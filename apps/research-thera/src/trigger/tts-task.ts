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
import { sql as neonSql } from "@/src/db/neon";

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
// Markdown stripper — removes formatting that breaks TTS delivery
// ---------------------------------------------------------------------------

function stripMarkdown(text: string): string {
  return text
    // Remove bold/italic: **text** → text, *text* → text, __text__ → text, _text_ → text
    .replace(/\*\*(.+?)\*\*/gs, "$1")
    .replace(/\*(.+?)\*/gs, "$1")
    .replace(/__(.+?)__/gs, "$1")
    .replace(/_(.+?)_/gs, "$1")
    // Remove ATX headings: ## Heading → Heading
    .replace(/^#{1,6}\s+/gm, "")
    // Remove leading bullet/numbered list markers
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    // Collapse triple+ blank lines to double
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Default TTS speaking instructions for therapeutic content
const DEFAULT_TTS_INSTRUCTIONS =
  "Speak in a calm, warm, and gentle therapeutic voice. Pace yourself slowly and deliberately. " +
  "Pause naturally at sentence boundaries and after pause cues. Use a soothing, reassuring tone throughout.";

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
    await neonSql`UPDATE generation_jobs SET status = ${status}, error = ${JSON.stringify({ message: extra.error })}, updated_at = ${now} WHERE id = ${jobId}`;
  } else if (extra?.result) {
    await neonSql`UPDATE generation_jobs SET status = ${status}, result = ${JSON.stringify(extra.result)}, updated_at = ${now} WHERE id = ${jobId}`;
  } else {
    await neonSql`UPDATE generation_jobs SET status = ${status}, updated_at = ${now} WHERE id = ${jobId}`;
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
    const message = error instanceof Error ? error.message : "TTS generation failed";
    logger.error("tts.job_failed", {
      jobId: payload.jobId,
      storyId: payload.storyId,
      goalStoryId: payload.goalStoryId,
      error: message,
    });
    if (payload.jobId) {
      try {
        await updateJob(payload.jobId, "FAILED", { error: message });
        logger.info("tts.job_marked_failed", { jobId: payload.jobId });
      } catch (dbErr) {
        // updateJob itself failed — log so the stale RUNNING job can be diagnosed
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
      goalStoryId,
      jobId,
      voice = "onyx",
      model = "gpt-4o-mini-tts",
      responseFormat = "mp3",
      speed = 0.9,
      userEmail,
    } = payload;

    // Strip any markdown formatting before chunking — ensures clean spoken output
    const cleanText = stripMarkdown(text);

    // Use caller-supplied instructions or fall back to default therapeutic voice guidance
    const instructions = payload.instructions || DEFAULT_TTS_INSTRUCTIONS;

    const chunks = chunkText(cleanText);
    const batchId = jobId ?? `tts-${Date.now()}`;

    logger.info("tts.started", {
      storyId,
      goalStoryId,
      jobId,
      chunks: chunks.length,
      textLen: text.length,
      cleanTextLen: cleanText.length,
      voice,
      model,
    });

    // Mark progress=5 immediately so stale-job detection knows the task actually started
    if (jobId) {
      await updateJob(jobId, "RUNNING", { result: { progress: 5, stage: "started" } }).catch((e) =>
        logger.warn("tts.progress_update_failed", { jobId, stage: "started", error: String(e) }),
      );
    }

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
      logger.error("tts.chunks_failed", { storyId, goalStoryId, failed: failedChunks.length, total: chunks.length, details: failedDetails });
      throw new Error(`${failedChunks.length}/${chunks.length} chunk(s) failed`);
    }

    if (jobId) {
      await updateJob(jobId, "RUNNING", { result: { progress: 60, stage: "merging" } }).catch((e) => {
        logger.warn("tts.progress_update_failed", { jobId, stage: "merging", error: String(e) });
      });
    }

    // Download chunks in order and merge
    const audioBuffers = await Promise.all(
      chunkPayloads.map((p) => downloadFromR2(p.tempKey)),
    );
    const combined = mergeAudioChunks(audioBuffers, responseFormat);
    logger.info("tts.chunks_merged", { storyId, goalStoryId, chunks: chunks.length, sizeBytes: combined.length });

    if (jobId) {
      await updateJob(jobId, "RUNNING", { result: { progress: 80, stage: "uploading" } }).catch((e) => {
        logger.warn("tts.progress_update_failed", { jobId, stage: "uploading", error: String(e) });
      });
    }

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
        textLength: String(cleanText.length),
        chunks: String(chunks.length),
        ...(instructions && { instructions }),
      },
    });

    const audioUrl = result.publicUrl ?? "";
    if (!audioUrl) {
      logger.warn("tts.r2_no_public_url", { storyId, goalStoryId, key });
    }
    logger.info("tts.r2_uploaded", { storyId, goalStoryId, key, sizeBytes: combined.length, audioUrl });

    // Clean up temp chunk files
    await Promise.all(chunkPayloads.map((p) => deleteFromR2(p.tempKey).catch((e) => {
      logger.warn("tts.chunk_delete_failed", { tempKey: p.tempKey, error: String(e) });
    })));
    logger.info("tts.chunks_cleaned", { storyId, goalStoryId, count: chunkPayloads.length });

    // Update Neon stories row
    if (goalStoryId) {
      const now = new Date().toISOString();
      try {
        await neonSql`UPDATE goal_stories SET audio_key = ${key}, audio_url = ${audioUrl}, audio_generated_at = ${now}, updated_at = ${now} WHERE id = ${goalStoryId}`;
        logger.info("tts.goal_story_updated", { goalStoryId, audioUrl, key });
      } catch (dbErr) {
        logger.error("tts.goal_story_update_failed", {
          goalStoryId,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
        throw dbErr; // re-throw so onFailure marks the job FAILED
      }
    } else if (storyId && userEmail) {
      const now = new Date().toISOString();
      try {
        await neonSql`UPDATE stories SET audio_key = ${key}, audio_url = ${audioUrl}, audio_generated_at = ${now}, updated_at = ${now} WHERE id = ${storyId} AND user_id = ${userEmail}`;
        logger.info("tts.story_updated", { storyId, audioUrl, key });
      } catch (dbErr) {
        logger.error("tts.story_update_failed", {
          storyId,
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        });
        throw dbErr;
      }
    } else {
      logger.warn("tts.no_story_target", { storyId, goalStoryId, userEmail: userEmail ? "[set]" : "[missing]", jobId });
    }

    // Mark job SUCCEEDED
    if (jobId) {
      try {
        await updateJob(jobId, "SUCCEEDED", { result: { audioUrl } });
        logger.info("tts.job_succeeded", { jobId, storyId, goalStoryId, audioUrl });
      } catch (dbErr) {
        // Audio was generated and uploaded successfully — only the job status update failed.
        // Log clearly so it can be manually corrected.
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
