"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  TextArea,
  Select,
  Text,
} from "@radix-ui/themes";
import {
  useAddMemoryEntryMutation,
  MemoryEntriesDocument,
} from "@/app/__generated__/hooks";

const CATEGORIES = ["observation", "test", "improvement", "decline", "side_effect"];

function num(fd: FormData, key: string): number | null {
  const v = (fd.get(key) as string) ?? "";
  if (!v) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function AddMemoryEntryForm() {
  const [category, setCategory] = useState<string>("observation");
  const [error, setError] = useState<string | null>(null);
  const [addEntry, { loading }] = useAddMemoryEntryMutation({
    refetchQueries: [{ query: MemoryEntriesDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);

    try {
      await addEntry({
        variables: {
          input: {
            category,
            description: ((fd.get("description") as string) ?? "").trim() || null,
            context: ((fd.get("context") as string) ?? "").trim() || null,
            overallScore: num(fd, "overallScore"),
            shortTermScore: num(fd, "shortTermScore"),
            longTermScore: num(fd, "longTermScore"),
            workingMemoryScore: num(fd, "workingMemoryScore"),
            recallSpeed: num(fd, "recallSpeed"),
          },
        },
      });
      form.reset();
      setCategory("observation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log entry");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Category
            </Text>
            <Select.Root value={category} onValueChange={setCategory}>
              <Select.Trigger />
              <Select.Content>
                {CATEGORIES.map((c) => (
                  <Select.Item key={c} value={c}>
                    {c}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Description
          </Text>
          <TextArea
            name="description"
            placeholder="What did you notice? e.g. Forgot a coworker's name."
            rows={2}
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Context (optional)
          </Text>
          <TextField.Root
            name="context"
            placeholder="e.g. After a long workday"
          />
        </Flex>
        <Text size="2" color="gray" weight="medium">
          Scores (0–10, optional)
        </Text>
        <Flex gap="3" wrap="wrap">
          <ScoreField name="overallScore" label="Overall" />
          <ScoreField name="shortTermScore" label="Short-term" />
          <ScoreField name="longTermScore" label="Long-term" />
          <ScoreField name="workingMemoryScore" label="Working" />
          <ScoreField name="recallSpeed" label="Recall speed" />
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading}>
            {loading ? "Logging…" : "Log entry"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}

function ScoreField({ name, label }: { name: string; label: string }) {
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
        placeholder="—"
      />
    </Flex>
  );
}
