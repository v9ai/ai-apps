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
  useCreateHabitMutation,
  HabitFrequency,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";

export default function AddHabitButton({
  size = "3",
}: {
  size?: "1" | "2" | "3";
} = {}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<HabitFrequency>(HabitFrequency.Daily);
  const [targetCount, setTargetCount] = useState("1");
  const [error, setError] = useState<string | null>(null);

  const [createHabit, { loading }] = useCreateHabitMutation({
    onCompleted: () => {
      setOpen(false);
      setTitle("");
      setDescription("");
      setFrequency(HabitFrequency.Daily);
      setTargetCount("1");
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
    },
    refetchQueries: ["GetHabits"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError("You must be logged in to create a habit");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a habit title");
      return;
    }

    try {
      await createHabit({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim() || undefined,
            frequency,
            targetCount: parseInt(targetCount, 10) || 1,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create habit:", err);
    }
  };

  if (!user) return null;

  function handleOpenChange(next: boolean) {
    if (next) {
      setTitle("");
      setDescription("");
      setError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button size={size}>
          <PlusIcon width="16" height="16" />
          Add Habit
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Create New Habit</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Track a daily or weekly habit to build consistency.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title *
              </Text>
              <TextField.Root
                placeholder="e.g. Practice deep breathing"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Description
              </Text>
              <TextArea
                placeholder="Optional details about this habit"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </label>

            <Flex gap="4">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text as="div" size="2" weight="medium">
                  Frequency
                </Text>
                <Select.Root
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as HabitFrequency)}
                  disabled={loading}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value={HabitFrequency.Daily}>Daily</Select.Item>
                    <Select.Item value={HabitFrequency.Weekly}>Weekly</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              <label style={{ flex: 1 }}>
                <Text as="div" size="2" mb="1" weight="medium">
                  Target count
                </Text>
                <TextField.Root
                  type="number"
                  min="1"
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                  disabled={loading}
                />
              </label>
            </Flex>

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
                {loading ? "Creating..." : "Create Habit"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
