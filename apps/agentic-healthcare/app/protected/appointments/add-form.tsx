"use client";

import { addAppointment } from "./actions";
import { Box, Button, Flex, TextField, TextArea, Text } from "@radix-ui/themes";
import { useRef } from "react";

export function AddAppointmentForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addAppointment(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Appointment title</Text>
          <TextField.Root name="title" placeholder="e.g. Annual checkup with Dr. Smith" required />
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Provider / Doctor</Text>
            <TextField.Root name="provider" placeholder="e.g. Dr. Smith" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Date</Text>
            <TextField.Root name="appointment_date" type="date" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Notes</Text>
          <TextArea name="notes" placeholder="Doctor's notes, recommendations, follow-up items..." rows={4} />
        </Flex>
        <Box>
          <Button type="submit">Add appointment</Button>
        </Box>
      </Flex>
    </form>
  );
}
