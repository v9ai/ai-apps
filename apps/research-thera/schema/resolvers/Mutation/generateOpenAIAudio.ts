import type { MutationResolvers } from "./../../types.generated";
import { sql as neonSql } from "@/src/db/neon";
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
  // Jobs whose updated_at is older than 10 min are considered stale (Trigger.dev
  // MAX_DURATION_EXCEEDED does not always fire onFailure) — mark them FAILED and allow a new run.
  if (entityStoryId) {
    const existing = await neonSql`
      SELECT id, created_at, updated_at FROM generation_jobs
      WHERE story_id = ${entityStoryId} AND user_id = ${userEmail} AND type = 'AUDIO' AND status = 'RUNNING'
      ORDER BY created_at DESC LIMIT 1`;
    if (existing.length > 0) {
      const existingJobId = existing[0].id as string;
      // Use updated_at for staleness so in-progress jobs (with progress updates) aren't killed early
      const lastUpdate = new Date(existing[0].updated_at as string ?? existing[0].created_at as string).getTime();
      const ageMs = Date.now() - lastUpdate;

      if (ageMs < 10 * 60 * 1000) {
        console.log(`[TTS:dedup] returning existing job`, { existingJobId, entityStoryId, ageMs });
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
      console.warn(`[TTS:stale] marking stale job FAILED`, { existingJobId, ageMs: Math.round(ageMs / 1000) });
      await neonSql`UPDATE generation_jobs SET status = 'FAILED', error = ${JSON.stringify({ message: "Job timed out (stale RUNNING state)" })}, updated_at = NOW() WHERE id = ${existingJobId}`.catch((e) => {
        console.error(`[TTS:stale] failed to mark stale job FAILED`, { existingJobId, error: String(e) });
      });
    }
  }

  // Create a RUNNING job for tracking + deduplication
  const jobId = crypto.randomUUID();

  if (isGoalStory && goalStoryId) {
    // Fetch goal_id from goal_stories table
    const goalStoryRows = await neonSql`SELECT goal_id FROM goal_stories WHERE id = ${goalStoryId}`;
    if (goalStoryRows.length === 0) {
      console.warn(`[TTS:job] goal_story not found`, { goalStoryId, userEmail });
    }
    const goalId = (goalStoryRows[0]?.goal_id as number | undefined) ?? null;
    await neonSql`INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress) VALUES (${jobId}, ${userEmail}, 'AUDIO', ${goalId}, ${goalStoryId}, 'RUNNING', 0)`;
    console.log(`[TTS:job] created job`, { jobId, goalStoryId, goalId });
  } else if (storyId) {
    const storyRows = await neonSql`SELECT goal_id FROM stories WHERE id = ${storyId} AND user_id = ${userEmail}`;
    if (storyRows.length === 0) {
      console.warn(`[TTS:job] story not found`, { storyId, userEmail });
    }
    const goalId = (storyRows[0]?.goal_id as number | undefined) ?? null;
    await neonSql`INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress) VALUES (${jobId}, ${userEmail}, 'AUDIO', ${goalId}, ${storyId}, 'RUNNING', 0)`;
    console.log(`[TTS:job] created job`, { jobId, storyId, goalId });
  } else {
    console.error(`[TTS:job] no storyId or goalStoryId — job will not be tracked`, { jobId });
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

  console.log(`[TTS] dispatching job=${jobId} storyId=${entityStoryId} model=${openAIModel} voice=${openAIVoice} textLen=${text.length}`);

  try {
    const handle = await tasks.trigger("tts-generate-audio", ttsPayload);
    console.log(`[TTS] dispatched job=${jobId} triggerRunId=${handle.id}`);
  } catch (err) {
    // Trigger dispatch failed — mark the job as FAILED so the client stops polling
    const errorMessage = err instanceof Error ? err.message : "Failed to dispatch TTS job";
    console.error(`[TTS] dispatch FAILED job=${jobId}: ${errorMessage}`);
    if (jobId) {
      const now = new Date().toISOString();
      await neonSql`UPDATE generation_jobs SET status = 'FAILED', error = ${JSON.stringify({ message: errorMessage })}, updated_at = ${now} WHERE id = ${jobId}`.catch(() => {});
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
