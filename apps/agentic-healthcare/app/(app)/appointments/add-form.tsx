"use client";

import { addAppointment } from "./actions";
import { Box, Button, Flex, Select, TextField, TextArea, Text } from "@radix-ui/themes";
import { useRef } from "react";

type Doctor = { id: string; name: string; specialty: string | null };

export function AddAppointmentForm({ doctors }: { doctors: Doctor[] }) {
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
          <TextField.Root name="title" placeholder="e.g. Annual checkup" required />
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Doctor</Text>
            {doctors.length > 0 ? (
              <Select.Root name="doctor_id">
                <Select.Trigger placeholder="Select a doctor (optional)" />
                <Select.Content>
                  <Select.Item value="">— None —</Select.Item>
                  {doctors.map((d) => (
                    <Select.Item key={d.id} value={d.id}>
                      {d.name}{d.specialty ? ` · ${d.specialty}` : ""}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            ) : (
              <TextField.Root name="provider" placeholder="e.g. Dr. Smith" />
            )}
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Date</Text>
            <TextField.Root name="appointment_date" type="date" />
          </Flex>
        </Flex>
        {doctors.length > 0 && (
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">Provider (if not in list)</Text>
            <TextField.Root name="provider" placeholder="e.g. Dr. Smith" />
          </Flex>
        )}
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
