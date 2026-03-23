"use client";

import { useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  Button,
  IconButton,
  Tooltip,
  Separator,
  Table,
  AlertDialog,
  Dialog,
  Select,
  TextField,
  TextArea,
} from "@radix-ui/themes";
import {
  CheckIcon,
  TrashIcon,
  Pencil1Icon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetHabitQuery,
  useGetIssueQuery,
  useGetFamilyMemberQuery,
  useLogHabitMutation,
  useDeleteHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitLogMutation,
  HabitStatus,
  HabitFrequency,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";

function HabitDetailContent() {
  const router = useRouter();
  const params = useParams();
  const habitId = parseInt(params.id as string, 10);

  const { data, loading, error, refetch } = useGetHabitQuery({
    variables: { id: habitId },
    skip: isNaN(habitId),
  });

  const habit = data?.habit;

  const { data: issueData } = useGetIssueQuery({
    variables: { id: habit?.issueId! },
    skip: !habit?.issueId,
  });

  const { data: familyData } = useGetFamilyMemberQuery({
    variables: { id: habit?.familyMemberId! },
    skip: !habit?.familyMemberId,
  });

  const [logHabit] = useLogHabitMutation({ refetchQueries: ["GetHabit"] });
  const [deleteHabit, { loading: deleting }] = useDeleteHabitMutation({
    onCompleted: () => router.push("/habits"),
  });
  const [updateHabit, { loading: updating }] = useUpdateHabitMutation({
    refetchQueries: ["GetHabit"],
  });
  const [deleteHabitLog] = useDeleteHabitLogMutation({
    refetchQueries: ["GetHabit"],
  });

  const today = new Date().toISOString().slice(0, 10);

  // Edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFrequency, setEditFrequency] = useState("DAILY");
  const [editTargetCount, setEditTargetCount] = useState("1");
  const [editStatus, setEditStatus] = useState("ACTIVE");

  const openEdit = () => {
    if (!habit) return;
    setEditTitle(habit.title);
    setEditDescription(habit.description ?? "");
    setEditFrequency(habit.frequency);
    setEditTargetCount(String(habit.targetCount));
    setEditStatus(habit.status);
    setEditOpen(true);
  };

  const handleSave = async () => {
    await updateHabit({
      variables: {
        id: habitId,
        input: {
          title: editTitle,
          description: editDescription || null,
          frequency: editFrequency as HabitFrequency,
          targetCount: parseInt(editTargetCount) || 1,
          status: editStatus as HabitStatus,
        },
      },
    });
    setEditOpen(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case HabitStatus.Active:
        return "green" as const;
      case HabitStatus.Paused:
        return "orange" as const;
      default:
        return "gray" as const;
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 200 }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !habit) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error?.message || "Habit not found"}</Text>
          <Button variant="soft" asChild>
            <NextLink href="/habits">Back to Habits</NextLink>
          </Button>
        </Flex>
      </Card>
    );
  }

  const todayCount = habit.todayLog?.count ?? 0;
  const isComplete = todayCount >= habit.targetCount;
  const logs = habit.logs ?? [];

  const issue = issueData?.issue;
  const familyMember = familyData?.familyMember;
  const familySlug = familyMember?.slug ?? String(habit.familyMemberId);

  return (
    <Flex direction="column" gap="4">
      <Breadcrumbs
        crumbs={[
          { label: "Habits", href: "/habits" },
          { label: habit.title },
        ]}
      />

      {/* Header */}
      <Flex justify="between" align="start" wrap="wrap" gap="3">
        <Flex direction="column" gap="2">
          <Flex align="center" gap="3" wrap="wrap">
            <Heading size="6">{habit.title}</Heading>
            <Badge color={statusColor(habit.status)} variant="soft" size="2">
              {habit.status.charAt(0) + habit.status.slice(1).toLowerCase()}
            </Badge>
            {isComplete && (
              <Badge color="green" variant="solid" size="1">
                Done today
              </Badge>
            )}
          </Flex>
          {habit.description && (
            <Text size="3" color="gray">
              {habit.description}
            </Text>
          )}
          <Flex gap="3" align="center" wrap="wrap">
            {issue && (
              <Badge color="orange" variant="soft" size="1" asChild>
                <NextLink
                  href={`/family/${familySlug}/issues/${issue.id}`}
                  style={{ textDecoration: "none" }}
                >
                  Issue: {issue.title}
                </NextLink>
              </Badge>
            )}
            {familyMember && (
              <Badge color="cyan" variant="soft" size="1" asChild>
                <NextLink
                  href={`/family/${familySlug}`}
                  style={{ textDecoration: "none" }}
                >
                  {familyMember.firstName}
                </NextLink>
              </Badge>
            )}
          </Flex>
        </Flex>
        <Flex gap="2">
          <Button variant="soft" size="2" onClick={openEdit}>
            <Pencil1Icon />
            Edit
          </Button>
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button variant="soft" color="red" size="2">
                <TrashIcon />
                Delete
              </Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content>
              <AlertDialog.Title>Delete Habit</AlertDialog.Title>
              <AlertDialog.Description>
                This will permanently delete this habit and all its logs.
              </AlertDialog.Description>
              <Flex gap="3" justify="end" mt="4">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button
                    color="red"
                    disabled={deleting}
                    onClick={() =>
                      deleteHabit({ variables: { id: habitId } })
                    }
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>
        </Flex>
      </Flex>

      <Separator size="4" />

      {/* Details */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Heading size="3">Details</Heading>
          <Flex gap="6" wrap="wrap">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Frequency
              </Text>
              <Badge color="indigo" variant="outline" size="2">
                {habit.frequency === "DAILY" ? "Daily" : "Weekly"}
              </Badge>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Target
              </Text>
              <Text size="3" weight="medium">
                {habit.targetCount}× per{" "}
                {habit.frequency === "DAILY" ? "day" : "week"}
              </Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Today
              </Text>
              <Flex align="center" gap="2">
                <Text size="3" weight="medium">
                  {todayCount}/{habit.targetCount}
                </Text>
                {!isComplete && habit.status === HabitStatus.Active && (
                  <Tooltip content="Log once">
                    <IconButton
                      size="1"
                      variant="soft"
                      color="green"
                      onClick={() =>
                        logHabit({
                          variables: {
                            habitId,
                            loggedDate: today,
                            count: 1,
                          },
                        })
                      }
                    >
                      <CheckIcon width="14" height="14" />
                    </IconButton>
                  </Tooltip>
                )}
              </Flex>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray" weight="medium">
                Created
              </Text>
              <Text size="2">
                {new Date(habit.createdAt).toLocaleDateString()}
              </Text>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      {/* Log History */}
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Heading size="3">Log History ({logs.length})</Heading>
          {logs.length === 0 ? (
            <Text size="2" color="gray">
              No logs yet. Start tracking by logging your habit above.
            </Text>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Count</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell width="60px" />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {logs.map((log) => (
                  <Table.Row key={log.id}>
                    <Table.Cell>
                      {new Date(log.loggedDate).toLocaleDateString()}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color="green" variant="soft">
                        {log.count}×
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2" color="gray">
                        {log.notes || "—"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Tooltip content="Delete log">
                        <IconButton
                          size="1"
                          variant="ghost"
                          color="red"
                          onClick={() =>
                            deleteHabitLog({ variables: { id: log.id } })
                          }
                        >
                          <Cross2Icon width="14" height="14" />
                        </IconButton>
                      </Tooltip>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Flex>
      </Card>

      {/* Edit Dialog */}
      <Dialog.Root open={editOpen} onOpenChange={setEditOpen}>
        <Dialog.Content style={{ maxWidth: 480 }}>
          <Dialog.Title>Edit Habit</Dialog.Title>
          <Flex direction="column" gap="4" mt="2">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Title
              </Text>
              <TextField.Root
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Description
              </Text>
              <TextArea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </Flex>
            <Flex gap="4">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="medium">
                  Frequency
                </Text>
                <Select.Root
                  value={editFrequency}
                  onValueChange={setEditFrequency}
                >
                  <Select.Trigger />
                  <Select.Content>
                    <Select.Item value="DAILY">Daily</Select.Item>
                    <Select.Item value="WEEKLY">Weekly</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="medium">
                  Target Count
                </Text>
                <TextField.Root
                  type="number"
                  min="1"
                  max="10"
                  value={editTargetCount}
                  onChange={(e) => setEditTargetCount(e.target.value)}
                />
              </Flex>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Status
              </Text>
              <Select.Root value={editStatus} onValueChange={setEditStatus}>
                <Select.Trigger />
                <Select.Content>
                  <Select.Item value="ACTIVE">Active</Select.Item>
                  <Select.Item value="PAUSED">Paused</Select.Item>
                  <Select.Item value="ARCHIVED">Archived</Select.Item>
                </Select.Content>
              </Select.Root>
            </Flex>
            <Flex gap="3" justify="end">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                onClick={handleSave}
                disabled={updating || !editTitle.trim()}
              >
                {updating ? "Saving..." : "Save"}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

const DynamicHabitDetail = dynamic(
  () => Promise.resolve(HabitDetailContent),
  { ssr: false },
);

export default function HabitPage() {
  return (
    <AuthGate pageName="Habit" description="Sign in to view habit details.">
      <DynamicHabitDetail />
    </AuthGate>
  );
}
