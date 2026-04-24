"use client";

import { Badge, Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { ChevronRightIcon } from "@radix-ui/react-icons";

export type ParentGuide = {
  intro?: string;
  stepsGuide?: string[];
  tips?: string[];
  outro?: string;
};

export function ParentCoachPane({
  parentGuide,
  stepIndex,
  totalSteps,
  completed,
  language = "ro",
}: {
  parentGuide: ParentGuide;
  stepIndex: number;
  totalSteps: number;
  completed: boolean;
  language?: string;
}) {
  const t =
    language === "ro"
      ? {
          header: "Ghid pentru părinte",
          stepLabel: (i: number, n: number) => `Pas ${i + 1} / ${n}`,
          nowLabel: "Acum",
          introLabel: "Înainte să începeți",
          tipsLabel: "Sfaturi",
          outroLabel: "La final",
          done: "Ai reușit ✦",
        }
      : {
          header: "Parent coach",
          stepLabel: (i: number, n: number) => `Step ${i + 1} / ${n}`,
          nowLabel: "Now",
          introLabel: "Before you start",
          tipsLabel: "Tips",
          outroLabel: "At the end",
          done: "Well done ✦",
        };

  const currentGuide = parentGuide.stepsGuide?.[stepIndex];

  return (
    <Card
      size="3"
      style={{
        background:
          "linear-gradient(165deg, var(--amber-2) 0%, var(--amber-3) 100%)",
        border: "1px solid var(--amber-5)",
        height: "100%",
        minHeight: 0,
      }}
    >
      <Flex direction="column" gap="4" p={{ initial: "3", md: "4" }} height="100%">
        <Flex align="center" justify="between" wrap="wrap" gap="2">
          <Flex align="center" gap="2">
            <Badge color="amber" variant="solid" size="2">
              {t.header}
            </Badge>
          </Flex>
          {!completed && (
            <Text size="2" color="amber" weight="medium">
              {t.stepLabel(stepIndex, totalSteps)}
            </Text>
          )}
        </Flex>

        {parentGuide.intro && !completed && (
          <Box>
            <Text
              size="1"
              color="amber"
              weight="medium"
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              {t.introLabel}
            </Text>
            <Text as="p" size="3" mt="1" style={{ lineHeight: 1.55 }}>
              {parentGuide.intro}
            </Text>
          </Box>
        )}

        {!completed && currentGuide && (
          <Box
            style={{
              background: "var(--amber-a4)",
              borderRadius: "var(--radius-3)",
              padding: "var(--space-4)",
              borderLeft: "3px solid var(--amber-9)",
            }}
          >
            <Flex align="center" gap="2" mb="2">
              <ChevronRightIcon color="var(--amber-11)" />
              <Text
                size="1"
                color="amber"
                weight="bold"
                style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                {t.nowLabel}
              </Text>
            </Flex>
            <Text
              as="p"
              size={{ initial: "4", md: "5" }}
              style={{ lineHeight: 1.5, fontWeight: 500 }}
            >
              {currentGuide}
            </Text>
          </Box>
        )}

        {completed && parentGuide.outro && (
          <Box
            style={{
              background: "var(--jade-a4)",
              borderRadius: "var(--radius-3)",
              padding: "var(--space-4)",
              borderLeft: "3px solid var(--jade-9)",
            }}
          >
            <Text
              size="1"
              color="jade"
              weight="bold"
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              {t.outroLabel}
            </Text>
            <Text
              as="p"
              size={{ initial: "4", md: "5" }}
              mt="2"
              style={{ lineHeight: 1.5 }}
            >
              {parentGuide.outro}
            </Text>
            <Text
              as="p"
              size="4"
              color="jade"
              weight="bold"
              mt="3"
              align="center"
            >
              {t.done}
            </Text>
          </Box>
        )}

        {parentGuide.tips && parentGuide.tips.length > 0 && (
          <Box mt="auto">
            <details>
              <summary
                style={{
                  cursor: "pointer",
                  fontSize: "var(--font-size-2)",
                  fontWeight: 500,
                  color: "var(--amber-11)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "var(--space-2) 0",
                }}
              >
                {t.tipsLabel} ({parentGuide.tips.length})
              </summary>
              <Flex direction="column" gap="2" mt="2" pl="3">
                {parentGuide.tips.map((tip, i) => (
                  <Text key={i} size="2" color="gray" style={{ lineHeight: 1.5 }}>
                    • {tip}
                  </Text>
                ))}
              </Flex>
            </details>
          </Box>
        )}
      </Flex>
    </Card>
  );
}
