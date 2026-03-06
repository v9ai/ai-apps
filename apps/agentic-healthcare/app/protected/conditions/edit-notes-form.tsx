"use client";

import { updateConditionNotes } from "./update-action";
import { Button, Card, Flex, TextArea, Text } from "@radix-ui/themes";
import { useState, useTransition } from "react";
import { CheckIcon, Pencil1Icon } from "@radix-ui/react-icons";

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
    <Card>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <Pencil1Icon style={{ color: "var(--gray-11)" }} />
          <Text size="3" weight="medium">Notes</Text>
        </Flex>
        <TextArea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
          placeholder="Add notes about this condition — symptoms, triggers, treatments tried..."
          rows={4}
          style={{ background: "var(--gray-a2)" }}
        />
        <Flex align="center" justify="between">
          <Flex align="center" gap="2">
            <Button
              size="2"
              onClick={handleSubmit}
              disabled={isPending || notes === (initialNotes ?? "")}
            >
              {isPending ? "Saving..." : "Save notes"}
            </Button>
            {saved && (
              <Flex align="center" gap="1">
                <CheckIcon style={{ color: "var(--green-11)" }} />
                <Text size="1" color="green">Notes saved</Text>
              </Flex>
            )}
          </Flex>
          {notes.length > 0 && (
            <Text size="1" color="gray">{notes.length} characters</Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
