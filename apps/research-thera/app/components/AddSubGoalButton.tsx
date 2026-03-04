"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useCreateSubGoalMutation } from "@/app/__generated__/hooks";

interface AddSubGoalButtonProps {
  goalId: number;
}

export default function AddSubGoalButton({ goalId }: AddSubGoalButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [createSubGoal, { loading }] = useCreateSubGoalMutation({
    onCompleted: (data) => {
      setOpen(false);
      setTitle("");
      setDescription("");
      setError(null);
      const newGoal = data.createSubGoal;
      router.push(newGoal.slug ? `/goals/${newGoal.slug}` : `/goals/${newGoal.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
    refetchQueries: ["GetGoal"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Please enter a sub-goal title");
      return;
    }

    try {
      await createSubGoal({
        variables: {
          goalId,
          input: {
            title: title.trim(),
            description: description.trim() || undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create sub-goal:", err);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="soft" size="2">
          <PlusIcon width="14" height="14" />
          Add Sub-Goal
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Create Sub-Goal</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Break this goal into a smaller, actionable sub-goal.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title *
              </Text>
              <TextField.Root
                placeholder="Enter sub-goal title"
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
                placeholder="Describe your sub-goal (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                {loading ? "Creating..." : "Create Sub-Goal"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
