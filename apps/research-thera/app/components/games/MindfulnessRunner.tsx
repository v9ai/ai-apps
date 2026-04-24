"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Card, Flex, Heading, Text, Progress, Callout } from "@radix-ui/themes";
import { CheckCircledIcon, PlayIcon, PauseIcon } from "@radix-ui/react-icons";

type Step = {
  durationSeconds: number;
  instruction: string;
  cue?: string;
};

type Content = { steps: Step[] };

export function MindfulnessRunner({
  content,
  onFinish,
  submitting,
}: {
  content: string;
  onFinish: (responses: Record<string, unknown>, durationSeconds: number) => void;
  submitting: boolean;
}) {
  const parsed = useMemo<Content | null>(() => {
    try {
      return JSON.parse(content) as Content;
    } catch {
      return null;
    }
  }, [content]);

  const steps = useMemo(() => parsed?.steps ?? [], [parsed]);
  const totalSeconds = useMemo(
    () => steps.reduce((sum, s) => sum + (Number(s.durationSeconds) || 0), 0),
    [steps],
  );

  const [startedAt] = useState(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds elapsed within the current step
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || done || steps.length === 0) return;
    timerRef.current = window.setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [running, done, steps.length]);

  useEffect(() => {
    const step = steps[idx];
    if (!step) return;
    if (elapsed >= step.durationSeconds) {
      if (idx === steps.length - 1) {
        setRunning(false);
        setDone(true);
        onFinish({ completedSteps: steps.length }, Math.round((Date.now() - startedAt) / 1000));
      } else {
        setIdx(idx + 1);
        setElapsed(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed, idx]);

  if (!parsed || steps.length === 0) {
    return (
      <Callout.Root color="red">
        <Callout.Text>This mindfulness game has invalid content.</Callout.Text>
      </Callout.Root>
    );
  }

  if (done) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="3" p="5">
          <CheckCircledIcon width="32" height="32" color="var(--green-9)" />
          <Heading size="5">Practice complete</Heading>
          <Text size="2" color="gray">
            Nice work — take one more slow breath before you move on.
          </Text>
        </Flex>
      </Card>
    );
  }

  const step = steps[idx];
  const stepProgress = Math.min(100, (elapsed / step.durationSeconds) * 100);
  const overallSecondsDone =
    steps.slice(0, idx).reduce((s, v) => s + v.durationSeconds, 0) + elapsed;
  const overallProgress = Math.min(100, (overallSecondsDone / totalSeconds) * 100);

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="center">
          <Text size="2" color="gray">
            Step {idx + 1} of {steps.length}
          </Text>
          <Text size="2" color="gray">
            {Math.ceil(totalSeconds - overallSecondsDone)}s left
          </Text>
        </Flex>

        <Box>
          <Progress value={overallProgress} size="1" />
        </Box>

        {step.cue && (
          <Heading size="8" align="center" style={{ letterSpacing: "-0.02em" }}>
            {step.cue}
          </Heading>
        )}
        <Text size="4" align="center">
          {step.instruction}
        </Text>

        <Box>
          <Progress value={stepProgress} size="2" color="indigo" />
          <Flex justify="between" mt="1">
            <Text size="1" color="gray">
              {elapsed}s
            </Text>
            <Text size="1" color="gray">
              {step.durationSeconds}s
            </Text>
          </Flex>
        </Box>

        <Flex justify="center" gap="3">
          {!running ? (
            <Button onClick={() => setRunning(true)} disabled={submitting}>
              <PlayIcon /> {elapsed === 0 && idx === 0 ? "Start" : "Resume"}
            </Button>
          ) : (
            <Button variant="soft" color="gray" onClick={() => setRunning(false)}>
              <PauseIcon /> Pause
            </Button>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
