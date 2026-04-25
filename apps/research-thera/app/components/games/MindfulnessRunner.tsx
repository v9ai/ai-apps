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
  onStepChange,
  language = "en",
  large = false,
}: {
  content: string;
  onFinish: (responses: Record<string, unknown>, durationSeconds: number) => void;
  submitting: boolean;
  onStepChange?: (index: number, done: boolean) => void;
  language?: string;
  large?: boolean;
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
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    onStepChange?.(idx, done);
  }, [idx, done, onStepChange]);

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

  const isRo = language === "ro";
  const t = isRo
    ? {
        stepOf: (i: number, n: number) => `Pasul ${i + 1} din ${n}`,
        secondsLeft: (s: number) => `${s}s rămase`,
        start: "Începe",
        resume: "Continuă",
        pause: "Pauză",
        complete: "Bravo!",
        completeMsg: "Bravo — mai ia o respirație înainte să mergi mai departe.",
      }
    : {
        stepOf: (i: number, n: number) => `Step ${i + 1} of ${n}`,
        secondsLeft: (s: number) => `${s}s left`,
        start: "Start",
        resume: "Resume",
        pause: "Pause",
        complete: "Practice complete",
        completeMsg: "Nice work — take one more slow breath before you move on.",
      };

  if (!parsed || steps.length === 0) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          {isRo ? "Acest joc are conținut invalid." : "This mindfulness game has invalid content."}
        </Callout.Text>
      </Callout.Root>
    );
  }

  if (done) {
    return (
      <Card style={{ height: "100%" }}>
        <Flex direction="column" align="center" justify="center" gap="3" p="5" style={{ height: "100%", minHeight: 240 }}>
          <CheckCircledIcon width={large ? 64 : 32} height={large ? 64 : 32} color="var(--green-9)" />
          <Heading size={large ? "9" : "5"}>{t.complete}</Heading>
          <Text size={large ? "4" : "2"} color="gray" align="center" style={{ maxWidth: 420 }}>
            {t.completeMsg}
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
    <Card size={large ? "4" : "2"} style={{ height: "100%" }}>
      <Flex direction="column" gap={large ? "6" : "4"} p={large ? "5" : "4"} height="100%">
        <Flex justify="between" align="center">
          <Text size={large ? "3" : "2"} color="gray">
            {t.stepOf(idx, steps.length)}
          </Text>
          <Text size={large ? "3" : "2"} color="gray">
            {t.secondsLeft(Math.ceil(totalSeconds - overallSecondsDone))}
          </Text>
        </Flex>

        <Box>
          <Progress value={overallProgress} size="1" />
        </Box>

        {/* Screen-reader-only announcement so eyes-closed clients hear step transitions */}
        <Box
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0,0,0,0)",
            whiteSpace: "nowrap",
            border: 0,
          }}
        >
          {`${t.stepOf(idx, steps.length)}${step.cue ? `: ${step.cue}` : ""}. ${step.instruction}`}
        </Box>

        <Flex direction="column" align="center" justify="center" gap={large ? "5" : "3"} style={{ flex: 1, minHeight: 0 }}>
          {step.cue && (
            <Heading
              size={large ? "9" : "8"}
              align="center"
              style={{
                letterSpacing: "-0.02em",
                fontSize: large ? "clamp(3rem, 8vw, 7rem)" : undefined,
                lineHeight: 1.05,
                userSelect: "none",
                WebkitUserSelect: "none",
                WebkitTouchCallout: "none",
              }}
            >
              {step.cue}
            </Heading>
          )}
          <Text
            size={large ? "6" : "4"}
            align="center"
            style={{
              maxWidth: large ? 620 : 420,
              lineHeight: 1.4,
              fontSize: large ? "clamp(1.25rem, 2.5vw, 2rem)" : undefined,
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            {step.instruction}
          </Text>
        </Flex>

        <Box>
          <Progress value={stepProgress} size={large ? "3" : "2"} color="indigo" />
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
            <Button onClick={() => setRunning(true)} disabled={submitting} size={large ? "4" : "3"}>
              <PlayIcon /> {elapsed === 0 && idx === 0 ? t.start : t.resume}
            </Button>
          ) : (
            <Button variant="soft" color="gray" onClick={() => setRunning(false)} size={large ? "4" : "3"}>
              <PauseIcon /> {t.pause}
            </Button>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
