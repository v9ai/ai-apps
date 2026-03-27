"use client";

import { useState } from "react";
import { Button, Flex, Select, Text } from "@radix-ui/themes";

type AvailableDoctor = {
  id: string;
  name: string;
  specialty: string | null;
};

type LinkDoctorFormProps = {
  familyMemberId: string;
  availableDoctors: AvailableDoctor[];
  linkAction: (familyMemberId: string, doctorId: string) => Promise<void>;
};

export function LinkDoctorForm({
  familyMemberId,
  availableDoctors,
  linkAction,
}: LinkDoctorFormProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDoctorId) return;
    setPending(true);
    try {
      await linkAction(familyMemberId, selectedDoctorId);
      setSelectedDoctorId("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium" color="gray">Link a doctor</Text>
        <Flex gap="2" align="center">
          <Select.Root value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
            <Select.Trigger
              placeholder="Select a doctor…"
              style={{ flex: 1 }}
            />
            <Select.Content>
              {availableDoctors.map((d) => (
                <Select.Item key={d.id} value={d.id}>
                  {d.name}{d.specialty ? ` — ${d.specialty}` : ""}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          <Button type="submit" disabled={!selectedDoctorId || pending} variant="soft">
            Link
          </Button>
        </Flex>
      </Flex>
    </form>
  );
}
