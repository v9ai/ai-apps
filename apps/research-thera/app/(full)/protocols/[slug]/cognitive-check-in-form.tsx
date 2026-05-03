"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  TextArea,
  Text,
} from "@radix-ui/themes";
import {
  useRecordCognitiveCheckInMutation,
  ProtocolDocument,
} from "@/app/__generated__/hooks";

function num(fd: FormData, key: string): number | null {
  const v = (fd.get(key) as string) ?? "";
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

const FIELDS: Array<[string, string]> = [
  ["memoryScore", "Memory"],
  ["focusScore", "Focus"],
  ["processingSpeedScore", "Speed"],
  ["moodScore", "Mood"],
  ["sleepScore", "Sleep"],
];

export function CognitiveCheckInForm({
  protocolId,
}: {
  protocolId: string;
  slug: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [recordCheckIn, { loading }] = useRecordCognitiveCheckInMutation({
    refetchQueries: [{ query: ProtocolDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await recordCheckIn({
        variables: {
          protocolId,
          input: {
            memoryScore: num(fd, "memoryScore"),
            focusScore: num(fd, "focusScore"),
            processingSpeedScore: num(fd, "processingSpeedScore"),
            moodScore: num(fd, "moodScore"),
            sleepScore: num(fd, "sleepScore"),
            sideEffects: ((fd.get("sideEffects") as string) ?? "").trim() || null,
            notes: ((fd.get("notes") as string) ?? "").trim() || null,
          },
        },
      });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record check-in");
    }
  }

  return (
    <Box mt="2">
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
                  placeholder="—"
                />
              </Flex>
            ))}
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Side effects (optional)
            </Text>
            <TextField.Root name="sideEffects" placeholder="e.g. mild jitteriness" />
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Notes (optional)
            </Text>
            <TextArea name="notes" placeholder="What changed?" rows={2} />
          </Flex>
          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}
          <Box>
            <Button type="submit" disabled={loading} variant="soft">
              {loading ? "Recording…" : "Record check-in"}
            </Button>
          </Box>
        </Flex>
      </form>
    </Box>
  );
}
