"use client";

import { useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  Separator,
  Spinner,
  AlertDialog,
} from "@radix-ui/themes";
import { GlassButton } from "@/app/components/GlassButton";
import {
  useGetTherapeuticQuestionsQuery,
  useGenerateTherapeuticQuestionsMutation,
  useDeleteTherapeuticQuestionsMutation,
} from "@/app/__generated__/hooks";

interface QuestionsSectionProps {
  goalId: number;
  hasResearch: boolean;
}

export default function QuestionsSection({ goalId, hasResearch }: QuestionsSectionProps) {
  const { data, refetch } = useGetTherapeuticQuestionsQuery({
    variables: { goalId },
  });
  const questions = data?.therapeuticQuestions ?? [];

  const [generateQuestions, { loading: generating }] = useGenerateTherapeuticQuestionsMutation({
    onCompleted: () => refetch(),
  });

  const [deleteQuestions, { loading: deleting }] = useDeleteTherapeuticQuestionsMutation({
    onCompleted: () => refetch(),
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleGenerate = async () => {
    setMessage(null);
    try {
      const result = await generateQuestions({ variables: { goalId } });
      const res = result.data?.generateTherapeuticQuestions;
      if (res?.success) {
        setMessage({ text: res.message || "Questions generated.", type: "success" });
      } else {
        setMessage({ text: res?.message || "Failed to generate questions.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Error generating questions.", type: "error" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteQuestions({ variables: { goalId } });
      setMessage(null);
    } catch (err: any) {
      setMessage({ text: err.message || "Error deleting questions.", type: "error" });
    }
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Heading size="4">
            Therapeutic Questions {questions.length > 0 ? `(${questions.length})` : ""}
          </Heading>
          <Flex gap="2">
            {questions.length > 0 && (
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button variant="soft" color="red" size="2" disabled={deleting || generating}>
                    {deleting ? "Deleting..." : "Clear"}
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 400 }}>
                  <AlertDialog.Title>Clear Questions</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Delete all {questions.length} therapeutic questions for this goal?
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={handleDelete}>Delete</Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            )}
            <GlassButton
              variant="primary"
              size="medium"
              loading={generating}
              disabled={!hasResearch}
              onClick={handleGenerate}
            >
              {generating && <Spinner size="1" />}
              {questions.length > 0 ? "Regenerate" : "Generate Questions"}
            </GlassButton>
          </Flex>
        </Flex>

        {!hasResearch && (
          <Text size="2" color="gray">
            Generate research first to unlock therapeutic questions.
          </Text>
        )}

        {message && (
          <Text size="2" color={message.type === "success" ? "green" : "red"}>
            {message.text}
          </Text>
        )}

        {questions.length > 0 && (
          <>
            <Separator size="4" />
            {questions.map((q) => (
              <Card key={q.id} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Text size="2" weight="bold">{q.question}</Text>
                  <Text size="1" color="gray" style={{ lineHeight: "1.6" }}>
                    {q.rationale}
                  </Text>
                  {q.researchTitle && (
                    <Badge variant="outline" color="indigo" size="1" style={{ width: "fit-content" }}>
                      Based on: {q.researchTitle}
                    </Badge>
                  )}
                </Flex>
              </Card>
            ))}
          </>
        )}
      </Flex>
    </Card>
  );
}
