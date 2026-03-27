"use client";

import { uploadBloodTest } from "./actions";
import { Box, Button, Callout, Card, Flex, Text } from "@radix-ui/themes";
import { UploadIcon } from "@radix-ui/react-icons";
import { useFormStatus } from "react-dom";
import { useState } from "react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Processing…" : "Upload & Extract"}
    </Button>
  );
}

export function UploadForm() {
  const [error, setError] = useState<string | null>(null);

  async function handleAction(formData: FormData) {
    setError(null);
    try {
      await uploadBloodTest(formData);
    } catch (e: any) {
      // Next.js redirect() throws NEXT_REDIRECT — let it propagate
      if (e?.digest?.startsWith("NEXT_REDIRECT")) throw e;
      setError(e?.message ?? "Upload failed. Is the processing server running?");
    }
  }

  return (
    <form action={handleAction}>
      <Flex direction="column" gap="3">
        {error && (
          <Callout.Root color="red">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}
        <Card>
          <Flex direction="column" align="center" gap="3" py="5">
            <UploadIcon width={24} height={24} />
            <Text size="2" color="gray">PDF or image (JPG, PNG)</Text>
            <input
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              style={{ fontSize: "var(--font-size-2)", color: "var(--gray-12)" }}
            />
          </Flex>
        </Card>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">Test date</Text>
          <input
            type="date"
            name="test_date"
            style={{ fontSize: "var(--font-size-2)", color: "var(--gray-12)" }}
          />
        </Flex>
        <Box>
          <SubmitButton />
        </Box>
      </Flex>
    </form>
  );
}
