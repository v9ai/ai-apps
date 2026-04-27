"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  Select,
  TextArea,
  Text,
} from "@radix-ui/themes";
import {
  useAddSymptomMutation,
  SymptomsDocument,
} from "../__generated__/hooks";

const SEVERITIES = ["", "mild", "moderate", "severe"] as const;

export function AddSymptomForm() {
  const [severity, setSeverity] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [addSymptom, { loading }] = useAddSymptomMutation({
    refetchQueries: [{ query: SymptomsDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const description = ((fd.get("description") as string) ?? "").trim();
    if (!description) return;
    const loggedAt = ((fd.get("loggedAt") as string) ?? "") || null;

    try {
      await addSymptom({
        variables: {
          input: {
            description,
            severity: severity || null,
            loggedAt,
          },
        },
      });
      form.reset();
      setSeverity("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log symptom");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Description
          </Text>
          <TextArea
            name="description"
            placeholder="What are you experiencing?"
            rows={2}
            required
          />
        </Flex>
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Severity
            </Text>
            <Select.Root value={severity} onValueChange={setSeverity}>
              <Select.Trigger placeholder="Select severity" />
              <Select.Content>
                {SEVERITIES.filter(Boolean).map((s) => (
                  <Select.Item key={s} value={s}>
                    {s}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              When (optional, defaults to now)
            </Text>
            <TextField.Root name="loggedAt" type="datetime-local" />
          </Flex>
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading}>
            {loading ? "Logging…" : "Log symptom"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
