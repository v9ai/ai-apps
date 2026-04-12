"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { setMemoryBaseline } from "./actions";

const SCORE_FIELDS = [
  { name: "overallScore", label: "Overall" },
  { name: "shortTermScore", label: "Short-term" },
  { name: "longTermScore", label: "Long-term" },
  { name: "workingMemoryScore", label: "Working" },
  { name: "recallSpeed", label: "Recall speed" },
];

export function BaselineForm({
  existing,
}: {
  existing: Record<string, number | null> | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="soft" size="1" onClick={() => setOpen(true)}>
        {existing ? "Update Baseline" : "Record Baseline"}
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await setMemoryBaseline(formData);
          setOpen(false);
        });
      }}
    >
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          {existing ? "Update baseline scores" : "Record baseline scores"} (0-10)
        </Text>
        <Flex gap="2" wrap="wrap">
          {SCORE_FIELDS.map((f) => (
            <Flex key={f.name} direction="column" gap="1" style={{ flex: "1 1 80px", minWidth: 80 }}>
              <Text size="1" color="gray">{f.label}</Text>
              <TextField.Root
                name={f.name}
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="0-10"
                defaultValue={existing?.[f.name]?.toString() ?? ""}
              />
            </Flex>
          ))}
        </Flex>
        <Flex gap="2">
          <Button type="submit" size="1" variant="soft" disabled={isPending}>
            {isPending ? "Saving..." : "Save Baseline"}
          </Button>
          <Button type="button" size="1" variant="ghost" color="gray" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
