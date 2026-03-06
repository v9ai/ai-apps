"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Flex,
  Button,
  Box,
  Text,
  Dialog,
} from "@radix-ui/themes";
import { PlusIcon, ReloadIcon } from "@radix-ui/react-icons";
import { LoadingDots } from "./LoadingDots";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";

interface StudyTopicDialogProps {
  selectedStudyTopic: { req: AiInterviewPrepRequirement; topic: string } | null;
  onClose: () => void;
  studyTopicLoading: boolean;
  studyTopicError: string | null;
  onGenerate: () => void;
}

export function StudyTopicDialog({
  selectedStudyTopic,
  onClose,
  studyTopicLoading,
  studyTopicError,
  onGenerate,
}: StudyTopicDialogProps) {
  return (
    <Dialog.Root
      open={!!selectedStudyTopic}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Content maxWidth="680px" style={{ maxHeight: "85vh", overflowY: "auto", width: "calc(100vw - 48px)" }}>
        {selectedStudyTopic && (
          <>
            <Box style={{ height: "4px", backgroundColor: "var(--violet-9)", marginBottom: "16px" }} />
            <Dialog.Title>{selectedStudyTopic.topic}</Dialog.Title>
            <Flex align="center" gap="2" mb="4">
              <Text size="1" color="gray" as="div">Part of:</Text>
              <Text size="1" color="violet" weight="medium" as="div" style={{ cursor: "default" }}>
                {selectedStudyTopic.req.requirement}
              </Text>
            </Flex>
            <Box pt="2">
              {studyTopicLoading ? (
                <Flex direction="column" gap="3" py="4" align="center">
                  <Text size="2" color="gray">Generating focused deep-dive…</Text>
                  <LoadingDots />
                </Flex>
              ) : studyTopicError ? (
                <Flex direction="column" gap="2">
                  <Text size="2" color="red">{studyTopicError}</Text>
                  <Button size="1" variant="soft" onClick={onGenerate}>
                    <ReloadIcon /> Retry
                  </Button>
                </Flex>
              ) : (() => {
                const d = selectedStudyTopic.req.studyTopicDeepDives?.find(
                  (d) => d.topic === selectedStudyTopic.topic,
                );
                return d?.deepDive ? (
                  <>
                    <Flex justify="end" mb="2">
                      <Button variant="ghost" size="1" color="gray" onClick={onGenerate}>
                        <ReloadIcon /> Regenerate
                      </Button>
                    </Flex>
                    <Box className="deep-dive-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.deepDive}</ReactMarkdown>
                    </Box>
                  </>
                ) : (
                  <Flex direction="column" align="start" gap="2" py="2">
                    <Text size="2" color="gray">No deep dive generated yet.</Text>
                    <Button size="2" variant="soft" onClick={onGenerate}>
                      <PlusIcon /> Generate deep dive
                    </Button>
                  </Flex>
                );
              })()}
            </Box>
            <Flex justify="end" mt="4" pt="4" style={{ borderTop: "1px solid var(--gray-4)" }}>
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
