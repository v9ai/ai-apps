"use client";

import { useRef, useState, useTransition } from "react";
import { Button, Flex, Select, Text, TextField, TextArea } from "@radix-ui/themes";
import { Plus } from "lucide-react";
import { addSupplement } from "./actions";

const MECHANISMS = [
  { value: "CHOLINERGIC", label: "Cholinergic" },
  { value: "ANTIOXIDANT", label: "Antioxidant" },
  { value: "ANTI_INFLAMMATORY", label: "Anti-inflammatory" },
  { value: "MITOCHONDRIAL", label: "Mitochondrial" },
  { value: "NEUROTROPHIC", label: "Neurotrophic" },
  { value: "EPIGENETIC", label: "Epigenetic" },
  { value: "HORMONAL", label: "Hormonal" },
];

export function AddSupplementForm({ protocolId }: { protocolId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mechanism, setMechanism] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="soft" size="2" onClick={() => setOpen(true)}>
        <Plus size={14} /> Add Supplement
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) => {
        if (mechanism) formData.set("mechanism", mechanism);
        startTransition(async () => {
          await addSupplement(protocolId, formData);
          formRef.current?.reset();
          setMechanism("");
          setOpen(false);
        });
      }}
    >
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">New supplement</Text>
        <Flex gap="2">
          <TextField.Root name="name" placeholder="Name *" required style={{ flex: 2 }} />
          <TextField.Root name="dosage" placeholder="Dosage *" required style={{ flex: 1 }} />
          <TextField.Root name="frequency" placeholder="Frequency *" required style={{ flex: 1 }} />
        </Flex>
        <Flex gap="2" align="center">
          <Select.Root value={mechanism} onValueChange={setMechanism}>
            <Select.Trigger placeholder="Mechanism..." style={{ flex: 1 }} />
            <Select.Content>
              {MECHANISMS.map((m) => (
                <Select.Item key={m.value} value={m.value}>{m.label}</Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <TextField.Root name="notes" placeholder="Notes" style={{ flex: 2 }} />
        </Flex>
        <Flex gap="2">
          <Button type="submit" size="1" variant="soft" disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
          <Button type="button" size="1" variant="ghost" color="gray" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
