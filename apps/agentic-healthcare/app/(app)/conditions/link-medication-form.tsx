"use client";

import { useState } from "react";
import { Button, Flex, Select, Text } from "@radix-ui/themes";

type AvailableMedication = {
  id: string;
  name: string;
  dosage: string | null;
};

type LinkMedicationFormProps = {
  conditionId: string;
  availableMedications: AvailableMedication[];
  linkAction: (conditionId: string, medicationId: string) => Promise<void>;
};

export function LinkMedicationForm({
  conditionId,
  availableMedications,
  linkAction,
}: LinkMedicationFormProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setPending(true);
    try {
      await linkAction(conditionId, selectedId);
      setSelectedId("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium" color="gray">Link existing medication</Text>
        <Flex gap="2" align="center">
          <Select.Root value={selectedId} onValueChange={setSelectedId}>
            <Select.Trigger
              placeholder="Select a medication..."
              style={{ flex: 1 }}
            />
            <Select.Content>
              {availableMedications.map((m) => (
                <Select.Item key={m.id} value={m.id}>
                  {m.name}{m.dosage ? ` \u2014 ${m.dosage}` : ""}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Button type="submit" disabled={!selectedId || pending} variant="soft">
            Link
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
