"use client";

import { useMemo, useState } from "react";
import { Button, Card, Flex, Heading, Text, TextArea, Callout } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";

type Content = { prompts: string[]; writeToNote?: boolean };

export function JournalPromptRunner({
  content,
  onFinish,
  submitting,
}: {
  content: string;
  onFinish: (responsesText: string, durationSeconds: number) => void;
  submitting: boolean;
}) {
  const parsed = useMemo<Content | null>(() => {
    try {
      return JSON.parse(content) as Content;
    } catch {
      return null;
    }
  }, [content]);

  const [startedAt] = useState(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  if (!parsed || !Array.isArray(parsed.prompts) || parsed.prompts.length === 0) {
    return (
      <Callout.Root color="red">
        <Callout.Text>This journal game has invalid content.</Callout.Text>
      </Callout.Root>
    );
  }

  const prompt = parsed.prompts[idx];
  const current = answers[idx] ?? "";
  const isLast = idx === parsed.prompts.length - 1;

  function setCurrent(v: string) {
    const next = [...answers];
    next[idx] = v;
    setAnswers(next);
  }

  function advance() {
    if (!current.trim()) return;
    if (isLast) {
      const text = parsed!.prompts
        .map((p, i) => `**${p}**\n\n${answers[i] ?? ""}`)
        .join("\n\n---\n\n");
      setDone(true);
      onFinish(text, Math.round((Date.now() - startedAt) / 1000));
    } else {
      setIdx(idx + 1);
    }
  }

  if (done) {
    return (
      <Card>
        <Flex direction="column" align="center" gap="3" p="5">
          <CheckCircledIcon width="32" height="32" color="var(--green-9)" />
          <Heading size="5">Saved</Heading>
          <Text size="2" color="gray">
            {parsed.writeToNote ? "Your reflection was saved to Notes." : "Your reflection was saved."}
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
            Prompt {idx + 1} of {parsed.prompts.length}
          </Text>
        </Flex>
        <Heading size="4">{prompt}</Heading>
        <TextArea
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Write freely. No one else will see this."
          rows={8}
        />
        <Flex justify="between">
          <Button
            variant="soft"
            color="gray"
            disabled={idx === 0}
            onClick={() => setIdx(Math.max(0, idx - 1))}
          >
            Back
          </Button>
          <Button onClick={advance} disabled={!current.trim() || submitting}>
            {isLast ? (submitting ? "Saving…" : "Finish") : "Next"}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
