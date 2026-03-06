"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Flex,
  Button,
  Box,
  Text,
  Badge,
  Dialog,
} from "@radix-ui/themes";
import { Link2Icon, PlusIcon, ReloadIcon } from "@radix-ui/react-icons";
import { LoadingDots } from "./LoadingDots";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";
import Link from "next/link";

interface RequirementDialogProps {
  selectedReq: AiInterviewPrepRequirement | null;
  onClose: () => void;
  deepDiveLoading: boolean;
  deepDiveError: string | null;
  onGenerateDeepDive: () => void;
  onOpenStudyTopic: (e: React.MouseEvent, req: AiInterviewPrepRequirement, topic: string) => void;
  onLinkSource: (requirement: string) => void;
  companyKey: string | null;
}

export function RequirementDialog({
  selectedReq,
  onClose,
  deepDiveLoading,
  deepDiveError,
  onGenerateDeepDive,
  onOpenStudyTopic,
  onLinkSource,
  companyKey,
}: RequirementDialogProps) {
  return (
    <Dialog.Root
      open={!!selectedReq}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh", overflowY: "auto", width: "calc(100vw - 48px)" }}>
        {selectedReq && (
          <>
            <Dialog.Title>{selectedReq.requirement}</Dialog.Title>
            {selectedReq.sourceQuote && (
              <Box
                mb="4"
                pl="3"
                role="button"
                tabIndex={0}
                style={{ borderLeft: "3px solid var(--accent-6)", cursor: "pointer" }}
                onClick={() => onClose()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onClose();
                }}
              >
                <Text size="1" color="gray" as="div" style={{ fontStyle: "italic" }}>
                  &ldquo;{selectedReq.sourceQuote}&rdquo;
                </Text>
              </Box>
            )}

            {/* Interview questions */}
            <Flex align="center" gap="2" mb="2" style={{ borderLeft: "3px solid var(--accent-6)", paddingLeft: "8px" }}>
              <Text size="1" color="gray" weight="medium" as="div">
                INTERVIEW QUESTIONS
              </Text>
            </Flex>
            <Flex direction="column" gap="2" mb="4">
              {selectedReq.questions.map((q, i) => (
                <Text key={q} size="2" as="div">
                  {i + 1}. {q}
                </Text>
              ))}
            </Flex>

            {/* Study topics */}
            <Flex align="center" gap="2" mb="2" style={{ borderLeft: "3px solid var(--accent-6)", paddingLeft: "8px" }}>
              <Text size="1" color="gray" weight="medium" as="div">
                STUDY TOPICS
              </Text>
              <Text size="1" color="gray" as="div">
                {selectedReq.studyTopicDeepDives?.filter((d) => d.deepDive).length ?? 0}/{selectedReq.studyTopics.length} studied
              </Text>
            </Flex>
            <Flex gap="2" wrap="wrap" mb="4">
              {selectedReq.studyTopics.map((t) => {
                const hasDeepDive = selectedReq.studyTopicDeepDives?.some((d) => d.topic === t && d.deepDive);
                return (
                  <Badge
                    key={t}
                    size="1"
                    variant={hasDeepDive ? "soft" : "outline"}
                    color="violet"
                    role="button"
                    tabIndex={0}
                    onClick={(e) => onOpenStudyTopic(e, selectedReq, t)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") onOpenStudyTopic(e as any, selectedReq, t);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {t}
                  </Badge>
                );
              })}
            </Flex>

            {/* Deep dive section */}
            <Box pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
              <Flex justify="between" align="center" mb="3">
                <Flex align="center" gap="2" style={{ borderLeft: "3px solid var(--accent-6)", paddingLeft: "8px" }}>
                  <Text size="1" color="gray" weight="medium" as="div">
                    DEEP DIVE
                  </Text>
                </Flex>
                {selectedReq.deepDive && !deepDiveLoading && (
                  <Button variant="ghost" size="1" color="gray" onClick={onGenerateDeepDive}>
                    <ReloadIcon /> Regenerate
                  </Button>
                )}
              </Flex>
              {deepDiveLoading ? (
                <Flex direction="column" gap="3" py="4" align="center">
                  <Text size="2" color="gray">Generating deep-dive…</Text>
                  <LoadingDots />
                </Flex>
              ) : deepDiveError ? (
                <Flex direction="column" gap="2">
                  <Text size="2" color="red">{deepDiveError}</Text>
                  <Button size="1" variant="soft" onClick={onGenerateDeepDive}>
                    <ReloadIcon /> Retry
                  </Button>
                </Flex>
              ) : selectedReq.deepDive ? (
                <Box className="deep-dive-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{selectedReq.deepDive}</ReactMarkdown>
                </Box>
              ) : (
                <Flex direction="column" align="start" gap="2">
                  <Text size="2" color="gray">No deep dive generated yet.</Text>
                  <Button size="2" variant="soft" onClick={onGenerateDeepDive}>
                    <PlusIcon /> Generate deep dive
                  </Button>
                </Flex>
              )}
            </Box>

            <Flex justify="between" mt="4" pt="4" align="center" style={{ borderTop: "1px solid var(--gray-4)" }}>
              <Flex gap="2" align="center">
                {companyKey && (
                  <Button variant="ghost" size="2" asChild>
                    <Link href={`/prep/${companyKey}`}>View full prep →</Link>
                  </Button>
                )}
                <Dialog.Close>
                  <Button
                    variant="ghost"
                    size="2"
                    color="amber"
                    onClick={() => onLinkSource(selectedReq.requirement)}
                  >
                    <Link2Icon />
                    {selectedReq.sourceQuote ? "Change link" : "Link source"}
                  </Button>
                </Dialog.Close>
              </Flex>
              <Dialog.Close>
                <Button variant="soft" color="gray" size="2">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
