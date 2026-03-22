"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  Select,
  IconButton,
  TextArea,
  TextField,
  AlertDialog,
} from "@radix-ui/themes";
import {
  TrashIcon,
  Pencil2Icon,
  CheckIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import {
  useUpdateGoalMutation,
  useUnlinkGoalFamilyMemberMutation,
  useDeleteGoalMutation,
  useGetFamilyMembersQuery,
  type GetGoalQuery,
} from "@/app/__generated__/hooks";

type Goal = NonNullable<GetGoalQuery["goal"]>;

const STATUS_OPTIONS = [
  { value: "active", color: "green" as const },
  { value: "completed", color: "blue" as const },
  { value: "paused", color: "orange" as const },
  { value: "archived", color: "gray" as const },
];

const PRIORITY_OPTIONS = [
  { value: "high", color: "red" as const },
  { value: "medium", color: "orange" as const },
  { value: "low", color: "green" as const },
];

function getStatusColor(status: string) {
  return STATUS_OPTIONS.find((o) => o.value === status.toLowerCase())?.color ?? "gray";
}

export default function GoalMainCard({ goal }: { goal: Goal }) {
  const router = useRouter();

  // Title editing
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");

  // Description editing
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  // Family member editing
  const [editingFamilyMember, setEditingFamilyMember] = useState(false);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState<string>("");

  // Target date editing
  const [editingTargetDate, setEditingTargetDate] = useState(false);
  const [editedTargetDate, setEditedTargetDate] = useState("");

  const { data: familyData } = useGetFamilyMembersQuery();
  const familyMembers = familyData?.familyMembers ?? [];

  const [updateGoal, { loading: updating }] = useUpdateGoalMutation({
    onCompleted: () => {
      setEditingFamilyMember(false);
      setSelectedFamilyMemberId("");
      setEditingTargetDate(false);
    },
    refetchQueries: ["GetGoal"],
  });

  const [unlinkGoalFamilyMember, { loading: unlinkingFamilyMember }] =
    useUnlinkGoalFamilyMemberMutation({ refetchQueries: ["GetGoal"] });

  const [deleteGoal, { loading: deleting }] = useDeleteGoalMutation({
    onCompleted: () => {
      if (goal.parentGoal) {
        router.push(
          goal.parentGoal.slug
            ? `/goals/${goal.parentGoal.slug}`
            : `/goals/${goal.parentGoal.id}`,
        );
      } else {
        router.push("/goals");
      }
    },
    refetchQueries: ["GetGoals", "GetGoal"],
  });

  const handleTitleSave = async () => {
    if (!editedTitle.trim()) return;
    await updateGoal({ variables: { id: goal.id, input: { title: editedTitle.trim() } } });
    setEditingTitle(false);
  };

  const handleFamilyMemberSave = async () => {
    if (!selectedFamilyMemberId) return;
    await updateGoal({
      variables: { id: goal.id, input: { familyMemberId: parseInt(selectedFamilyMemberId, 10) } },
    });
  };

  const handleDescriptionSave = async () => {
    await updateGoal({
      variables: { id: goal.id, input: { description: editedDescription || null } },
    });
    setEditingDescription(false);
  };

  const handleTargetDateSave = async () => {
    await updateGoal({
      variables: { id: goal.id, input: { targetDate: editedTargetDate || null } },
    });
  };

  return (
    <Card
      style={{
        backgroundColor: goal.parentGoalId ? "var(--violet-3)" : "var(--indigo-3)",
      }}
    >
      <Flex direction="column" gap="4" p="1">
        <Flex justify="between" align="start" gap="3">
          <Flex direction="column" gap="1">
            {goal.parentGoalId && (
              <Badge color="violet" variant="soft" size="1" style={{ width: "fit-content" }}>
                Sub-Goal
              </Badge>
            )}
            {editingTitle ? (
              <Flex align="center" gap="2">
                <TextField.Root
                  size="3"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  autoFocus
                  style={{ fontWeight: "bold", fontSize: "inherit" }}
                />
                <IconButton size="1" variant="soft" color="green" disabled={!editedTitle.trim() || updating} onClick={handleTitleSave}>
                  <CheckIcon />
                </IconButton>
                <IconButton size="1" variant="soft" color="gray" disabled={updating} onClick={() => setEditingTitle(false)}>
                  <Cross2Icon />
                </IconButton>
              </Flex>
            ) : (
              <Flex align="center" gap="2" style={{ cursor: "pointer" }} onClick={() => { setEditedTitle(goal.title); setEditingTitle(true); }}>
                <Heading size={{ initial: "5", md: "7" }}>{goal.title}</Heading>
                <IconButton size="1" variant="ghost" color="gray" onClick={(e) => { e.stopPropagation(); setEditedTitle(goal.title); setEditingTitle(true); }}>
                  <Pencil2Icon />
                </IconButton>
              </Flex>
            )}

            {/* Family member */}
            {editingFamilyMember ? (
              <Flex align="center" gap="2">
                <Select.Root
                  value={selectedFamilyMemberId}
                  onValueChange={setSelectedFamilyMemberId}
                  disabled={updating}
                >
                  <Select.Trigger placeholder="Select family member…" />
                  <Select.Content>
                    {familyMembers.map((fm) => (
                      <Select.Item key={fm.id} value={String(fm.id)}>
                        {fm.firstName ?? fm.name}
                        {fm.relationship ? ` (${fm.relationship})` : ""}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <IconButton size="1" variant="soft" color="green" disabled={!selectedFamilyMemberId || updating} onClick={handleFamilyMemberSave}>
                  <CheckIcon />
                </IconButton>
                <IconButton size="1" variant="soft" color="gray" disabled={updating} onClick={() => setEditingFamilyMember(false)}>
                  <Cross2Icon />
                </IconButton>
              </Flex>
            ) : (
              <Flex align="center" gap="2">
                {goal.familyMember && (
                  <Badge color="cyan" size="2" style={{ width: "fit-content" }}>
                    {goal.familyMember.firstName ?? goal.familyMember.name}
                    {goal.familyMember.relationship ? ` · ${goal.familyMember.relationship}` : ""}
                  </Badge>
                )}
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => {
                    setSelectedFamilyMemberId(goal.familyMemberId ? String(goal.familyMemberId) : "");
                    setEditingFamilyMember(true);
                  }}
                  title="Change family member"
                >
                  <Pencil2Icon />
                </IconButton>
                {goal.familyMember && (
                  <IconButton
                    size="1"
                    variant="ghost"
                    color="red"
                    disabled={unlinkingFamilyMember}
                    onClick={() => unlinkGoalFamilyMember({ variables: { id: goal.id } })}
                    title="Unlink family member"
                  >
                    <Cross2Icon />
                  </IconButton>
                )}
              </Flex>
            )}
          </Flex>

          {/* Status + Priority + Delete */}
          <Flex align="center" gap="2" wrap="wrap">
            {/* Priority dropdown */}
            <Select.Root
              value={goal.priority?.toLowerCase() || "medium"}
              onValueChange={(val) => updateGoal({ variables: { id: goal.id, input: { priority: val } } })}
            >
              <Select.Trigger variant="soft" />
              <Select.Content>
                {PRIORITY_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    <Flex align="center" gap="2">
                      <Box style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--${opt.color}-9)` }} />
                      {opt.value}
                    </Flex>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            {/* Status dropdown */}
            <Select.Root
              value={goal.status?.toLowerCase() || "active"}
              onValueChange={(val) => updateGoal({ variables: { id: goal.id, input: { status: val } } })}
            >
              <Select.Trigger variant="soft" color={getStatusColor(goal.status)} />
              <Select.Content>
                {STATUS_OPTIONS.map((opt) => (
                  <Select.Item key={opt.value} value={opt.value}>
                    <Flex align="center" gap="2">
                      <Box style={{ width: 8, height: 8, borderRadius: "50%", background: `var(--${opt.color}-9)` }} />
                      {opt.value}
                    </Flex>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button variant="ghost" color="red" size="2" disabled={deleting} style={{ cursor: "pointer" }}>
                  <TrashIcon width="16" height="16" />
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content style={{ maxWidth: 450 }}>
                <AlertDialog.Title>Delete {goal.parentGoalId ? "Sub-Goal" : "Goal"}</AlertDialog.Title>
                <AlertDialog.Description size="2">
                  Are you sure you want to delete &ldquo;{goal.title}&rdquo;? This will permanently remove the{" "}
                  {goal.parentGoalId ? "sub-goal" : "goal"} and all its associated data.
                  {goal.subGoals && goal.subGoals.length > 0 && (
                    <Text as="p" size="2" color="red" weight="bold" mt="2">
                      Warning: This goal has {goal.subGoals.length} sub-goal
                      {goal.subGoals.length !== 1 ? "s" : ""} that will also be orphaned.
                    </Text>
                  )}
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray">Cancel</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solid" color="red" onClick={() => deleteGoal({ variables: { id: goal.id } })} disabled={deleting}>
                      {deleting ? "Deleting..." : "Delete"}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Flex>

        {/* Description */}
        {editingDescription ? (
          <Flex direction="column" gap="2">
            <TextArea
              size="2"
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              placeholder="Add a description..."
              style={{ minHeight: 80 }}
            />
            <Flex gap="2">
              <IconButton size="1" variant="soft" color="green" onClick={handleDescriptionSave}>
                <CheckIcon />
              </IconButton>
              <IconButton size="1" variant="soft" color="gray" onClick={() => { setEditingDescription(false); setEditedDescription(""); }}>
                <Cross2Icon />
              </IconButton>
            </Flex>
          </Flex>
        ) : (
          <Flex
            gap="2"
            align="start"
            style={{ cursor: "pointer" }}
            onClick={() => { setEditedDescription(goal.description ?? ""); setEditingDescription(true); }}
          >
            <Text size="3" style={{ whiteSpace: "pre-wrap" }} color={goal.description ? undefined : "gray"}>
              {goal.description || "Add a description..."}
            </Text>
            <IconButton size="1" variant="ghost" color="gray" onClick={(e) => { e.stopPropagation(); setEditedDescription(goal.description ?? ""); setEditingDescription(true); }}>
              <Pencil2Icon />
            </IconButton>
          </Flex>
        )}

        {/* Dates & target */}
        <Flex gap="4" wrap="wrap">
          <Flex direction="column" gap="1">
            <Text size="1" color="gray" weight="medium">Created</Text>
            <Text size="2">{new Date(goal.createdAt).toLocaleDateString()}</Text>
          </Flex>
          {goal.updatedAt !== goal.createdAt && (
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">Last Updated</Text>
              <Text size="2">{new Date(goal.updatedAt).toLocaleDateString()}</Text>
            </Flex>
          )}
          <Flex direction="column" gap="1">
            <Text size="1" color="gray" weight="medium">Target Date</Text>
            {editingTargetDate ? (
              <Flex align="center" gap="2">
                <input
                  type="date"
                  value={editedTargetDate}
                  onChange={(e) => setEditedTargetDate(e.target.value)}
                  style={{
                    background: "transparent",
                    border: "1px solid var(--gray-6)",
                    borderRadius: 4,
                    padding: "2px 6px",
                    color: "var(--gray-12)",
                    fontSize: 13,
                  }}
                />
                <IconButton size="1" variant="soft" color="green" onClick={handleTargetDateSave}>
                  <CheckIcon />
                </IconButton>
                <IconButton size="1" variant="soft" color="gray" onClick={() => setEditingTargetDate(false)}>
                  <Cross2Icon />
                </IconButton>
              </Flex>
            ) : (
              <Flex align="center" gap="1" style={{ cursor: "pointer" }} onClick={() => { setEditedTargetDate(goal.targetDate || ""); setEditingTargetDate(true); }}>
                <Text size="2" color={goal.targetDate ? undefined : "gray"}>
                  {goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : "Set target..."}
                </Text>
                <IconButton size="1" variant="ghost" color="gray">
                  <Pencil2Icon />
                </IconButton>
              </Flex>
            )}
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
}
