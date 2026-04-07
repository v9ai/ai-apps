"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { Plus } from "lucide-react";
import { quickAddAndLinkMedication } from "./medication-link-actions";

export function QuickAddMedicationForm({ conditionId }: { conditionId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="ghost" size="1" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add new medication
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await quickAddAndLinkMedication(conditionId, formData);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
    >
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium" color="gray">New medication</Text>
        <TextField.Root name="name" placeholder="Name *" required />
        <Flex gap="2">
          <TextField.Root name="dosage" placeholder="Dosage" style={{ flex: 1 }} />
          <TextField.Root name="frequency" placeholder="Frequency" style={{ flex: 1 }} />
        </Flex>
        <Flex gap="2">
          <Button type="submit" size="1" variant="soft" disabled={isPending}>
            {isPending ? "Adding..." : "Add & Link"}
          </Button>
          <Button
            type="button"
            size="1"
            variant="ghost"
            color="gray"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
