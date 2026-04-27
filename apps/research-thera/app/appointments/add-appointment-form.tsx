"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  TextArea,
  Select,
  Text,
} from "@radix-ui/themes";
import {
  useAddAppointmentMutation,
  AppointmentsDocument,
} from "../__generated__/hooks";

const NONE = "__none__";

type DoctorLite = { id: string; name: string };
type FamilyLite = { id: number; firstName: string };

export function AddAppointmentForm({
  doctors,
  family,
}: {
  doctors: DoctorLite[];
  family: FamilyLite[];
}) {
  const [doctorId, setDoctorId] = useState<string>(NONE);
  const [familyMemberId, setFamilyMemberId] = useState<string>(NONE);
  const [error, setError] = useState<string | null>(null);
  const [addAppointment, { loading }] = useAddAppointmentMutation({
    refetchQueries: [{ query: AppointmentsDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = ((fd.get("title") as string) ?? "").trim();
    if (!title) return;

    try {
      await addAppointment({
        variables: {
          input: {
            title,
            doctorId: doctorId === NONE ? null : doctorId,
            familyMemberId:
              familyMemberId === NONE ? null : Number(familyMemberId),
            provider: ((fd.get("provider") as string) ?? "").trim() || null,
            notes: ((fd.get("notes") as string) ?? "").trim() || null,
            appointmentDate:
              ((fd.get("appointmentDate") as string) ?? "") || null,
          },
        },
      });
      form.reset();
      setDoctorId(NONE);
      setFamilyMemberId(NONE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add appointment");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Title
          </Text>
          <TextField.Root
            name="title"
            placeholder="e.g. Annual checkup"
            required
          />
        </Flex>
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Doctor
            </Text>
            <Select.Root value={doctorId} onValueChange={setDoctorId}>
              <Select.Trigger placeholder="Select doctor" />
              <Select.Content>
                <Select.Item value={NONE}>(none)</Select.Item>
                {doctors.map((d) => (
                  <Select.Item key={d.id} value={d.id}>
                    {d.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              For family member
            </Text>
            <Select.Root
              value={familyMemberId}
              onValueChange={setFamilyMemberId}
            >
              <Select.Trigger placeholder="Select person" />
              <Select.Content>
                <Select.Item value={NONE}>(none)</Select.Item>
                {family.map((m) => (
                  <Select.Item key={m.id} value={String(m.id)}>
                    {m.firstName}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Provider (free-text fallback)
            </Text>
            <TextField.Root
              name="provider"
              placeholder="e.g. City Hospital"
            />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Date
            </Text>
            <TextField.Root name="appointmentDate" type="date" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Notes (optional)
          </Text>
          <TextArea name="notes" placeholder="What is this for?" rows={2} />
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading}>
            {loading ? "Scheduling…" : "Schedule appointment"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
