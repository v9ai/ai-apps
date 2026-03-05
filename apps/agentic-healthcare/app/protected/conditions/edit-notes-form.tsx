"use client";

import { updateConditionNotes } from "./update-action";
import { Box, Button, Flex, TextArea, Text } from "@radix-ui/themes";
import { useState, useTransition } from "react";

export function EditNotesForm({
  conditionId,
  initialNotes,
}: {
  conditionId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("notes", notes);
      await updateConditionNotes(conditionId, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="medium" color="gray">Notes</Text>
      <TextArea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this condition..."
        rows={3}
      />
      <Flex align="center" gap="2">
        <Button
          size="1"
          onClick={handleSubmit}
          disabled={isPending || notes === (initialNotes ?? "")}
        >
          {isPending ? "Saving..." : "Save notes"}
        </Button>
        {saved && <Text size="1" color="green">Saved</Text>}
      </Flex>
    </Flex>
  );
}
