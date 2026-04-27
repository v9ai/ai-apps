"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Switch,
  TextField,
  TextArea,
  Text,
} from "@radix-ui/themes";
import {
  useAddMedicationMutation,
  MedicationsDocument,
} from "../__generated__/hooks";

export function AddMedicationForm() {
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [addMedication, { loading }] = useAddMedicationMutation({
    refetchQueries: [{ query: MedicationsDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = ((fd.get("name") as string) ?? "").trim();
    if (!name) return;

    try {
      await addMedication({
        variables: {
          input: {
            name,
            dosage: ((fd.get("dosage") as string) ?? "").trim() || null,
            frequency: ((fd.get("frequency") as string) ?? "").trim() || null,
            notes: ((fd.get("notes") as string) ?? "").trim() || null,
            startDate: ((fd.get("startDate") as string) ?? "") || null,
            endDate: ((fd.get("endDate") as string) ?? "") || null,
            isActive,
          },
        },
      });
      form.reset();
      setIsActive(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add medication");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Medication name
          </Text>
          <TextField.Root name="name" placeholder="e.g. Metformin" required />
        </Flex>
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Dosage
            </Text>
            <TextField.Root name="dosage" placeholder="e.g. 500mg" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Frequency
            </Text>
            <TextField.Root name="frequency" placeholder="e.g. twice daily" />
          </Flex>
        </Flex>
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Start date
            </Text>
            <TextField.Root name="startDate" type="date" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              End date (optional)
            </Text>
            <TextField.Root name="endDate" type="date" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Notes (optional)
          </Text>
          <TextArea name="notes" placeholder="Any relevant details…" rows={2} />
        </Flex>
        <Flex align="center" gap="2" asChild>
          <label>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Text size="2">Currently taking</Text>
          </label>
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add medication"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
