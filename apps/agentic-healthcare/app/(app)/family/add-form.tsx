"use client";

import { addFamilyMember } from "./actions";
import { Box, Button, Flex, TextField, TextArea, Text } from "@radix-ui/themes";
import { useRef } from "react";

export function AddFamilyMemberForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addFamilyMember(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Full name</Text>
          <TextField.Root name="name" placeholder="e.g. Ion Nicolai" required />
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Relationship</Text>
            <TextField.Root name="relationship" placeholder="e.g. Father, Mother, Sibling" />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Date of birth</Text>
            <TextField.Root name="date_of_birth" type="date" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Notes (optional)</Text>
          <TextArea name="notes" placeholder="Medical history, conditions, medications..." rows={2} />
        </Flex>
        <Box>
          <Button type="submit">Add family member</Button>
        </Box>
      </Flex>
    </form>
  );
}
