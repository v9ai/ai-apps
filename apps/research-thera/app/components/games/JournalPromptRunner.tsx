"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, Flex, Heading, Text, TextArea, Callout } from "@radix-ui/themes";
import { CheckCircledIcon } from "@radix-ui/react-icons";

type Content = { prompts: string[]; writeToNote?: boolean };

export function JournalPromptRunner({
  content,
  onFinish,
  submitting,
  onStepChange,
  language = "en",
  large = false,
}: {
  content: string;
  onFinish: (responsesText: string, durationSeconds: number) => void;
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

  const [startedAt] = useState(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    onStepChange?.(idx, done);
  }, [idx, done, onStepChange]);

  const isRo = language === "ro";
  const t = isRo
    ? {
        promptOf: (i: number, n: number) => `Întrebarea ${i + 1} din ${n}`,
        back: "Înapoi",
        next: "Mai departe",
        finish: "Gata",
        saving: "Se salvează…",
        saved: "Salvat",
        savedToNotes: "Reflecția ta a fost salvată în Notițe.",
        savedMsg: "Reflecția ta a fost salvată.",
        placeholder: "Scrie liber. Nimeni altcineva nu va vedea.",
      }
    : {
        promptOf: (i: number, n: number) => `Prompt ${i + 1} of ${n}`,
        back: "Back",
        next: "Next",
        finish: "Finish",
        saving: "Saving…",
        saved: "Saved",
        savedToNotes: "Your reflection was saved to Notes.",
        savedMsg: "Your reflection was saved.",
        placeholder: "Write freely. No one else will see this.",
      };

  if (!parsed || !Array.isArray(parsed.prompts) || parsed.prompts.length === 0) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          {isRo ? "Acest joc are conținut invalid." : "This journal game has invalid content."}
        </Callout.Text>
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
      <Card style={{ height: "100%" }}>
        <Flex direction="column" align="center" justify="center" gap="3" p="5" style={{ height: "100%", minHeight: 240 }}>
          <CheckCircledIcon width={large ? 48 : 32} height={large ? 48 : 32} color="var(--green-9)" />
          <Heading size={large ? "8" : "5"}>{t.saved}</Heading>
          <Text size={large ? "4" : "2"} color="gray" align="center">
            {parsed.writeToNote ? t.savedToNotes : t.savedMsg}
          </Text>
        </Flex>
      </Card>
    );
  }

  const promptSize = large
    ? ({ initial: "5", md: "7" } as const)
    : ({ initial: "4", md: "4" } as const);

  return (
    <Card size={large ? "4" : "2"} style={{ height: "100%" }}>
      <Flex direction="column" gap={large ? "5" : "4"} p={large ? "5" : "4"} height="100%">
        <Flex justify="between" align="center">
          <Text size={large ? "3" : "2"} color="gray">
            {t.promptOf(idx, parsed.prompts.length)}
          </Text>
        </Flex>
        <Heading size={promptSize} style={{ lineHeight: 1.35 }}>
          {prompt}
        </Heading>
        <TextArea
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder={t.placeholder}
          rows={large ? 10 : 8}
          size={large ? "3" : "2"}
          style={{ fontSize: large ? "1.25rem" : undefined, lineHeight: 1.5, flex: 1 }}
        />
        <Flex justify="between" mt="auto">
          <Button
            variant="soft"
            color="gray"
            size={large ? "4" : "3"}
            disabled={idx === 0}
            onClick={() => setIdx(Math.max(0, idx - 1))}
          >
            {t.back}
          </Button>
          <Button onClick={advance} disabled={!current.trim() || submitting} size={large ? "4" : "3"}>
            {isLast ? (submitting ? t.saving : t.finish) : t.next}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
