"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextArea,
  RadioGroup,
  Callout,
} from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";

type Step = {
  kind: "situation" | "thought" | "distortion" | "reframe";
  prompt: string;
  options?: string[];
};

type Content = { steps: Step[] };

export function CBTReframeRunner({
  content,
  onFinish,
  submitting,
}: {
  content: string;
  onFinish: (responses: Record<string, string>, durationSeconds: number) => void;
  submitting: boolean;
}) {
  const parsed = useMemo<Content | null>(() => {
    try {
      return JSON.parse(content) as Content;
    } catch {
      return null;
    }
  }, [content]);

  const [startedAt] = useState<number>(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    return (
      <Callout.Root color="red">
        <Callout.Text>This CBT game has invalid content.</Callout.Text>
      </Callout.Root>
    );
  }

  const step = parsed.steps[idx];
  const key = step.kind;
  const current = answers[key] ?? "";
  const isLast = idx === parsed.steps.length - 1;

  function setCurrent(v: string) {
    setAnswers((a) => ({ ...a, [key]: v }));
  }

  function next() {
    if (!current.trim()) return;
    if (isLast) {
      setDone(true);
      onFinish(answers, Math.round((Date.now() - startedAt) / 1000));
    } else {
      setIdx(idx + 1);
    }
  }

  if (done) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="3" p="5">
          <CheckCircledIcon width="32" height="32" color="var(--green-9)" />
          <Heading size="5">Completed</Heading>
          <Text size="2" color="gray">
            Your reframe was saved.
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="center">
          <Text size="2" color="gray">
            Step {idx + 1} of {parsed.steps.length}
          </Text>
          <Text size="2" color="gray" style={{ textTransform: "capitalize" }}>
            {step.kind.replace("_", " ")}
          </Text>
        </Flex>

        <Heading size="4">{step.prompt}</Heading>

        {step.kind === "distortion" && step.options ? (
          <RadioGroup.Root value={current} onValueChange={setCurrent}>
            <Flex direction="column" gap="2">
              {step.options.map((opt) => (
                <Text as="label" size="2" key={opt}>
                  <Flex gap="2" align="center">
                    <RadioGroup.Item value={opt} />
                    {opt}
                  </Flex>
                </Text>
              ))}
            </Flex>
          </RadioGroup.Root>
        ) : (
          <TextArea
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder="Type your answer…"
            rows={5}
          />
        )}

        <Flex justify="between">
          <Button
            variant="soft"
            color="gray"
            disabled={idx === 0}
            onClick={() => setIdx(Math.max(0, idx - 1))}
          >
            Back
          </Button>
          <Button onClick={next} disabled={!current.trim() || submitting}>
            {isLast ? (submitting ? "Saving…" : "Finish") : "Next"}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
