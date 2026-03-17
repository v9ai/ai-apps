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
    voice,
    model,
    speed,
    responseFormat,
    instructions,
  } = args.input;

  if (!text) {
    throw new Error("Text is required");
  }

  // Deduplication: check for any RUNNING job for this story.
  if (storyId) {
    const existing = await neonSql`
      SELECT id, created_at, updated_at FROM generation_jobs
      WHERE story_id = ${storyId} AND user_id = ${userEmail} AND type = 'AUDIO' AND status = 'RUNNING'
      ORDER BY created_at DESC LIMIT 1`;
    if (existing.length > 0) {
      const existingJobId = existing[0].id as string;
      const lastUpdate = new Date(existing[0].updated_at as string ?? existing[0].created_at as string).getTime();
      const ageMs = Date.now() - lastUpdate;

      if (ageMs < 10 * 60 * 1000) {
        console.log(`[TTS:dedup] returning existing job`, { existingJobId, storyId, ageMs });
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

      console.warn(`[TTS:stale] marking stale job FAILED`, { existingJobId, ageMs: Math.round(ageMs / 1000) });
      await neonSql`UPDATE generation_jobs SET status = 'FAILED', error = ${JSON.stringify({ message: "Job timed out (stale RUNNING state)" })}, updated_at = NOW() WHERE id = ${existingJobId}`.catch((e) => {
        console.error(`[TTS:stale] failed to mark stale job FAILED`, { existingJobId, error: String(e) });
      });
    }
  }

  const jobId = crypto.randomUUID();

  if (storyId) {
    const storyRows = await neonSql`SELECT goal_id FROM stories WHERE id = ${storyId}`;
    if (storyRows.length === 0) {
      console.warn(`[TTS:job] story not found`, { storyId, userEmail });
    }
    const goalId = (storyRows[0]?.goal_id as number | undefined) ?? null;
    await neonSql`INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress) VALUES (${jobId}, ${userEmail}, 'AUDIO', ${goalId}, ${storyId}, 'RUNNING', 0)`;
    console.log(`[TTS:job] created job`, { jobId, storyId, goalId });
  } else {
    console.error(`[TTS:job] no storyId — job will not be tracked`, { jobId });
  }

  const openAIVoice = voice?.toLowerCase() ?? "onyx";
  const openAIModel =
    model === "GPT_4O_MINI_TTS"
      ? "gpt-4o-mini-tts"
      : model === "TTS_1_HD"
        ? "tts-1-hd"
        : "tts-1";
  const format = responseFormat?.toLowerCase() ?? "mp3";

  const ttsPayload: TTSPayload = {
    text,
    storyId: storyId != null ? String(storyId) : null,
    jobId,
    voice: openAIVoice,
    model: openAIModel,
    responseFormat: format,
    speed: speed ?? 0.9,
    userEmail,
    ...(instructions ? { instructions } : {}),
  };

  console.log(`[TTS] dispatching job=${jobId} storyId=${storyId} model=${openAIModel} voice=${openAIVoice} textLen=${text.length}`);

  try {
    const handle = await tasks.trigger("tts-generate-audio", ttsPayload);
    console.log(`[TTS] dispatched job=${jobId} triggerRunId=${handle.id}`);
  } catch (err) {
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
