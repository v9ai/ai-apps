"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, Flex, Heading, Text, Callout } from "@radix-ui/themes";
import { CheckCircledIcon, CheckIcon } from "@radix-ui/react-icons";

type Step = {
  kind: "situation" | "thought" | "distortion" | "reframe";
  prompt: string;
  options: string[];
  allowCustom?: boolean;
};

type Content = { steps: Step[] };

const STEP_KIND_LABEL: Record<Step["kind"], { ro: string; en: string }> = {
  situation: { ro: "situație", en: "situation" },
  thought: { ro: "gând", en: "thought" },
  distortion: { ro: "capcană", en: "distortion" },
  reframe: { ro: "reformulare", en: "reframe" },
};

export function CBTReframeRunner({
  content,
  onFinish,
  submitting,
  onStepChange,
  language = "en",
  large = false,
}: {
  content: string;
  onFinish: (responses: Record<string, string>, durationSeconds: number) => void;
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

  const [startedAt] = useState<number>(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    onStepChange?.(idx, done);
  }, [idx, done, onStepChange]);

  const isRo = language === "ro";
  const t = isRo
    ? {
        stepOf: (i: number, n: number) => `Pasul ${i + 1} din ${n}`,
        back: "Înapoi",
        next: "Mai departe",
        finish: "Gata",
        saving: "Se salvează…",
        completed: "Ai reușit!",
        savedMsg: "Reformularea ta a fost salvată.",
      }
    : {
        stepOf: (i: number, n: number) => `Step ${i + 1} of ${n}`,
        back: "Back",
        next: "Next",
        finish: "Finish",
        saving: "Saving…",
        completed: "Completed",
        savedMsg: "Your reframe was saved.",
      };

  const invalid =
    !parsed ||
    !Array.isArray(parsed.steps) ||
    parsed.steps.length === 0 ||
    parsed.steps.some((s) => !Array.isArray(s.options) || s.options.length === 0);

  if (invalid) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          {isRo ? "Acest joc are conținut invalid." : "This CBT game has invalid content."}
        </Callout.Text>
      </Callout.Root>
    );
  }

  const step = parsed!.steps[idx];
  const key = step.kind;
  const current = answers[key] ?? "";
  const isLast = idx === parsed!.steps.length - 1;

  function pick(opt: string) {
    setAnswers((a) => ({ ...a, [key]: opt }));
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

  const promptSize = large
    ? ({ initial: "5", md: "7" } as const)
    : ({ initial: "4", md: "4" } as const);

  if (done) {
    return (
      <Card style={{ height: "100%" }}>
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="3"
          p="5"
          style={{ minHeight: 240, height: "100%" }}
        >
          <CheckCircledIcon width="48" height="48" color="var(--green-9)" />
          <Heading size={large ? "8" : "5"}>{t.completed}</Heading>
          <Text size="3" color="gray" align="center">
            {t.savedMsg}
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size={large ? "4" : "2"} style={{ height: "100%" }}>
      <Flex
        direction="column"
        gap={large ? "6" : "4"}
        p={large ? "5" : "4"}
        height="100%"
      >
        <Flex justify="between" align="center">
          <Text size={large ? "3" : "2"} color="gray">
            {t.stepOf(idx, parsed!.steps.length)}
          </Text>
          <Text
            size={large ? "3" : "2"}
            color="gray"
            style={{ textTransform: "capitalize" }}
          >
            {STEP_KIND_LABEL[step.kind][isRo ? "ro" : "en"]}
          </Text>
        </Flex>

        <Heading size={promptSize} style={{ lineHeight: 1.3 }}>
          {step.prompt}
        </Heading>

        <Flex direction="column" gap={large ? "3" : "2"}>
          {step.options.map((opt) => {
            const selected = current === opt;
            return (
              <Box
                key={opt}
                role="button"
                tabIndex={0}
                onClick={() => pick(opt)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick(opt);
                  }
                }}
                style={{
                  cursor: "pointer",
                  padding: large ? "var(--space-4)" : "var(--space-3)",
                  minHeight: large ? 64 : 56,
                  borderRadius: "var(--radius-3)",
                  background: selected ? "var(--indigo-a4)" : "var(--gray-a2)",
                  border: selected
                    ? "2px solid var(--indigo-9)"
                    : "2px solid var(--gray-a4)",
                  transition: "background 120ms, border-color 120ms",
                  touchAction: "manipulation",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Flex gap="3" align="center">
                  <Box
                    style={{
                      flex: "0 0 auto",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: selected
                        ? "2px solid var(--indigo-9)"
                        : "2px solid var(--gray-a6)",
                      background: selected ? "var(--indigo-9)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    {selected && <CheckIcon width="18" height="18" />}
                  </Box>
                  <Text size={large ? "4" : "3"} style={{ lineHeight: 1.4 }}>
                    {opt}
                  </Text>
                </Flex>
              </Box>
            );
          })}
        </Flex>

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
          <Button
            onClick={next}
            disabled={!current.trim() || submitting}
            size={large ? "4" : "3"}
          >
            {isLast ? (submitting ? t.saving : t.finish) : t.next}
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
