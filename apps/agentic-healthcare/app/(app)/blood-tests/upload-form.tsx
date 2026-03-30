"use client";

import { uploadBloodTest } from "./actions";
import { Box, Button, Callout, Flex, Text } from "@radix-ui/themes";
import { UploadIcon } from "@radix-ui/react-icons";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { css } from "styled-system/css";

const dropZoneClass = css({
  border: "2px dashed var(--indigo-a6)",
  borderRadius: "var(--radius-3)",
  padding: "var(--space-8)",
  textAlign: "center",
  transition: "border-color 150ms ease, background 150ms ease",
  _hover: {
    borderColor: "var(--indigo-a8)",
    background: "var(--indigo-a2)",
  },
});

const dateInputClass = css({
  fontSize: "var(--font-size-2)",
  color: "var(--gray-12)",
  padding: "var(--space-2) var(--space-3)",
  border: "1px solid var(--gray-a6)",
  borderRadius: "var(--radius-2)",
  background: "var(--color-background)",
  width: "100%",
  maxWidth: "220px",
  outline: "none",
  _focus: {
    borderColor: "var(--indigo-a8)",
    boxShadow: "0 0 0 1px var(--indigo-a6)",
  },
});

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="3">
      <UploadIcon />
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
      <Flex direction="column" gap="4">
        {error && (
          <Callout.Root color="red">
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}
        <div className={dropZoneClass}>
          <Flex direction="column" align="center" gap="3">
            <UploadIcon width={28} height={28} color="var(--indigo-9)" />
            <Flex direction="column" align="center" gap="1">
              <Text size="2" weight="medium">Choose a file to upload</Text>
              <Text size="1" color="gray">PDF or image (JPG, PNG)</Text>
            </Flex>
            <input
              type="file"
              name="file"
              accept=".pdf,.jpg,.jpeg,.png"
              required
              className={css({ fontSize: "var(--font-size-2)", color: "var(--gray-11)" })}
            />
          </Flex>
        </div>
        <Flex align="end" gap="4">
          <Flex direction="column" gap="1">
            <Text size="2" color="gray" weight="medium">Test date</Text>
            <input
              type="date"
              name="test_date"
              className={dateInputClass}
            />
          </Flex>
          <Box>
            <SubmitButton />
          </Box>
        </Flex>
      </Flex>
    </form>
  );
}
