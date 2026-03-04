"use client";

import { useState } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  useCreateFamilyMemberCharacteristicMutation,
  CharacteristicCategory,
} from "@/app/__generated__/hooks";

interface AddCharacteristicButtonProps {
  familyMemberId: number;
  defaultCategory: CharacteristicCategory;
  label: string;
  refetchQueries?: string[];
  size?: "1" | "2" | "3";
}

const defaultForm = (category: CharacteristicCategory) => ({
  category,
  title: "",
  description: "",
});

export default function AddCharacteristicButton({
  familyMemberId,
  defaultCategory,
  label,
  refetchQueries: extraRefetchQueries,
  size = "2",
}: AddCharacteristicButtonProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() => defaultForm(defaultCategory));
  const [error, setError] = useState<string | null>(null);

  const [createCharacteristic, { loading }] =
    useCreateFamilyMemberCharacteristicMutation({
      onCompleted: () => {
        setOpen(false);
        setForm(defaultForm(defaultCategory));
        setError(null);
      },
      onError: (err) => setError(err.message),
      refetchQueries: [
        "GetFamilyMemberCharacteristics",
        ...(extraRefetchQueries ?? []),
      ],
    });

  const resetForm = () => {
    setForm(defaultForm(defaultCategory));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      await createCharacteristic({
        variables: {
          input: {
            familyMemberId,
            category: form.category,
            title: form.title.trim(),
            description: form.description.trim() || undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create characteristic:", err);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <Dialog.Trigger>
        <Button size={size} variant="soft">
          <PlusIcon width="16" height="16" />
          {label}
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 480 }}>
        <Dialog.Title>Add {label}</Dialog.Title>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text as="div" size="2" weight="medium">
                Category
              </Text>
              <Select.Root
                value={form.category}
                onValueChange={(value) =>
                  setForm((f) => ({
                    ...f,
                    category: value as CharacteristicCategory,
                  }))
                }
                disabled={loading}
              >
                <Select.Trigger style={{ width: "100%" }} />
                <Select.Content>
                  <Select.Item value={CharacteristicCategory.Strength}>
                    Strength — neutral characteristic
                  </Select.Item>
                  <Select.Item value={CharacteristicCategory.SupportNeed}>
                    Support Priority — interferes with something
                  </Select.Item>
                  <Select.Item value={CharacteristicCategory.PriorityConcern}>
                    Priority Concern — requires active intervention
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title *
              </Text>
              <TextField.Root
                placeholder="Short label..."
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Description
              </Text>
              <TextArea
                placeholder="Optional details..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
                disabled={loading}
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={loading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Add"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
