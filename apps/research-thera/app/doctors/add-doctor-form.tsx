"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  TextArea,
  Text,
} from "@radix-ui/themes";
import {
  useAddDoctorMutation,
  DoctorsDocument,
} from "../__generated__/hooks";

export function AddDoctorForm() {
  const [error, setError] = useState<string | null>(null);
  const [addDoctor, { loading }] = useAddDoctorMutation({
    refetchQueries: [{ query: DoctorsDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = ((fd.get("name") as string) ?? "").trim();
    if (!name) return;

    try {
      await addDoctor({
        variables: {
          input: {
            name,
            specialty: ((fd.get("specialty") as string) ?? "").trim() || null,
            phone: ((fd.get("phone") as string) ?? "").trim() || null,
            email: ((fd.get("email") as string) ?? "").trim() || null,
            address: ((fd.get("address") as string) ?? "").trim() || null,
            notes: ((fd.get("notes") as string) ?? "").trim() || null,
          },
        },
      });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add doctor");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Doctor name
            </Text>
            <TextField.Root name="name" placeholder="e.g. Dr. Smith" required />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Specialty
            </Text>
            <TextField.Root name="specialty" placeholder="e.g. Cardiology" />
          </Flex>
        </Flex>
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Phone
            </Text>
            <TextField.Root name="phone" type="tel" placeholder="+1 555 ..." />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Email
            </Text>
            <TextField.Root name="email" type="email" placeholder="dr@example.com" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Address
          </Text>
          <TextField.Root name="address" placeholder="Clinic / hospital address" />
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Notes (optional)
          </Text>
          <TextArea name="notes" placeholder="Any relevant details…" rows={2} />
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add doctor"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
