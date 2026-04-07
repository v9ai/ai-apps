"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Flex, Text, TextField, TextArea } from "@radix-ui/themes";
import { Plus } from "lucide-react";
import { recordBaseline, recordCheckIn } from "./actions";

const SCORE_FIELDS = [
  { name: "memoryScore", label: "Memory" },
  { name: "focusScore", label: "Focus" },
  { name: "processingSpeedScore", label: "Processing" },
  { name: "moodScore", label: "Mood" },
  { name: "sleepScore", label: "Sleep" },
];

function ScoreInputs({ defaults }: { defaults?: Record<string, number | null> }) {
  return (
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
            defaultValue={defaults?.[f.name]?.toString() ?? ""}
          />
        </Flex>
      ))}
    </Flex>
  );
}

export function BaselineForm({
  protocolId,
  existing,
}: {
  protocolId: string;
  existing: Record<string, number | null> | null;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button
        variant="soft"
        size="1"
        onClick={() => setOpen(true)}
      >
        {existing ? "Update Baseline" : "Record Baseline"}
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await recordBaseline(protocolId, formData);
          setOpen(false);
        });
      }}
    >
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          {existing ? "Update baseline scores" : "Record baseline scores"} (0-10)
        </Text>
        <ScoreInputs defaults={existing ?? undefined} />
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

export function CheckInForm({ protocolId }: { protocolId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="soft" size="1" onClick={() => setOpen(true)}>
        <Plus size={14} /> New Check-in
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await recordCheckIn(protocolId, formData);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
    >
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">Cognitive check-in (0-10)</Text>
        <ScoreInputs />
        <Flex gap="2">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray">Side effects</Text>
            <TextField.Root name="sideEffects" placeholder="Any side effects?" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray">Notes</Text>
            <TextField.Root name="notes" placeholder="How are you feeling?" />
          </Flex>
        </Flex>
        <Flex gap="2">
          <Button type="submit" size="1" variant="soft" disabled={isPending}>
            {isPending ? "Saving..." : "Save Check-in"}
          </Button>
          <Button type="button" size="1" variant="ghost" color="gray" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
