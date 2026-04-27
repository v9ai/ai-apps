"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  TextArea,
  Text,
  Checkbox,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import {
  useAddProtocolMutation,
  ProtocolsDocument,
} from "../__generated__/hooks";

const AREAS = [
  { value: "MEMORY", label: "Memory" },
  { value: "FOCUS", label: "Focus" },
  { value: "PROCESSING_SPEED", label: "Processing speed" },
  { value: "NEUROPLASTICITY", label: "Neuroplasticity" },
  { value: "NEUROPROTECTION", label: "Neuroprotection" },
  { value: "MOOD_REGULATION", label: "Mood" },
  { value: "SLEEP_QUALITY", label: "Sleep" },
];

export function AddProtocolForm() {
  const router = useRouter();
  const [areas, setAreas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addProtocol, { loading }] = useAddProtocolMutation({
    refetchQueries: [{ query: ProtocolsDocument }],
  });

  function toggleArea(value: string, checked: boolean) {
    setAreas((prev) =>
      checked ? [...prev, value] : prev.filter((a) => a !== value),
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = ((fd.get("name") as string) ?? "").trim();
    if (!name) return;

    try {
      const res = await addProtocol({
        variables: {
          input: {
            name,
            notes: ((fd.get("notes") as string) ?? "").trim() || null,
            targetAreas: areas,
            startDate: ((fd.get("startDate") as string) ?? "") || null,
          },
        },
      });
      const slug = res.data?.addProtocol.slug;
      form.reset();
      setAreas([]);
      if (slug) router.push(`/protocols/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add protocol");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Protocol name
            </Text>
            <TextField.Root
              name="name"
              placeholder="e.g. Morning Stack"
              required
            />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text size="2" color="gray">
              Start date
            </Text>
            <TextField.Root name="startDate" type="date" />
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Target areas
          </Text>
          <Flex gap="3" wrap="wrap">
            {AREAS.map((a) => (
              <Text key={a.value} as="label" size="2">
                <Flex gap="1" align="center">
                  <Checkbox
                    checked={areas.includes(a.value)}
                    onCheckedChange={(checked) =>
                      toggleArea(a.value, checked === true)
                    }
                  />
                  {a.label}
                </Flex>
              </Text>
            ))}
          </Flex>
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
            {loading ? "Creating…" : "Create protocol"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
