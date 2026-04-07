"use client";

import { useRef, useTransition } from "react";
import { Button, Flex, TextField, TextArea, Text } from "@radix-ui/themes";
import { addProtocol } from "./actions";

export function AddProtocolForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      action={(formData) => {
        startTransition(async () => {
          await addProtocol(formData);
          formRef.current?.reset();
        });
      }}
    >
      <Flex direction="column" gap="3">
        <Flex gap="3" align="end">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" weight="medium" color="gray">Protocol name *</Text>
            <TextField.Root name="name" placeholder="e.g. Brain Health Protocol" required />
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="1" weight="medium" color="gray">Start date</Text>
            <TextField.Root name="startDate" type="date" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="1" weight="medium" color="gray">Notes</Text>
          <TextArea name="notes" placeholder="Protocol goals, philosophy, key principles..." rows={2} />
        </Flex>
        <Button type="submit" disabled={isPending} style={{ alignSelf: "flex-start" }}>
          {isPending ? "Creating..." : "Create Protocol"}
        </Button>
      </Flex>
    </form>
  );
}
