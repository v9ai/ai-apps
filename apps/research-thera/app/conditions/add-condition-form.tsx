"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  TextArea,
  Text,
} from "@radix-ui/themes";
import {
  useAddConditionMutation,
  ConditionsDocument,
} from "../__generated__/hooks";

export function AddConditionForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [addCondition, { loading }] = useAddConditionMutation({
    refetchQueries: [{ query: ConditionsDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = ((formData.get("name") as string) ?? "").trim();
    const notes = ((formData.get("notes") as string) ?? "").trim() || null;
    if (!name) return;

    try {
      await addCondition({ variables: { input: { name, notes } } });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add condition");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Condition name
          </Text>
          <TextField.Root name="name" placeholder="e.g. Alopecia" required />
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Notes (optional)
          </Text>
          <TextArea name="notes" placeholder="Any relevant details…" rows={2} />
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add condition"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
