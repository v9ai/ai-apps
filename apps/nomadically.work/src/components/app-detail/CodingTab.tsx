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
} from "@radix-ui/themes";
import { PlusIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { useGenerateAgenticCodingMutation } from "@/__generated__/hooks";
import type { TabBaseProps } from "./types";
import { CollapsibleSection } from "./CollapsibleSection";
import { LoadingDots } from "./LoadingDots";

type SectionId = "overview" | "workflow" | "exercises" | "prompts" | "qa" | "failures" | "team" | "outcomes" | "resources";

const TOC_COLOR: Record<SectionId, "violet" | "blue" | "green" | "cyan" | "orange" | "amber" | "gray"> = {
  overview: "violet",
  workflow: "blue",
  exercises: "green",
  prompts: "cyan",
  qa: "green",
  failures: "orange",
  team: "amber",
  outcomes: "gray",
  resources: "gray",
};

const TOC_ITEMS: { id: SectionId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "workflow", label: "Workflow" },
  { id: "exercises", label: "Exercises" },
  { id: "prompts", label: "Prompts" },
  { id: "qa", label: "QA" },
  { id: "failures", label: "Failures" },
  { id: "team", label: "Team" },
  { id: "outcomes", label: "Outcomes" },
  { id: "resources", label: "Resources" },
];

export function CodingTab({ app, isAdmin }: TabBaseProps) {
  const [generateAgenticCoding] = useGenerateAgenticCodingMutation();
  const [generatingAgentic, setGeneratingAgentic] = useState(false);
  const [agenticError, setAgenticError] = useState<string | null>(null);
  const [agenticExerciseOpen, setAgenticExerciseOpen] = useState<number | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

  const scrollTo = (id: string) => {
    document.getElementById(`coding-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Determine which sections exist
  const coding = app.agenticCoding;
  const activeSections = coding ? TOC_ITEMS.filter((item) => {
    switch (item.id) {
      case "overview": return !!coding.overview;
      case "workflow": return !!coding.workflowPattern;
      case "exercises": return coding.exercises.length > 0;
      case "prompts": return (coding.promptTemplates?.length ?? 0) > 0;
      case "qa": return !!coding.qaApproach;
      case "failures": return (coding.failureModes?.length ?? 0) > 0;
      case "team": return !!coding.teamPractices;
      case "outcomes": return (coding.measurableOutcomes?.length ?? 0) > 0;
      case "resources": return (coding.resources?.length ?? 0) > 0;
      default: return false;
    }
  }) : [];

  return (
    <Card mb="5">
      <Flex justify="between" align="center" mb="3">
        <Flex align="center" gap="2">
          <Heading size="4">Agentic Coding</Heading>
          <Badge size="1" variant="soft" color="violet">DeepSeek Reasoner</Badge>
        </Flex>
        {isAdmin && (
          <Flex align="center" gap="2">
            <Button
              variant="soft"
              size="2"
              disabled={generatingAgentic || !app.jobDescription}
              title={!app.jobDescription ? "Add a job description first" : undefined}
              onClick={async () => {
                setGeneratingAgentic(true);
                setAgenticError(null);
                try {
                  await generateAgenticCoding({
                    variables: { applicationId: app.id },
                    refetchQueries: ["GetApplication"],
                  });
                } catch (e) {
                  setAgenticError(e instanceof Error ? e.message : "Generation failed");
                } finally {
                  setGeneratingAgentic(false);
                }
              }}
            >
              <PlusIcon />
              {generatingAgentic ? "Generating\u2026" : app.agenticCoding ? "Regenerate" : "Generate with AI"}
            </Button>
            {agenticError && <Text size="1" color="red">{agenticError}</Text>}
          </Flex>
        )}
      </Flex>

      {generatingAgentic && (
        <Flex direction="column" gap="3" py="6" align="center">
          <Text size="2" color="gray">DeepSeek Reasoner is analysing the job description and crafting an agentic coding guide...</Text>
          <LoadingDots color="var(--violet-9)" />
        </Flex>
      )}

      {!generatingAgentic && !app.agenticCoding && (
        <Text size="2" color="gray">
          No agentic coding analysis yet. Add a job description and click Generate to get a deep analysis of how AI coding agents apply to this role — with exercises and ready-to-use agent prompts.
        </Text>
      )}

      {coding && !generatingAgentic && (
        <Box>
          {/* Sticky TOC */}
          {activeSections.length > 1 && (
            <Flex gap="1" wrap="wrap" mb="4" className="coding-toc">
              {activeSections.map((item) => (
                <Badge
                  key={item.id}
                  size="1"
                  variant="soft"
                  color={TOC_COLOR[item.id]}
                  style={{ cursor: "pointer" }}
                  onClick={() => scrollTo(item.id)}
                >
                  {item.label}
                </Badge>
              ))}
            </Flex>
          )}

          {/* Overview */}
          {coding.overview && (
            <CollapsibleSection title="How Agentic Coding Applies to This Role" id="coding-overview" defaultOpen>
              <Box p="4" style={{ backgroundColor: "var(--violet-2)", borderLeft: "3px solid var(--violet-9)" }}>
                <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{coding.overview}</ReactMarkdown>
                </Box>
              </Box>
            </CollapsibleSection>
          )}

          {/* Workflow Pattern */}
          {coding.workflowPattern && (
            <CollapsibleSection title="30-Minute Development Loop" id="coding-workflow">
              <Box p="4" style={{ backgroundColor: "var(--blue-2)", borderLeft: "3px solid var(--blue-9)" }}>
                <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{coding.workflowPattern}</ReactMarkdown>
                </Box>
              </Box>
            </CollapsibleSection>
          )}

          {/* Exercises */}
          {coding.exercises.length > 0 && (
            <CollapsibleSection title={`Coding Exercises (${coding.exercises.length})`} id="coding-exercises" defaultOpen>
              <Flex direction="column" gap="3">
                {coding.exercises.map((ex, i) => (
                  <Box
                    key={i}
                    p="3"
                    style={{
                      backgroundColor: ex.difficulty === "easy" ? "var(--green-2)" : ex.difficulty === "medium" ? "var(--amber-2)" : "var(--red-2)",
                      borderLeft: `3px solid ${ex.difficulty === "easy" ? "var(--green-9)" : ex.difficulty === "medium" ? "var(--amber-9)" : "var(--red-9)"}`,
                    }}
                  >
                    <Flex justify="between" align="start" gap="2" mb="2">
                      <Text size="2" weight="bold">{i + 1}. {ex.title}</Text>
                      <Badge size="1" variant="soft" color={ex.difficulty === "easy" ? "green" : ex.difficulty === "medium" ? "amber" : "red"} style={{ flexShrink: 0 }}>
                        {ex.difficulty}
                      </Badge>
                    </Flex>
                    <Text size="2" color="gray" as="div" mb="2">{ex.description}</Text>
                    <Flex gap="1" wrap="wrap" mb="2">
                      {ex.skills.map((s) => {
                        const skillKey = `${i}-${s}`;
                        return (
                          <Badge
                            key={s}
                            size="1"
                            variant="outline"
                            color="violet"
                            style={{
                              transition: "transform 150ms ease",
                              transform: hoveredSkill === skillKey ? "scale(1.05)" : "scale(1)",
                              cursor: "default",
                            }}
                            onMouseEnter={() => setHoveredSkill(skillKey)}
                            onMouseLeave={() => setHoveredSkill(null)}
                          >
                            {s}
                          </Badge>
                        );
                      })}
                    </Flex>
                    {ex.hints.length > 0 && (
                      <Box mb="2">
                        <Text size="1" color="gray" weight="medium" mb="1" as="div">Hints</Text>
                        {ex.hints.map((h, hi) => (
                          <Text key={hi} size="1" color="gray" as="div">· {h}</Text>
                        ))}
                      </Box>
                    )}
                    <Box>
                      <Button size="1" variant="soft" color="violet" onClick={() => setAgenticExerciseOpen(agenticExerciseOpen === i ? null : i)}>
                        {agenticExerciseOpen === i ? "Hide agent prompt" : "Show agent prompt"}
                      </Button>
                      {agenticExerciseOpen === i && (
                        <Box mt="2" p="3" style={{ backgroundColor: "var(--gray-1)", border: "1px solid var(--gray-5)" }}>
                          <Text size="1" as="div" style={{ fontFamily: "monospace", color: "var(--gray-8)", marginBottom: 8 }}>$ agent prompt</Text>
                          <Flex justify="between" align="center" mb="2">
                            <Text size="1" color="gray" weight="medium">Claude Code / Cursor prompt</Text>
                            <Button size="1" variant="ghost" color={copiedPrompt === i ? "green" : "gray"} onClick={() => { navigator.clipboard.writeText(ex.agentPrompt); setCopiedPrompt(i); setTimeout(() => setCopiedPrompt(null), 2000); }}>
                              {copiedPrompt === i ? "Copied!" : "Copy"}
                            </Button>
                          </Flex>
                          <Text size="1" as="div" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", color: "var(--gray-11)", lineHeight: 1.6 }}>
                            {ex.agentPrompt}
                          </Text>
                        </Box>
                      )}
                    </Box>
                  </Box>
                ))}
              </Flex>
            </CollapsibleSection>
          )}

          {/* Prompt Templates */}
          {coding.promptTemplates && coding.promptTemplates.length > 0 && (
            <CollapsibleSection title={`Prompt Templates for This Stack (${coding.promptTemplates.length})`} id="coding-prompts">
              <Flex direction="column" gap="3">
                {coding.promptTemplates.map((tpl, i) => {
                  const tplKey = 1000 + i;
                  return (
                    <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderLeft: "3px solid var(--cyan-9)" }}>
                      <Text size="2" weight="bold" mb="1" as="div">{tpl.title}</Text>
                      <Text size="1" color="gray" as="div" mb="1">{tpl.purpose}</Text>
                      <Badge size="1" variant="soft" color="cyan" mb="2" style={{ display: "inline-flex" }}>{tpl.stackContext}</Badge>
                      <Box>
                        <Button size="1" variant="soft" color="cyan" onClick={() => setAgenticExerciseOpen(agenticExerciseOpen === tplKey ? null : tplKey)}>
                          {agenticExerciseOpen === tplKey ? "Hide prompt" : "Show prompt"}
                        </Button>
                        {agenticExerciseOpen === tplKey && (
                          <Box mt="2" p="3" style={{ backgroundColor: "var(--gray-1)", border: "1px solid var(--gray-5)" }}>
                            <Text size="1" as="div" style={{ fontFamily: "monospace", color: "var(--gray-8)", marginBottom: 8 }}>$ agent prompt</Text>
                            <Flex justify="between" align="center" mb="2">
                              <Text size="1" color="gray" weight="medium">Ready-to-use prompt</Text>
                              <Button size="1" variant="ghost" color={copiedPrompt === tplKey ? "green" : "gray"} onClick={() => { navigator.clipboard.writeText(tpl.prompt); setCopiedPrompt(tplKey); setTimeout(() => setCopiedPrompt(null), 2000); }}>
                                {copiedPrompt === tplKey ? "Copied!" : "Copy"}
                              </Button>
                            </Flex>
                            <Text size="1" as="div" style={{ fontFamily: "monospace", whiteSpace: "pre-wrap", color: "var(--gray-11)", lineHeight: 1.6 }}>
                              {tpl.prompt}
                            </Text>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Flex>
            </CollapsibleSection>
          )}

          {/* QA Approach */}
          {coding.qaApproach && (
            <CollapsibleSection title="Validating AI-Generated Code" id="coding-qa">
              <Box p="4" style={{ backgroundColor: "var(--green-2)", borderRadius: "var(--radius-3)", borderLeft: "3px solid var(--green-9)" }}>
                <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{coding.qaApproach}</ReactMarkdown>
                </Box>
              </Box>
            </CollapsibleSection>
          )}

          {/* Failure Modes */}
          {coding.failureModes && coding.failureModes.length > 0 && (
            <CollapsibleSection title={`When Not to Use Agents (${coding.failureModes.length} scenarios)`} id="coding-failures">
              <Flex direction="column" gap="2">
                {coding.failureModes.map((fm, i) => (
                  <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)", borderLeft: "3px solid var(--orange-9)" }}>
                    <Text size="2" weight="bold" mb="1" as="div">{fm.scenario}</Text>
                    <Text size="1" color="gray" as="div" mb="1"><strong>Why agents fail:</strong> {fm.why}</Text>
                    <Text size="1" as="div" style={{ color: "var(--green-11)" }}><strong>Instead:</strong> {fm.alternative}</Text>
                  </Box>
                ))}
              </Flex>
            </CollapsibleSection>
          )}

          {/* Team Practices */}
          {coding.teamPractices && (
            <CollapsibleSection title="Team-Level Agentic Practices" id="coding-team">
              <Box p="4" style={{ backgroundColor: "var(--amber-2)", borderRadius: "var(--radius-3)", borderLeft: "3px solid var(--amber-9)" }}>
                <Box className="deep-dive-content" style={{ fontSize: "var(--font-size-2)", lineHeight: 1.7 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{coding.teamPractices}</ReactMarkdown>
                </Box>
              </Box>
            </CollapsibleSection>
          )}

          {/* Measurable Outcomes */}
          {coding.measurableOutcomes && coding.measurableOutcomes.length > 0 && (
            <CollapsibleSection title="Measurable Outcomes" id="coding-outcomes">
              <Flex direction="column" gap="2">
                {coding.measurableOutcomes.map((mo, i) => (
                  <Box key={i} p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)" }}>
                    <Text size="2" weight="bold" mb="2" as="div">{mo.task}</Text>
                    <Flex gap="3" wrap="wrap">
                      <Box>
                        <Text size="1" color="gray" as="div">Before</Text>
                        <Text size="2" color="red" as="div">{mo.beforeTime}</Text>
                      </Box>
                      <Text size="2" color="gray" style={{ alignSelf: "flex-end", paddingBottom: 2 }}>&rarr;</Text>
                      <Box>
                        <Text size="1" color="gray" as="div">With agents</Text>
                        <Text size="2" color="green" as="div">{mo.afterTime}</Text>
                      </Box>
                    </Flex>
                    <Text size="1" color="gray" mt="1" as="div">{mo.improvement}</Text>
                  </Box>
                ))}
              </Flex>
            </CollapsibleSection>
          )}

          {/* Resources */}
          {coding.resources && coding.resources.length > 0 && (
            <CollapsibleSection title="Resources" id="coding-resources">
              <Flex direction="column" gap="2">
                {coding.resources.map((r, i) => (
                  <Flex key={i} align="start" gap="2" p="3" style={{ backgroundColor: "var(--gray-2)", borderRadius: "var(--radius-2)" }}>
                    <Box style={{ flex: 1 }}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-11)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Text size="2" weight="medium">{r.title}</Text>
                        <ExternalLinkIcon />
                      </a>
                      <Text size="1" color="gray" as="div" mt="1">{r.description}</Text>
                    </Box>
                  </Flex>
                ))}
              </Flex>
            </CollapsibleSection>
          )}

          <Text size="1" color="gray" mt="4" as="div">
            Generated {new Date(coding.generatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Text>
        </Box>
      )}
    </Card>
  );
}
