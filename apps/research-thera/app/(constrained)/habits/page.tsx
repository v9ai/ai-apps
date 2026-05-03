"use client";

import { useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Spinner,
  Select,
  IconButton,
  Tooltip,
  Callout,
  Dialog,
} from "@radix-ui/themes";
import {
  CheckIcon,
  MagicWandIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import {
  useGetHabitsQuery,
  useLogHabitMutation,
  useDeleteHabitMutation,
  useGetFamilyMembersQuery,
  useGenerateHabitsForFamilyMemberMutation,
  HabitStatus,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import AddHabitButton from "@/app/components/AddHabitButton";
import { AuthGate } from "@/app/components/AuthGate";

function GenerateHabitsDialog({ onGenerated }: { onGenerated: () => void }) {
  const [open, setOpen] = useState(false);
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState("");
  const [count, setCount] = useState("5");
  const [result, setResult] = useState<string | null>(null);

  const { data: familyData } = useGetFamilyMembersQuery();
  const familyMembers = familyData?.familyMembers ?? [];

  const [generateHabits, { loading }] =
    useGenerateHabitsForFamilyMemberMutation({
      onCompleted: (data) => {
        const n = data.generateHabitsForFamilyMember.count ?? 0;
        setResult(`Generated ${n} new habit${n !== 1 ? "s" : ""} successfully`);
        onGenerated();
      },
      onError: (err) => {
        setResult(`Error: ${err.message}`);
      },
      refetchQueries: ["GetHabits"],
    });

  const handleGenerate = async () => {
    if (!selectedFamilyMemberId) return;
    setResult(null);
    await generateHabits({
      variables: {
        familyMemberId: parseInt(selectedFamilyMemberId, 10),
        count: parseInt(count, 10) || 5,
      },
    });
  };

  function handleOpenChange(next: boolean) {
    if (!next) setResult(null);
    setOpen(next);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button size="3" variant="soft" color="indigo">
          <MagicWandIcon />
          AI Generate
        </Button>
      </Dialog.Trigger>
      <Dialog.Content style={{ maxWidth: 460 }}>
        <Dialog.Title>Generate Habits with AI</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          LangGraph analyzes a family member&rsquo;s goals, issues, and
          characteristics to generate personalized therapeutic habits.
        </Dialog.Description>

        <Flex direction="column" gap="4">
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
                  No family members found. Add a family member first.
                </Callout.Text>
              </Callout.Root>
            ) : (
              <Select.Root
                value={selectedFamilyMemberId}
                onValueChange={setSelectedFamilyMemberId}
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

          <Flex direction="column" gap="1">
            <Text as="div" size="2" weight="medium">
              Number of habits to generate
            </Text>
            <Select.Root
              value={count}
              onValueChange={setCount}
              disabled={loading}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="3">3</Select.Item>
                <Select.Item value="5">5</Select.Item>
                <Select.Item value="7">7</Select.Item>
                <Select.Item value="10">10</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          {result && (
            <Callout.Root
              color={result.startsWith("Error") ? "red" : "green"}
              size="1"
            >
              <Callout.Text>{result}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={loading}>
                {result ? "Close" : "Cancel"}
              </Button>
            </Dialog.Close>
            {!result && (
              <Button
                onClick={handleGenerate}
                disabled={loading || !selectedFamilyMemberId || familyMembers.length === 0}
                loading={loading}
              >
                <MagicWandIcon />
                {loading ? "Generating…" : "Generate"}
              </Button>
            )}
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function HabitsListContent() {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  const { data, loading, error, refetch } = useGetHabitsQuery({
    variables: {
      status: statusFilter,
    },
  });

  const today = new Date().toISOString().slice(0, 10);

  const [logHabit] = useLogHabitMutation({
    refetchQueries: ["GetHabits"],
  });

  const [deleteHabit] = useDeleteHabitMutation({
    refetchQueries: ["GetHabits"],
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error.message}</Text>
          <Button onClick={() => refetch()}>Retry</Button>
        </Flex>
      </Card>
    );
  }

  const habits = data?.habits || [];
  const completedToday = habits.filter((h) => !!h.todayLog).length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case HabitStatus.Active:
        return "green" as const;
      case HabitStatus.Paused:
        return "orange" as const;
      case HabitStatus.Archived:
        return "gray" as const;
      default:
        return "gray" as const;
    }
  };

  const getFrequencyLabel = (freq: string) =>
    freq === "DAILY" ? "Daily" : "Weekly";

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Flex align="center" gap="3">
          <Heading size="5">My Habits ({habits.length})</Heading>
          {habits.length > 0 && (
            <Badge color="green" variant="soft" size="1">
              {completedToday}/{habits.length} today
            </Badge>
          )}
        </Flex>
        <Flex gap="3" align="center">
          <Select.Root
            value={statusFilter || "all"}
            onValueChange={(value) =>
              setStatusFilter(value === "all" ? undefined : value)
            }
          >
            <Select.Trigger placeholder="Filter by status" />
            <Select.Content>
              <Select.Item value="all">All Statuses</Select.Item>
              <Select.Item value="ACTIVE">Active</Select.Item>
              <Select.Item value="PAUSED">Paused</Select.Item>
              <Select.Item value="ARCHIVED">Archived</Select.Item>
            </Select.Content>
          </Select.Root>
          <GenerateHabitsDialog onGenerated={() => refetch()} />
          <AddHabitButton />
        </Flex>
      </Flex>

      {habits.length === 0 ? (
        <Card>
          <Flex direction="column" gap="3" p="6" align="center">
            <Text color="gray" size="3">
              No habits found
            </Text>
            <Text size="2" color="gray" align="center">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} habits yet`
                : "Create your first habit manually or use AI to generate personalized habits from a family member's profile"}
            </Text>
            <GenerateHabitsDialog onGenerated={() => refetch()} />
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {habits.map((habit) => {
            const isDoneToday = !!habit.todayLog;
            const todayCount = habit.todayLog?.count ?? 0;
            const isComplete = todayCount >= habit.targetCount;

            return (
              <NextLink key={habit.id} href={`/habits/${habit.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <Card style={{ cursor: "pointer" }}>
                <Flex direction="column" gap="3" p="4">
                  <Flex justify="between" align="start" gap="3">
                    <Flex direction="column" gap="2" style={{ flex: 1 }}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Heading size="4">{habit.title}</Heading>
                        {isComplete && (
                          <Badge color="green" variant="soft" size="1">
                            Done
                          </Badge>
                        )}
                        {habit.familyMemberId && (
                          <Badge color="cyan" variant="outline" size="1">
                            AI
                          </Badge>
                        )}
                      </Flex>
                      {habit.description && (
                        <Text
                          size="2"
                          color="gray"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {habit.description}
                        </Text>
                      )}
                    </Flex>
                    <Flex gap="2" align="center">
                      <Badge
                        color={getStatusColor(habit.status)}
                        variant="soft"
                        size="2"
                      >
                        {habit.status.charAt(0) +
                          habit.status.slice(1).toLowerCase()}
                      </Badge>
                    </Flex>
                  </Flex>

                  <Flex
                    gap="4"
                    align="center"
                    wrap="wrap"
                    justify="between"
                  >
                    <Flex gap="3" align="center">
                      <Badge color="indigo" variant="outline" size="1">
                        {getFrequencyLabel(habit.frequency)}
                      </Badge>
                      {habit.targetCount > 1 && (
                        <Text size="1" color="gray">
                          Target: {todayCount}/{habit.targetCount}
                        </Text>
                      )}
                      <Text size="1" color="gray">
                        Created {new Date(habit.createdAt).toLocaleDateString()}
                      </Text>
                    </Flex>

                    <Flex gap="2">
                      {!isComplete &&
                        habit.status === HabitStatus.Active && (
                          <Tooltip content="Log today">
                            <IconButton
                              size="2"
                              variant="soft"
                              color="green"
                              onClick={(e) => {
                                e.stopPropagation();
                                logHabit({
                                  variables: {
                                    habitId: habit.id,
                                    loggedDate: today,
                                    count: 1,
                                  },
                                });
                              }}
                            >
                              <CheckIcon width="16" height="16" />
                            </IconButton>
                          </Tooltip>
                        )}
                    </Flex>
                  </Flex>
                </Flex>
              </Card>
              </NextLink>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}

const DynamicHabitsListContent = dynamic(
  () => Promise.resolve(HabitsListContent),
  { ssr: false },
);

export default function HabitsPage() {
  return (
    <AuthGate
      pageName="Habits"
      description="Your habits are private. Sign in to track your progress."
    >
      <Flex direction="column" gap="4">
        <Heading size={{ initial: "6", md: "8" }}>Habits</Heading>
        <DynamicHabitsListContent />
      </Flex>
    </AuthGate>
  );
}
