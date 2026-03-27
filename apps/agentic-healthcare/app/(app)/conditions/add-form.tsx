"use client";

import { addCondition } from "./actions";
import { Box, Button, Flex, TextField, TextArea, Text } from "@radix-ui/themes";
import { useRef } from "react";

export function AddConditionForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addCondition(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Condition name</Text>
          <TextField.Root name="name" placeholder="e.g. Alopecia" required />
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Notes (optional)</Text>
          <TextArea name="notes" placeholder="Any relevant details…" rows={2} />
        </Flex>
        <Box>
          <Button type="submit">Add condition</Button>
        </Box>
      </Flex>
    </form>
  );
}
