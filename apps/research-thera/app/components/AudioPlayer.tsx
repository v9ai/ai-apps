"use client";

import { useEffect, useRef, useState } from "react";
import { Flex, Text, Card, Badge, Button, Spinner } from "@radix-ui/themes";
import { SpeakerLoudIcon, StopIcon, DownloadIcon } from "@radix-ui/react-icons";
import {
  useGenerateOpenAiAudioMutation,
  useGetGenerationJobQuery,
  useGetGenerationJobsQuery,
  OpenAittsVoice,
  OpenAittsModel,
  OpenAiAudioFormat,
  JobStatus,
  JobType,
} from "@/app/__generated__/hooks";

interface AudioPlayerProps {
  storyId?: number;
  goalStoryId?: number;
  goalId?: number | null;
  storyContent: string;
  existingAudioUrl?: string | null;
  audioGeneratedAt?: string | null;
  onAudioGenerated?: () => void;
}

function formatDuration(seconds?: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0)
    return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function AudioPlayer({
  storyId,
  goalStoryId,
  goalId,
  storyContent,
  existingAudioUrl,
  audioGeneratedAt,
  onAudioGenerated,
}: AudioPlayerProps) {
  const effectiveStoryId = storyId ?? goalStoryId ?? 0;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [audioSrc, setAudioSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<number | null>(null);
  // Track consecutive null responses from the job query to detect a missing/lost job
  const nullJobCountRef = useRef(0);

  const [generateAudio, { loading: generatingAudio }] =
    useGenerateOpenAiAudioMutation();

  // Poll active job for status
  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: pollingJobId! },
    skip: !pollingJobId,
    pollInterval: 5000,
    onError: () => {
      stopPolling();
      setPollingJobId(null);
      setGenerationMessage(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTtsError("Audio generation failed. Please try again.");
    },
  });

  // On mount: check for any active RUNNING job for this story (survives page refresh)
  const { data: runningJobsData } = useGetGenerationJobsQuery({
    variables: { goalId: goalId ?? undefined, status: "RUNNING" },
    skip: !goalId || Boolean(existingAudioUrl) || Boolean(pollingJobId),
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (pollingJobId || existingAudioUrl) return;
    const runningJob = runningJobsData?.generationJobs?.find(
      // Compare as strings to avoid number/string type mismatch from the DB
      (j) => j.type === JobType.Audio && String(j.storyId) === String(effectiveStoryId),
    );
    if (runningJob) {
      // If the job hasn't been updated in >10 min it's permanently stuck — show error instead of polling.
      const isStale =
        Date.now() - new Date(runningJob.updatedAt).getTime() > 10 * 60 * 1000;
      if (isStale) {
        setTtsError("Previous audio generation appears to have failed. Please try again.");
        return;
      }
      nullJobCountRef.current = 0;
      setPollingJobId(runningJob.id);
      setGenerationMessage("Audio generation in progress…");
      // Guard against infinite polling if the job never reaches a terminal state.
      timeoutRef.current = setTimeout(() => {
        stopPolling();
        setPollingJobId(null);
        setGenerationMessage(null);
        setGenerationProgress(null);
        setTtsError("Audio generation timed out. Please try again.");
      }, 10 * 60 * 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runningJobsData, pollingJobId, existingAudioUrl, effectiveStoryId]);

  // React to job status changes
  useEffect(() => {
    const job = jobData?.generationJob;

    // If we are actively polling but the job is not found in the DB, count consecutive
    // nulls and bail out after 3 to avoid an infinite spinner.
    if (!job && pollingJobId) {
      nullJobCountRef.current += 1;
      if (nullJobCountRef.current >= 3) {
        console.error("[AudioPlayer] job not found after 3 polls, giving up", { pollingJobId });
        stopPolling();
        setPollingJobId(null);
        setGenerationMessage(null);
        setGenerationProgress(null);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setTtsError("Audio generation job not found. Please try again.");
      }
      return;
    }
    if (job) nullJobCountRef.current = 0;

    if (!job) return;

    // Show progress from result metadata if available
    const progress = job.result?.progress;
    if (typeof progress === "number") {
      setGenerationProgress(progress);
    }

    if (job.status === JobStatus.Succeeded) {
      stopPolling();
      setPollingJobId(null);
      setGenerationMessage(null);
      setGenerationProgress(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const audioUrl = job.result?.audioUrl;
      if (audioUrl) {
        setAudioSrc(audioUrl as string);
        if (onAudioGenerated) onAudioGenerated();
      } else {
        console.error("[AudioPlayer] job succeeded but no audioUrl in result", job.result);
        setTtsError("Audio generation completed but no audio URL was returned. Please try again.");
      }
    } else if (job.status === JobStatus.Failed) {
      stopPolling();
      setPollingJobId(null);
      setGenerationMessage(null);
      setGenerationProgress(null);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const errorMsg = job.error?.message ?? "Audio generation failed";
      console.error("[AudioPlayer] generation job failed", { jobId: pollingJobId, error: errorMsg });
      setTtsError(errorMsg);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobData, pollingJobId]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  const handleTextToSpeech = async (regenerate = false) => {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (regenerate) {
      setAudioSrc("");
      setDuration(null);
      setCurrentTime(0);
      setTtsError(null);
    }

    if (!regenerate && audioSrc) {
      audioRef.current?.play();
      return;
    }

    if (!regenerate && existingAudioUrl) {
      setAudioSrc(existingAudioUrl);
      audioRef.current?.play();
      return;
    }

    setTtsError(null);
    setGenerationMessage(null);
    try {
      const result = await generateAudio({
        variables: {
          input: {
            text: storyContent,
            ...(goalStoryId && !storyId
              ? { goalStoryId }
              : { storyId }),
            voice: OpenAittsVoice.Onyx,
            model: OpenAittsModel.Gpt_4OMiniTts,
            responseFormat: OpenAiAudioFormat.Mp3,
            uploadToCloud: true,
          },
        },
      });

      const response = result.data?.generateOpenAIAudio;
      const jobId = response?.jobId;
      if (response?.message) {
        setGenerationMessage(response.message);
      }
      if (jobId) {
        nullJobCountRef.current = 0;
        setPollingJobId(jobId);
        timeoutRef.current = setTimeout(() => {
          stopPolling();
          setPollingJobId(null);
          setGenerationMessage(null);
          setGenerationProgress(null);
          setTtsError("Audio generation timed out. Please try again.");
        }, 10 * 60 * 1000);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Audio generation failed";
      setTtsError(msg);
      console.error("TTS Error:", error);
      stopPlayback();
    }
  };

  const handleDownload = () => {
    if (!audioSrc) return;
    const a = document.createElement("a");
    a.href = audioSrc;
    a.download = `story-${effectiveStoryId}-audio.mp3`;
    a.click();
  };

  // Load existing audio when prop arrives
  useEffect(() => {
    if (existingAudioUrl && !audioSrc) {
      setAudioSrc(existingAudioUrl);
    }
  }, [existingAudioUrl, audioSrc]);

  const isGenerating = generatingAudio || Boolean(pollingJobId);
  const hasAudio = Boolean(audioSrc || existingAudioUrl);

  const timeLabel = duration
    ? `${formatDuration(isPlaying ? currentTime : 0)} / ${formatDuration(duration)}`
    : isPlaying
      ? formatDuration(currentTime)
      : null;

  if (hasAudio) {
    return (
      <Card
        style={{
          background: "var(--indigo-2)",
          borderColor: "var(--indigo-6)",
        }}
      >
        <Flex direction="column" gap="2" p="3">
          <audio
            ref={audioRef}
            src={audioSrc}
            controls
            crossOrigin="anonymous"
            preload="metadata"
            style={{ width: "100%" }}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onTimeUpdate={(e) => {
              setCurrentTime(e.currentTarget.currentTime);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={stopPlayback}
            onError={(e) => {
              console.error("Audio error:", e);
              stopPlayback();
            }}
          />

          <Flex align="center" gap="2" style={{ flexWrap: "wrap" }}>
            <SpeakerLoudIcon color="indigo" />
            <Text size="2" weight="medium" color="indigo">
              Audio Available
            </Text>

            {audioGeneratedAt && (
              <Badge color="indigo" variant="soft" size="1">
                Generated {new Date(audioGeneratedAt).toLocaleDateString()}
              </Badge>
            )}

            {timeLabel && (
              <Badge color="indigo" variant="soft" size="1">
                {timeLabel}
              </Badge>
            )}
          </Flex>

          <Flex gap="2" style={{ flexWrap: "wrap" }}>
            <Button
              color="indigo"
              variant="solid"
              onClick={() => void handleTextToSpeech(false)}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Spinner />
              ) : isPlaying ? (
                <StopIcon />
              ) : (
                <SpeakerLoudIcon />
              )}
              {isPlaying ? "Stop" : "Play"}
            </Button>

            {!isPlaying && (
              <>
                <Button
                  color="indigo"
                  variant="soft"
                  onClick={() => void handleTextToSpeech(true)}
                  disabled={isGenerating || !storyContent}
                >
                  {isGenerating ? <Spinner /> : null}
                  {isGenerating ? "Generating…" : "Regenerate"}
                </Button>

                <Button
                  color="indigo"
                  variant="soft"
                  onClick={handleDownload}
                  disabled={!audioSrc}
                >
                  <DownloadIcon />
                  Download
                </Button>
              </>
            )}
          </Flex>

          {ttsError && (
            <Text size="2" color="red">
              {ttsError}
            </Text>
          )}
        </Flex>
      </Card>
    );
  }

  // No audio yet — show generate button (+ status if generating)
  return (
    <Flex direction="column" gap="2" align="start">
      {isGenerating ? (
        <Card
          style={{
            background: "var(--amber-2)",
            borderColor: "var(--amber-6)",
          }}
        >
          <Flex align="center" gap="3" p="3">
            <Spinner />
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" color="amber">
                Generating audio…
              </Text>
              {generationMessage && (
                <Text size="1" color="gray">
                  {generationMessage}
                </Text>
              )}
              {generationProgress != null && (
                <Text size="1" color="gray">
                  {generationProgress}% complete
                </Text>
              )}
              {pollingJobId && (
                <Text size="1" color="gray" style={{ fontFamily: "monospace", opacity: 0.6 }}>
                  job: {pollingJobId}
                </Text>
              )}
            </Flex>
          </Flex>
        </Card>
      ) : (
        <Flex justify="start" align="center" gap="3">
          <Button
            color="indigo"
            variant="solid"
            onClick={() => void handleTextToSpeech(true)}
            disabled={!storyContent}
          >
            <SpeakerLoudIcon />
            Generate Audio
          </Button>
        </Flex>
      )}
      {ttsError && (
        <Text size="2" color="red">
          {ttsError}
        </Text>
      )}
    </Flex>
  );
}
