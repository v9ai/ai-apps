"use client";

import { addDoctor } from "./actions";
import { Box, Button, Flex, TextField, TextArea, Text } from "@radix-ui/themes";
import { useRef } from "react";
import { css } from "styled-system/css";

export function AddDoctorForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addDoctor(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Full name</Text>
          <TextField.Root name="name" placeholder="e.g. Dr. Maria Ionescu" required />
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" className={css({ flex: "1" })}>
            <Text size="2" color="gray">Specialty</Text>
            <TextField.Root name="specialty" placeholder="e.g. Cardiologist" />
          </Flex>
          <Flex direction="column" gap="1" className={css({ flex: "1" })}>
            <Text size="2" color="gray">Phone</Text>
            <TextField.Root name="phone" placeholder="e.g. +373 22 000 000" />
          </Flex>
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" className={css({ flex: "1" })}>
            <Text size="2" color="gray">Email</Text>
            <TextField.Root name="email" type="email" placeholder="e.g. doctor@clinic.md" />
          </Flex>
          <Flex direction="column" gap="1" className={css({ flex: "1" })}>
            <Text size="2" color="gray">Address / Clinic</Text>
            <TextField.Root name="address" placeholder="e.g. Medpark, Chisinau" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Notes (optional)</Text>
          <TextArea name="notes" placeholder="Referral info, visit history..." rows={2} />
        </Flex>
        <Box>
          <Button type="submit">Add doctor</Button>
        </Box>
      </Flex>
    </form>
  );
}
