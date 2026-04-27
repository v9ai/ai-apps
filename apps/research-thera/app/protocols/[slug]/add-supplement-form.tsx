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
  useAddSupplementMutation,
  ProtocolDocument,
} from "../../__generated__/hooks";

export function AddSupplementForm({
  protocolId,
}: {
  protocolId: string;
  slug: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [addSupplement, { loading }] = useAddSupplementMutation({
    refetchQueries: [{ query: ProtocolDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = ((fd.get("name") as string) ?? "").trim();
    const dosage = ((fd.get("dosage") as string) ?? "").trim();
    const frequency = ((fd.get("frequency") as string) ?? "").trim();
    if (!name || !dosage || !frequency) return;

    try {
      await addSupplement({
        variables: {
          protocolId,
          input: {
            name,
            dosage,
            frequency,
            mechanism: ((fd.get("mechanism") as string) ?? "").trim() || null,
            notes: ((fd.get("notes") as string) ?? "").trim() || null,
            url: ((fd.get("url") as string) ?? "").trim() || null,
            targetAreas: [],
          },
        },
      });
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add supplement");
    }
  }

  return (
    <Box mt="2">
      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="3">
          <Flex gap="3" wrap="wrap">
            <Flex direction="column" gap="1" style={{ flex: 2, minWidth: 200 }}>
              <Text size="2" color="gray">
                Supplement name
              </Text>
              <TextField.Root name="name" placeholder="e.g. Lion's Mane" required />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 100 }}>
              <Text size="2" color="gray">
                Dosage
              </Text>
              <TextField.Root name="dosage" placeholder="500mg" required />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 100 }}>
              <Text size="2" color="gray">
                Frequency
              </Text>
              <TextField.Root name="frequency" placeholder="2x daily" required />
            </Flex>
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Mechanism (optional)
            </Text>
            <TextField.Root
              name="mechanism"
              placeholder="e.g. NGF stimulation"
            />
          </Flex>
          <Flex gap="3" wrap="wrap">
            <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
              <Text size="2" color="gray">
                Reference URL
              </Text>
              <TextField.Root name="url" type="url" placeholder="https://…" />
            </Flex>
          </Flex>
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">
              Notes (optional)
            </Text>
            <TextArea name="notes" placeholder="Any details…" rows={2} />
          </Flex>
          {error && (
            <Text size="2" color="red">
              {error}
            </Text>
          )}
          <Box>
            <Button type="submit" disabled={loading} variant="soft">
              {loading ? "Adding…" : "Add supplement"}
            </Button>
          </Box>
        </Flex>
      </form>
    </Box>
  );
}
