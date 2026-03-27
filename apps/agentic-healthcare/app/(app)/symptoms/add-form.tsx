"use client";

import { addSymptom } from "./actions";
import { Box, Button, Flex, Select, TextArea, Text, TextField } from "@radix-ui/themes";
import { useRef } from "react";

export function AddSymptomForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    await addSymptom(formData);
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">What are you experiencing?</Text>
          <TextArea name="description" placeholder="e.g. Persistent fatigue and headache after meals" required rows={2} />
        </Flex>
        <Flex gap="3">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">Severity</Text>
            <Select.Root name="severity" defaultValue="moderate">
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="mild">Mild</Select.Item>
                <Select.Item value="moderate">Moderate</Select.Item>
                <Select.Item value="severe">Severe</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" color="gray">When</Text>
            <TextField.Root name="logged_at" type="datetime-local" />
          </Flex>
        </Flex>
        <Box>
          <Button type="submit">Log symptom</Button>
        </Box>
      </Flex>
    </form>
  );
}
