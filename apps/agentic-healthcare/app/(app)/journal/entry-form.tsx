"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Flex, Text, TextArea, TextField } from "@radix-ui/themes";
import { Plus } from "lucide-react";
import { addJournalEntry } from "./actions";

export function EntryForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="soft" size="2" onClick={() => setOpen(true)}>
        <Plus size={14} /> New journal entry
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addJournalEntry(formData);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
    >
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">Title (optional)</Text>
          <TextField.Root name="title" placeholder="How I felt today" />
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="1" color="gray">Body</Text>
          <TextArea
            name="body"
            placeholder="Woke up with brain fog, cleared after the morning walk..."
            rows={5}
            required
          />
        </Flex>

        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: "1 1 160px", minWidth: 160 }}>
            <Text size="1" color="gray">Mood</Text>
            <TextField.Root name="mood" placeholder="calm, anxious, energetic…" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: "1 1 200px", minWidth: 200 }}>
            <Text size="1" color="gray">Tags</Text>
            <TextField.Root name="tags" placeholder="sleep, run, meds" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: "1 1 200px", minWidth: 200 }}>
            <Text size="1" color="gray">When</Text>
            <TextField.Root name="logged_at" type="datetime-local" />
          </Flex>
        </Flex>

        <Flex gap="2">
          <Button type="submit" size="2" variant="soft" disabled={isPending}>
            {isPending ? "Saving..." : "Save entry"}
          </Button>
          <Button type="button" size="2" variant="ghost" color="gray" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
