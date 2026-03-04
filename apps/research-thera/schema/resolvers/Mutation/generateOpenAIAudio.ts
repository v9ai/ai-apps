import type { MutationResolvers } from "./../../types.generated";
import { d1 } from "@/src/db/d1";
import { tasks } from "@trigger.dev/sdk/v3";
import type { TTSPayload } from "@/src/trigger/tts-task";

export const generateOpenAIAudio: NonNullable<MutationResolvers['generateOpenAIAudio']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const {
    text,
    storyId,
    goalStoryId,
    voice,
    model,
    speed,
    responseFormat,
    instructions,
  } = args.input;

  if (!text) {
    throw new Error("Text is required");
  }

  // Determine which entity we're generating audio for
  const entityStoryId = storyId ?? goalStoryId;
  const isGoalStory = goalStoryId != null;

  // Deduplication: check for any RUNNING job for this story.
  // Jobs older than 10 min are considered stale (Trigger.dev MAX_DURATION_EXCEEDED
  // does not always fire onFailure) — mark them FAILED and allow a new run.
  if (entityStoryId) {
    const existing = await d1.execute({
      sql: `SELECT id, created_at FROM generation_jobs
            WHERE story_id = ? AND user_id = ? AND type = 'AUDIO' AND status = 'RUNNING'
            ORDER BY created_at DESC LIMIT 1`,
      args: [entityStoryId, userEmail],
    });
    if (existing.rows.length > 0) {
      const existingJobId = existing.rows[0].id as string;
      const createdAt = new Date(existing.rows[0].created_at as string).getTime();
      const ageMs = Date.now() - createdAt;

      if (ageMs < 10 * 60 * 1000) {
        console.log(`[TTS] job ${existingJobId} already running for story ${entityStoryId}`);
        return {
          success: true,
          message: "Audio generation already in progress",
          jobId: existingJobId,
          audioBuffer: null,
          audioUrl: null,
          key: null,
          sizeBytes: null,
          duration: null,
        };
      }

      // Stale job — clean it up before proceeding
      console.warn(`[TTS] job ${existingJobId} stale after ${Math.round(ageMs / 1000)}s, marking FAILED`);
      await d1.execute({
        sql: `UPDATE generation_jobs SET status = 'FAILED', error = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [JSON.stringify({ message: "Job timed out (stale RUNNING state)" }), existingJobId],
      }).catch(() => {});
    }
  }

  // Create a RUNNING job in D1 for tracking + deduplication
  const jobId = crypto.randomUUID();

  if (isGoalStory && goalStoryId) {
    // Fetch goal_id from goal_stories table
    const goalStoryRow = await d1.execute({
      sql: `SELECT goal_id FROM goal_stories WHERE id = ?`,
      args: [goalStoryId],
    });
    const goalId = (goalStoryRow.rows[0]?.goal_id as number | undefined) ?? null;
    await d1.execute({
      sql: `INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress)
            VALUES (?, ?, 'AUDIO', ?, ?, 'RUNNING', 0)`,
      args: [jobId, userEmail, goalId, goalStoryId],
    });
  } else if (storyId) {
    const storyRow = await d1.execute({
      sql: `SELECT goal_id FROM stories WHERE id = ? AND user_id = ?`,
      args: [storyId, userEmail],
    });
    const goalId = (storyRow.rows[0]?.goal_id as number | undefined) ?? null;
    await d1.execute({
      sql: `INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress)
            VALUES (?, ?, 'AUDIO', ?, ?, 'RUNNING', 0)`,
      args: [jobId, userEmail, goalId, storyId],
    });
  }

  const openAIVoice = voice?.toLowerCase() ?? "onyx";
  const openAIModel =
    model === "GPT_4O_MINI_TTS"
      ? "gpt-4o-mini-tts"
      : model === "TTS_1_HD"
        ? "tts-1-hd"
        : "tts-1";
  const format = responseFormat?.toLowerCase() ?? "mp3";

  // Dispatch to Trigger.dev — returns a run handle immediately; task runs async.
  const ttsPayload: TTSPayload = {
    text,
    storyId: storyId != null ? String(storyId) : null,
    goalStoryId: goalStoryId != null ? String(goalStoryId) : undefined,
    jobId,
    voice: openAIVoice,
    model: openAIModel,
    responseFormat: format,
    speed: speed ?? 0.9,
    userEmail,
    ...(instructions ? { instructions } : {}),
  };

  try {
    await tasks.trigger("tts-generate-audio", ttsPayload);
  } catch (err) {
    // Trigger dispatch failed — mark the D1 job as FAILED so the client stops polling
    const errorMessage = err instanceof Error ? err.message : "Failed to dispatch TTS job";
    console.error("[TTS] trigger dispatch failed:", errorMessage);
    if (jobId) {
      const now = new Date().toISOString();
      await d1.execute({
        sql: `UPDATE generation_jobs SET status = 'FAILED', error = ?, updated_at = ? WHERE id = ?`,
        args: [JSON.stringify({ message: errorMessage }), now, jobId],
      }).catch(() => {});
    }
    return {
      success: false,
      message: errorMessage,
      jobId,
      audioBuffer: null,
      audioUrl: null,
      key: null,
      sizeBytes: null,
      duration: null,
    };
  }

  return {
    success: true,
    message: "Audio generation started",
    jobId,
    audioBuffer: null,
    audioUrl: null,
    key: null,
    sizeBytes: null,
    duration: null,
  };
};
