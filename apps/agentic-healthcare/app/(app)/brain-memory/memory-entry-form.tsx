"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Flex, Select, Text, TextArea, TextField } from "@radix-ui/themes";
import { Plus } from "lucide-react";
import { addMemoryEntry } from "./actions";

const SCORE_FIELDS = [
  { name: "overallScore", label: "Overall" },
  { name: "shortTermScore", label: "Short-term" },
  { name: "longTermScore", label: "Long-term" },
  { name: "workingMemoryScore", label: "Working" },
  { name: "recallSpeed", label: "Recall speed" },
];

const CATEGORIES = [
  { value: "observation", label: "Observation" },
  { value: "brain_fog", label: "Brain Fog" },
  { value: "clarity", label: "Clarity" },
  { value: "recall_issue", label: "Recall Issue" },
  { value: "recall_success", label: "Recall Success" },
];

type Protocol = { id: string; name: string };

export function MemoryEntryForm({ protocols }: { protocols: Protocol[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="soft" size="1" onClick={() => setOpen(true)}>
        <Plus size={14} /> Log Memory Entry
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addMemoryEntry(formData);
          formRef.current?.reset();
          setOpen(false);
        });
      }}
    >
      <Flex direction="column" gap="3">
        <Text size="2" weight="medium">Log a memory entry</Text>

        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: "1 1 160px", minWidth: 160 }}>
            <Text size="1" color="gray">Category</Text>
            <Select.Root name="category" defaultValue="observation">
              <Select.Trigger />
              <Select.Content>
                {CATEGORIES.map((c) => (
                  <Select.Item key={c.value} value={c.value}>
                    {c.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: "1 1 160px", minWidth: 160 }}>
            <Text size="1" color="gray">Context</Text>
            <TextField.Root name="context" placeholder="e.g. morning, after exercise" />
          </Flex>
          {protocols.length > 0 && (
            <Flex direction="column" gap="1" style={{ flex: "1 1 160px", minWidth: 160 }}>
              <Text size="1" color="gray">Protocol (optional)</Text>
              <Select.Root name="protocolId">
                <Select.Trigger placeholder="None" />
                <Select.Content>
                  {protocols.map((p) => (
                    <Select.Item key={p.id} value={p.id}>
                      {p.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
          )}
        </Flex>

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
              />
            </Flex>
          ))}
        </Flex>

        <Flex direction="column" gap="1">
          <Text size="1" color="gray">Notes</Text>
          <TextArea name="description" placeholder="How is your memory today? Any observations..." rows={2} />
        </Flex>

        <Flex gap="2">
          <Button type="submit" size="1" variant="soft" disabled={isPending}>
            {isPending ? "Saving..." : "Save Entry"}
          </Button>
          <Button type="button" size="1" variant="ghost" color="gray" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
