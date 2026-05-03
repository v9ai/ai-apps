"use client";

import { useState } from "react";
import { Box, Button, Flex, TextField, Text } from "@radix-ui/themes";
import {
  useSetMemoryBaselineMutation,
  MemoryEntriesDocument,
} from "@/app/__generated__/hooks";

function num(fd: FormData, key: string): number | null {
  const v = (fd.get(key) as string) ?? "";
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

type BaselineLite = {
  overallScore?: number | null;
  shortTermScore?: number | null;
  longTermScore?: number | null;
  workingMemoryScore?: number | null;
  recallSpeed?: number | null;
};

export function SetMemoryBaselineForm({
  baseline,
}: {
  baseline: BaselineLite | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [setBaseline, { loading }] = useSetMemoryBaselineMutation({
    refetchQueries: [{ query: MemoryEntriesDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      await setBaseline({
        variables: {
          input: {
            overallScore: num(fd, "overallScore"),
            shortTermScore: num(fd, "shortTermScore"),
            longTermScore: num(fd, "longTermScore"),
            workingMemoryScore: num(fd, "workingMemoryScore"),
            recallSpeed: num(fd, "recallSpeed"),
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
          <BaselineField
            name="overallScore"
            label="Overall"
            defaultValue={baseline?.overallScore ?? null}
          />
          <BaselineField
            name="shortTermScore"
            label="Short-term"
            defaultValue={baseline?.shortTermScore ?? null}
          />
          <BaselineField
            name="longTermScore"
            label="Long-term"
            defaultValue={baseline?.longTermScore ?? null}
          />
          <BaselineField
            name="workingMemoryScore"
            label="Working"
            defaultValue={baseline?.workingMemoryScore ?? null}
          />
          <BaselineField
            name="recallSpeed"
            label="Recall speed"
            defaultValue={baseline?.recallSpeed ?? null}
          />
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading} variant="soft">
            {loading
              ? "Saving…"
              : baseline
                ? "Update baseline"
                : "Set baseline"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}

function BaselineField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
}) {
  return (
    <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 120 }}>
      <Text size="1" color="gray">
        {label}
      </Text>
      <TextField.Root
        name={name}
        type="number"
        step="0.1"
        min="0"
        max="10"
        defaultValue={defaultValue ?? ""}
        placeholder="—"
      />
    </Flex>
  );
}
