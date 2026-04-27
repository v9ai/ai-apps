"use client";

import { useRef, useState } from "react";
import {
  Box,
  Button,
  Flex,
  TextField,
  TextArea,
  Text,
  Select,
} from "@radix-ui/themes";
import {
  useAddAllergyMutation,
  AllergiesDocument,
  AllergyKind,
  useGetFamilyMembersQuery,
} from "../__generated__/hooks";

export function AddAllergyForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [familyMemberId, setFamilyMemberId] = useState<string>("none");
  const [kind, setKind] = useState<AllergyKind>(AllergyKind.Allergy);
  const [severity, setSeverity] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { data: famData } = useGetFamilyMembersQuery();
  const familyMembers = famData?.familyMembers ?? [];
  const [addAllergy, { loading }] = useAddAllergyMutation({
    refetchQueries: [{ query: AllergiesDocument }],
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = ((formData.get("name") as string) ?? "").trim();
    const notes = ((formData.get("notes") as string) ?? "").trim() || null;
    if (!name) return;

    try {
      await addAllergy({
        variables: {
          input: {
            familyMemberId:
              familyMemberId === "none" ? null : Number(familyMemberId),
            kind,
            name,
            severity: severity || null,
            notes,
          },
        },
      });
      form.reset();
      setKind(AllergyKind.Allergy);
      setSeverity("");
      setFamilyMemberId("none");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add entry");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Flex direction="column" gap="3">
        <Flex gap="3" wrap="wrap">
          <Flex direction="column" gap="1" style={{ minWidth: 160 }}>
            <Text size="2" color="gray">
              Person
            </Text>
            <Select.Root
              value={familyMemberId}
              onValueChange={setFamilyMemberId}
            >
              <Select.Trigger placeholder="—" />
              <Select.Content>
                <Select.Item value="none">— Unassigned —</Select.Item>
                {familyMembers.map((fm) => (
                  <Select.Item key={fm.id} value={String(fm.id)}>
                    {fm.firstName}
                    {fm.name ? ` (${fm.name})` : ""}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex direction="column" gap="1" style={{ minWidth: 160 }}>
            <Text size="2" color="gray">
              Type
            </Text>
            <Select.Root
              value={kind}
              onValueChange={(v) => setKind(v as AllergyKind)}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value={AllergyKind.Allergy}>Allergy</Select.Item>
                <Select.Item value={AllergyKind.Intolerance}>
                  Intolerance
                </Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex direction="column" gap="1" style={{ minWidth: 160 }}>
            <Text size="2" color="gray">
              Severity (optional)
            </Text>
            <Select.Root value={severity} onValueChange={setSeverity}>
              <Select.Trigger placeholder="—" />
              <Select.Content>
                <Select.Item value="mild">Mild</Select.Item>
                <Select.Item value="moderate">Moderate</Select.Item>
                <Select.Item value="severe">Severe</Select.Item>
                <Select.Item value="anaphylactic">Anaphylactic</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Name
          </Text>
          <TextField.Root
            name="name"
            placeholder="e.g. Peanuts, Lactose, Penicillin"
            required
          />
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="2" color="gray">
            Notes (optional)
          </Text>
          <TextArea
            name="notes"
            placeholder="Reactions, triggers, treatments…"
            rows={2}
          />
        </Flex>
        {error && (
          <Text size="2" color="red">
            {error}
          </Text>
        )}
        <Box>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding…" : "Add entry"}
          </Button>
        </Box>
      </Flex>
    </form>
  );
}
