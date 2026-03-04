"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NextLink from "next/link";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
  Callout,
} from "@radix-ui/themes";
import { PlusIcon, InfoCircledIcon } from "@radix-ui/react-icons";
import {
  useCreateGoalMutation,
  useGetFamilyMembersQuery,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";

export default function AddGoalButton({
  presetFamilyMemberId,
  presetTitle,
  presetDescription,
  refetchQueries: extraRefetchQueries,
  size = "3",
}: {
  presetFamilyMemberId?: number;
  presetTitle?: string;
  presetDescription?: string;
  refetchQueries?: string[];
  size?: "1" | "2" | "3";
} = {}) {
  const router = useRouter();
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [familyMemberId, setFamilyMemberId] = useState<string>(
    presetFamilyMemberId ? String(presetFamilyMemberId) : "",
  );
  const [error, setError] = useState<string | null>(null);

  const { data: familyData } = useGetFamilyMembersQuery({
    skip: !!presetFamilyMemberId,
  });
  const familyMembers = familyData?.familyMembers ?? [];

  const [createGoal, { loading }] = useCreateGoalMutation({
    onCompleted: (data) => {
      setOpen(false);
      setTitle(presetTitle ?? "");
      setDescription(presetDescription ?? "");
      if (!presetFamilyMemberId) setFamilyMemberId("");
      setError(null);
      const newGoal = data.createGoal;
      router.push(newGoal.slug ? `/goals/${newGoal.slug}` : `/goals/${newGoal.id}`);
    },
    onError: (err) => {
      setError(err.message);
    },
    refetchQueries: ["GetGoals", ...(extraRefetchQueries ?? [])],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError("You must be logged in to create a goal");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a goal title");
      return;
    }

    const resolvedFamilyMemberId = presetFamilyMemberId ?? parseInt(familyMemberId, 10);
    if (!resolvedFamilyMemberId) {
      setError("Please select a family member for this goal");
      return;
    }

    try {
      await createGoal({
        variables: {
          input: {
            familyMemberId: resolvedFamilyMemberId,
            title: title.trim(),
            description: description.trim() || undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create goal:", err);
    }
  };

  if (!user) {
    return null;
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      setTitle(presetTitle ?? "");
      setDescription(presetDescription ?? "");
      setError(null);
    }
    setOpen(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button size={size}>
          <PlusIcon width="16" height="16" />
          Add Goal
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Create New Goal</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Add a new therapeutic goal to track your progress.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title *
              </Text>
              <TextField.Root
                placeholder="Enter goal title"
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
                placeholder="Describe your goal (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                disabled={loading}
              />
            </label>

            {!presetFamilyMemberId && (
              <Flex direction="column" gap="1">
                <Text as="div" size="2" weight="medium">
                  Family Member *
                </Text>
                {familyMembers.length === 0 ? (
                  <Callout.Root color="amber" size="1">
                    <Callout.Icon>
                      <InfoCircledIcon />
                    </Callout.Icon>
                    <Callout.Text>
                      No family members yet.{" "}
                      <Dialog.Close>
                        <NextLink
                          href="/family"
                          style={{ color: "var(--amber-11)", fontWeight: 500 }}
                        >
                          Add a family member
                        </NextLink>
                      </Dialog.Close>{" "}
                      before creating a goal.
                    </Callout.Text>
                  </Callout.Root>
                ) : (
                  <Select.Root
                    value={familyMemberId}
                    onValueChange={setFamilyMemberId}
                    disabled={loading}
                  >
                    <Select.Trigger
                      placeholder="Select family member…"
                      style={{ width: "100%" }}
                    />
                    <Select.Content>
                      {familyMembers.map((fm) => (
                        <Select.Item key={fm.id} value={String(fm.id)}>
                          {fm.firstName ?? fm.name}
                          {fm.relationship ? ` (${fm.relationship})` : ""}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </Flex>
            )}

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
              <Button
                type="submit"
                disabled={loading || (!presetFamilyMemberId && familyMembers.length === 0)}
              >
                {loading ? "Creating..." : "Create Goal"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
