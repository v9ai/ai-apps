"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Heading,
  Button,
  Flex,
  Text,
  Box,
  Card,
  Badge,
  Grid,
} from "@radix-ui/themes";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useGenerateDeepResearchMutation } from "@/__generated__/hooks";
import type { TabBaseProps } from "./types";
import { CollapsibleSection } from "./CollapsibleSection";

const CATEGORY_COLORS: Record<string, "teal" | "blue" | "violet" | "cyan" | "green" | "orange" | "red"> = {
  Architecture: "teal",
  Domain: "blue",
  "System Design": "violet",
  Production: "cyan",
  Testing: "green",
  Performance: "orange",
  Security: "red",
};

export function DeepResearchTab({ app, isAdmin }: TabBaseProps) {
  const [generateDeepResearch, { loading }] = useGenerateDeepResearchMutation();
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  const research = app.aiDeepResearch;
  const questions = research?.questions ?? [];

  return (
    <Card mb="5">
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="2">
          <Heading size="4">Deep Research</Heading>
          <Badge size="1" variant="soft" color="purple">Dual-Model</Badge>
        </Flex>
        {isAdmin && research && (
          <Button
            variant="soft"
            size="2"
            disabled={loading}
            onClick={() => {
              generateDeepResearch({
                variables: { applicationId: app.id },
                refetchQueries: ["GetApplication"],
              });
            }}
          >
            <ReloadIcon /> Refresh from D1
          </Button>
        )}
      </Flex>

      {!research && (
        <Text size="2" color="gray">
          No deep research yet. Run <code style={{ fontSize: "var(--font-size-1)", backgroundColor: "var(--gray-3)", padding: "2px 6px", }}>cargo run -- deep-research --app-id {app.id}</code> to generate dual-model research with DeepSeek Reasoner + Qwen Max, then refresh.
        </Text>
      )}

      {questions.length > 0 && (
        <Box>
          {/* Category badges for question selection */}
          <Flex gap="2" wrap="wrap" mb="4">
            {questions.map((q, i) => (
              <Box
                key={i}
                onClick={() => setActiveQuestion(activeQuestion === i ? null : i)}
                style={{
                  cursor: "pointer",
                  padding: "6px 12px",
                  backgroundColor: activeQuestion === i ? `var(--${CATEGORY_COLORS[q.category] ?? "gray"}-9)` : `var(--${CATEGORY_COLORS[q.category] ?? "gray"}-3)`,
                  color: activeQuestion === i ? "var(--gray-1)" : "var(--gray-12)",
                  maxWidth: 240,
                }}
              >
                <Text size="1" weight="bold" style={{ color: activeQuestion === i ? "var(--gray-1)" : `var(--${CATEGORY_COLORS[q.category] ?? "gray"}-11)`, display: "block" }}>
                  {q.category}
                </Text>
                <Text size="1" style={{ color: activeQuestion === i ? "var(--gray-3)" : "var(--gray-11)", display: "block", marginTop: 2 }}>
                  {q.question.slice(0, 60)}{q.question.length > 60 ? "..." : ""}
                </Text>
              </Box>
            ))}
          </Flex>

          {/* Selected question detail */}
          {activeQuestion !== null && questions[activeQuestion] && (() => {
            const q = questions[activeQuestion];
            return (
              <Box>
                <Flex justify="between" align="center" mb="4" p="3" style={{ backgroundColor: "var(--purple-2)", borderLeft: "3px solid var(--purple-9)" }}>
                  <Text size="3" weight="bold">{q.question}</Text>
                  <Text size="2" weight="bold" style={{ color: "var(--purple-11)", whiteSpace: "nowrap", marginLeft: 16 }}>
                    Question {activeQuestion + 1} of {questions.length}
                  </Text>
                </Flex>

                <Grid columns={{ initial: "1", md: "2" }} gap="4">
                  {/* DeepSeek Reasoner column */}
                  <Box style={{ backgroundColor: "var(--blue-2)", padding: 16 }}>
                    <Box mb="3" style={{ backgroundColor: "var(--blue-3)", padding: "8px 12px" }}>
                      <Flex align="center" gap="2">
                        <Badge size="2" variant="solid" color="blue">DeepSeek Reasoner</Badge>
                        <Text size="1" color="gray">{q.deepseek.model}</Text>
                      </Flex>
                    </Box>

                    {q.deepseek.reasoning && (
                      <CollapsibleSection title="Chain of Thought" id={`ds-cot-${activeQuestion}`}>
                        <Box p="3" style={{ backgroundColor: "var(--blue-3)", maxHeight: 300, overflowY: "auto" }}>
                          {q.deepseek.reasoning.split(/\n\n+/).map((paragraph, pi) => (
                            <Text key={pi} as="p" size="1" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: pi > 0 ? 12 : 0, marginBottom: 0 }}>
                              {paragraph}
                            </Text>
                          ))}
                        </Box>
                      </CollapsibleSection>
                    )}

                    <Box p="4" style={{ backgroundColor: "var(--gray-2)" }}>
                      <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.deepseek.content}</ReactMarkdown>
                      </Box>
                    </Box>
                  </Box>

                  {/* Qwen Max column */}
                  <Box style={{ backgroundColor: "var(--orange-2)", padding: 16 }}>
                    <Box mb="3" style={{ backgroundColor: "var(--orange-3)", padding: "8px 12px" }}>
                      <Flex align="center" gap="2">
                        <Badge size="2" variant="solid" color="orange">Qwen Max</Badge>
                        <Text size="1" color="gray">{q.qwen.model}</Text>
                      </Flex>
                    </Box>

                    <Box p="4" style={{ backgroundColor: "var(--gray-2)" }}>
                      <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.qwen.content}</ReactMarkdown>
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              </Box>
            );
          })()}

          <Text size="1" color="gray" mt="4" as="div">
            Generated {new Date(research!.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Text>
        </Box>
      )}
    </Card>
  );
}
