"use client";

import { uploadBloodTest } from "./actions";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import { UploadIcon } from "@radix-ui/react-icons";

export function UploadForm() {
  return (
    <form action={uploadBloodTest}>
      <Flex direction="column" gap="3">
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
        <Box>
          <Button type="submit">Upload & Extract</Button>
        </Box>
      </Flex>
    </form>
  );
}
