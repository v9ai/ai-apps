"use client";

import { useEffect, useMemo, useState } from "react";
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

const STEP_KIND_LABEL: Record<
  Step["kind"],
  { ro: string; en: string }
> = {
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
        placeholder: "Scrie răspunsul tău…",
      }
    : {
        stepOf: (i: number, n: number) => `Step ${i + 1} of ${n}`,
        back: "Back",
        next: "Next",
        finish: "Finish",
        saving: "Saving…",
        completed: "Completed",
        savedMsg: "Your reframe was saved.",
        placeholder: "Type your answer…",
      };

  if (!parsed || !Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          {isRo ? "Acest joc are conținut invalid." : "This CBT game has invalid content."}
        </Callout.Text>
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

  const promptSize = large
    ? ({ initial: "5", md: "7" } as const)
    : ({ initial: "4", md: "4" } as const);

  if (done) {
    return (
      <Card style={{ height: "100%" }}>
        <Flex direction="column" align="center" justify="center" gap="3" p="5" style={{ minHeight: 240, height: "100%" }}>
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
      <Flex direction="column" gap={large ? "6" : "4"} p={large ? "5" : "4"} height="100%">
        <Flex justify="between" align="center">
          <Text size={large ? "3" : "2"} color="gray">
            {t.stepOf(idx, parsed.steps.length)}
          </Text>
          <Text size={large ? "3" : "2"} color="gray" style={{ textTransform: "capitalize" }}>
            {STEP_KIND_LABEL[step.kind][isRo ? "ro" : "en"]}
          </Text>
        </Flex>

        <Heading size={promptSize} style={{ lineHeight: 1.3 }}>
          {step.prompt}
        </Heading>

        {step.kind === "distortion" && step.options ? (
          <RadioGroup.Root value={current} onValueChange={setCurrent} size={large ? "3" : "2"}>
            <Flex direction="column" gap={large ? "3" : "2"}>
              {step.options.map((opt) => (
                <Text as="label" size={large ? "4" : "2"} key={opt} style={{ cursor: "pointer", lineHeight: 1.4 }}>
                  <Flex gap="3" align="start">
                    <RadioGroup.Item value={opt} style={{ marginTop: 4 }} />
                    <span>{opt}</span>
                  </Flex>
                </Text>
              ))}
            </Flex>
          </RadioGroup.Root>
        ) : (
          <TextArea
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            placeholder={t.placeholder}
            rows={large ? 6 : 5}
            size={large ? "3" : "2"}
            style={{ fontSize: large ? "1.25rem" : undefined, lineHeight: 1.5 }}
          />
        )}

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
