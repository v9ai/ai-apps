import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { sql as neonSql } from "@/src/db/neon";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const generateOpenAIAudio: NonNullable<MutationResolvers['generateOpenAIAudio']> = async (_parent, args, ctx) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const { text, storyId, instructions } = args.input;

  if (!text) {
    throw new Error("Text is required");
  }

  // Deduplication: check for any RUNNING job for this story.
  if (storyId) {
    const existing = await neonSql`
      SELECT id, created_at, updated_at FROM generation_jobs
      WHERE story_id = ${storyId} AND user_id = ${userId} AND type = 'AUDIO' AND status = 'RUNNING'
      ORDER BY created_at DESC LIMIT 1`;
    if (existing.length > 0) {
      const existingJobId = existing[0].id as string;
      const lastUpdate = new Date(existing[0].updated_at as string ?? existing[0].created_at as string).getTime();
      const ageMs = Date.now() - lastUpdate;

      if (ageMs < 5 * 60 * 1000) {
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

      // Stale job — mark failed
      await neonSql`UPDATE generation_jobs SET status = 'FAILED', error = ${JSON.stringify({ message: "Job timed out" })}, updated_at = NOW() WHERE id = ${existingJobId}`.catch(() => {});
    }
  }

  const jobId = crypto.randomUUID();

  // Look up story language from DB
  let storyLanguage = "English";
  if (storyId) {
    const storyRows = await neonSql`
      SELECT goal_id, language FROM stories
      WHERE id = ${storyId} AND (user_id = ${userId} OR user_id IS NULL)`;
    if (storyRows.length === 0) {
      throw new GraphQLError("Not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    storyLanguage = (storyRows[0].language as string) || "English";
    const goalId = (storyRows[0].goal_id as number | undefined) ?? null;
    await neonSql`INSERT INTO generation_jobs (id, user_id, type, goal_id, story_id, status, progress) VALUES (${jobId}, ${userId}, 'AUDIO', ${goalId}, ${storyId}, 'RUNNING', 0)`;
  }

  console.log(`[TTS] dispatching LangGraph job=${jobId} storyId=${storyId} language=${storyLanguage} textLen=${text.length}`);

  // Fire-and-forget: dispatch to LangGraph and update job status async
  runGraphAndWait("tts", {
    input: {
      story_id: storyId ?? null,
      language: storyLanguage,
      instructions: instructions || null,
      // Python graphs still expect the `user_email` key; it holds the caller's
      // user_id (UUID after migration 0004). The backend uses this value as
      // public.*.user_id in SQL, so the UUID is correct here.
      user_email: userId,
    },
  }).then(async (res) => {
    const error = res?.error as string | undefined;
    if (error) {
      console.error(`[TTS] LangGraph failed job=${jobId}: ${error}`);
      await neonSql`UPDATE generation_jobs SET status = 'FAILED', error = ${JSON.stringify({ message: error })}, updated_at = NOW() WHERE id = ${jobId}`.catch(() => {});
    } else {
      const audioUrl = res?.audio_url as string | undefined;
      console.log(`[TTS] LangGraph succeeded job=${jobId} audioUrl=${audioUrl}`);
      await neonSql`UPDATE generation_jobs SET status = 'SUCCEEDED', result = ${JSON.stringify({ audioUrl })}, updated_at = NOW() WHERE id = ${jobId}`.catch(() => {});
    }
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "TTS generation failed";
    console.error(`[TTS] LangGraph error job=${jobId}: ${message}`);
    await neonSql`UPDATE generation_jobs SET status = 'FAILED', error = ${JSON.stringify({ message })}, updated_at = NOW() WHERE id = ${jobId}`.catch(() => {});
  });

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
