"use client";

import { useState } from "react";
import { Box, Button, Flex, TextField, Text } from "@radix-ui/themes";
import {
  useRecordCognitiveBaselineMutation,
  ProtocolDocument,
} from "../../__generated__/hooks";

function num(fd: FormData, key: string): number | null {
  const v = (fd.get(key) as string) ?? "";
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

type Existing = {
  memoryScore?: number | null;
  focusScore?: number | null;
  processingSpeedScore?: number | null;
  moodScore?: number | null;
  sleepScore?: number | null;
} | null;

const FIELDS: Array<[string, string]> = [
  ["memoryScore", "Memory"],
  ["focusScore", "Focus"],
  ["processingSpeedScore", "Speed"],
  ["moodScore", "Mood"],
  ["sleepScore", "Sleep"],
];

export function CognitiveBaselineForm({
  protocolId,
  existing,
}: {
  protocolId: string;
  slug: string;
  existing: Existing;
}) {
  const [error, setError] = useState<string | null>(null);
  const [recordBaseline, { loading }] = useRecordCognitiveBaselineMutation({
    refetchQueries: [{ query: ProtocolDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await recordBaseline({
        variables: {
          protocolId,
          input: {
            memoryScore: num(fd, "memoryScore"),
            focusScore: num(fd, "focusScore"),
            processingSpeedScore: num(fd, "processingSpeedScore"),
            moodScore: num(fd, "moodScore"),
            sleepScore: num(fd, "sleepScore"),
          },
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save baseline");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex gap="3" wrap="wrap">
          {FIELDS.map(([key, label]) => (
            <Flex
              key={key}
              direction="column"
              gap="1"
              style={{ flex: 1, minWidth: 100 }}
            >
              <Text size="1" color="gray">
                {label}
              </Text>
              <TextField.Root
                name={key}
                type="number"
                step="0.1"
                min="0"
                max="10"
                defaultValue={
                  (existing as Record<string, number | null | undefined> | null)?.[
                    key
                  ] ?? ""
                }
                placeholder="—"
              />
            </Flex>
          ))}
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading} variant="soft">
            {loading ? "Saving…" : existing ? "Update baseline" : "Record baseline"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
