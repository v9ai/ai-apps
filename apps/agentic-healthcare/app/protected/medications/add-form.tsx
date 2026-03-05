"use client";

import { addMedication } from "./actions";
import { Box, Button, Flex, TextField, TextArea, Text } from "@radix-ui/themes";
import { useRef } from "react";

export function AddMedicationForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addMedication(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Medication name</Text>
          <TextField.Root name="name" placeholder="e.g. Metformin" required />
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Dosage</Text>
            <TextField.Root name="dosage" placeholder="e.g. 500mg" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Frequency</Text>
            <TextField.Root name="frequency" placeholder="e.g. Twice daily" />
          </Flex>
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Start date</Text>
            <TextField.Root name="start_date" type="date" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">End date</Text>
            <TextField.Root name="end_date" type="date" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Notes (optional)</Text>
          <TextArea name="notes" placeholder="Any relevant details..." rows={2} />
        </Flex>
        <Box>
          <Button type="submit">Add medication</Button>
        </Box>
      </Flex>
    </form>
  );
}
