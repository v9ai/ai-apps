"use client";

import { useState, useTransition } from "react";
import { Badge, Box, Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { askHealthQuestion } from "../blood-tests/search-actions";
import Link from "next/link";

type QAResult = {
  answer: string;
  sources: Array<{
    testId: string;
    similarity: number;
    fileName: string;
    testDate: string | null;
  }>;
  conditions: Array<{
    conditionId: string;
    content: string;
    similarity: number;
  }>;
};

export function QAForm() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QAResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAsk() {
    if (!question.trim()) return;
    startTransition(async () => {
      const res = await askHealthQuestion(question);
      setResult(res);
    });
  }

  return (
    <Flex direction="column" gap="4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
      >
        <Flex gap="2">
          <Box flexGrow="1">
            <TextField.Root
              placeholder="Ask a health question about your data..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </Box>
          <Button type="submit" disabled={isPending || !question.trim()}>
            {isPending ? "Thinking..." : "Ask"}
          </Button>
        </Flex>
      </form>

      {result && (
        <Flex direction="column" gap="4">
          <Card>
            <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
              {result.answer}
            </Text>
          </Card>

          {result.sources.length > 0 && (
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Sources
              </Text>
              <Flex gap="2" wrap="wrap">
                {result.sources.map((s) => (
                  <Badge key={s.testId} color="blue" variant="soft" asChild>
                    <Link href={`/protected/blood-tests/${s.testId}`}>
                      {s.fileName} ({(s.similarity * 100).toFixed(0)}%)
                    </Link>
                  </Badge>
                ))}
              </Flex>
            </Flex>
          )}

          {result.conditions.length > 0 && (
            <Flex direction="column" gap="2">
              <Text size="2" weight="bold">
                Related Conditions
              </Text>
              <Flex gap="2" wrap="wrap">
                {result.conditions.map((c) => (
                  <Badge key={c.conditionId} color="orange" variant="soft">
                    {c.content.replace("Health condition: ", "").split("\n")[0]} (
                    {(c.similarity * 100).toFixed(0)}%)
                  </Badge>
                ))}
              </Flex>
            </Flex>
          )}
        </Flex>
      )}
    </Flex>
  );
}
