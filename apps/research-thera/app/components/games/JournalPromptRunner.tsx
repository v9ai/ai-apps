"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, Card, Flex, Grid, Heading, Text, Callout } from "@radix-ui/themes";
import { CheckCircledIcon, CheckIcon } from "@radix-ui/react-icons";

type EmojiOption = { emoji: string; label: string };
type JournalOption = string | EmojiOption;

type JournalStep = {
  prompt: string;
  options: JournalOption[];
  allowCustom?: boolean;
};

type Content = {
  prompts: JournalStep[];
  writeToNote?: boolean;
};

function isEmojiOption(o: JournalOption): o is EmojiOption {
  return typeof o === "object" && o !== null && "emoji" in o && "label" in o;
}

function optionLabel(o: JournalOption): string {
  return isEmojiOption(o) ? o.label : o;
}

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
      };

  const invalid =
    !parsed ||
    !Array.isArray(parsed.prompts) ||
    parsed.prompts.length === 0 ||
    parsed.prompts.some(
      (p) => !p || typeof p.prompt !== "string" || !Array.isArray(p.options) || p.options.length === 0,
    );

  if (invalid) {
    return (
      <Callout.Root color="red">
        <Callout.Text>
          {isRo ? "Acest joc are conținut invalid." : "This journal game has invalid content."}
        </Callout.Text>
      </Callout.Root>
    );
  }

  const step = parsed!.prompts[idx];
  const current = answers[idx] ?? "";
  const isLast = idx === parsed!.prompts.length - 1;

  function pick(label: string) {
    const next = [...answers];
    next[idx] = label;
    setAnswers(next);
  }

  function advance() {
    if (!current.trim()) return;
    if (isLast) {
      const text = parsed!.prompts
        .map((p, i) => `**${p.prompt}**\n\n→ ${answers[i] ?? ""}`)
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
        <Flex
          direction="column"
          align="center"
          justify="center"
          gap="3"
          p="5"
          style={{ height: "100%", minHeight: 240 }}
        >
          <CheckCircledIcon
            width={large ? 48 : 32}
            height={large ? 48 : 32}
            color="var(--green-9)"
          />
          <Heading size={large ? "8" : "5"}>{t.saved}</Heading>
          <Text size={large ? "4" : "2"} color="gray" align="center">
            {parsed!.writeToNote ? t.savedToNotes : t.savedMsg}
          </Text>
        </Flex>
      </Card>
    );
  }

  const promptSize = large
    ? ({ initial: "5", md: "7" } as const)
    : ({ initial: "4", md: "4" } as const);

  const useEmojiLayout = isEmojiOption(step.options[0]);

  return (
    <Card size={large ? "4" : "2"} style={{ height: "100%" }}>
      <Flex
        direction="column"
        gap={large ? "5" : "4"}
        p={large ? "5" : "4"}
        height="100%"
      >
        <Flex justify="between" align="center">
          <Text size={large ? "3" : "2"} color="gray">
            {t.promptOf(idx, parsed!.prompts.length)}
          </Text>
        </Flex>
        <Heading size={promptSize} style={{ lineHeight: 1.35 }}>
          {step.prompt}
        </Heading>

        {useEmojiLayout ? (
          <Grid
            columns={{ initial: "3", md: "3", lg: "6" }}
            gap={large ? "3" : "2"}
          >
            {step.options.map((o) => {
              const opt = isEmojiOption(o) ? o : { emoji: "•", label: String(o) };
              const selected = current === opt.label;
              return (
                <Box
                  key={opt.label}
                  role="button"
                  tabIndex={0}
                  onClick={() => pick(opt.label)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick(opt.label);
                    }
                  }}
                  style={{
                    cursor: "pointer",
                    aspectRatio: "1 / 1",
                    minHeight: large ? 112 : 96,
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-3)",
                    background: selected ? "var(--indigo-a4)" : "var(--gray-a2)",
                    border: selected
                      ? "2px solid var(--indigo-9)"
                      : "2px solid var(--gray-a4)",
                    transition: "background 120ms, border-color 120ms",
                    touchAction: "manipulation",
                    userSelect: "none",
                    WebkitTapHighlightColor: "transparent",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <Text
                    style={{
                      fontSize: large ? 72 : 56,
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                  >
                    {opt.emoji}
                  </Text>
                  <Text
                    size={large ? "3" : "2"}
                    align="center"
                    weight="medium"
                    style={{ lineHeight: 1.2 }}
                  >
                    {opt.label}
                  </Text>
                </Box>
              );
            })}
          </Grid>
        ) : (
          <Flex direction="column" gap={large ? "3" : "2"}>
            {step.options.map((o) => {
              const label = optionLabel(o);
              const selected = current === label;
              return (
                <Box
                  key={label}
                  role="button"
                  tabIndex={0}
                  onClick={() => pick(label)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick(label);
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
                      {label}
                    </Text>
                  </Flex>
                </Box>
              );
            })}
          </Flex>
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
            onClick={advance}
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
