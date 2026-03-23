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
} from "@radix-ui/themes";
import { CheckIcon, ResetIcon } from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import {
  useGetHabitsQuery,
  useLogHabitMutation,
  useDeleteHabitMutation,
  HabitStatus,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";
import AddHabitButton from "@/app/components/AddHabitButton";
import { AuthGate } from "@/app/components/AuthGate";

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
        <Heading size="5">My Habits ({habits.length})</Heading>
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
          <AddHabitButton />
        </Flex>
      </Flex>

      {habits.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text color="gray">No habits found</Text>
            <Text size="2" color="gray">
              {statusFilter
                ? `No ${statusFilter.toLowerCase()} habits yet`
                : "Create your first habit to start tracking"}
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {habits.map((habit) => {
            const isDoneToday = !!habit.todayLog;
            const todayCount = habit.todayLog?.count ?? 0;
            const isComplete = todayCount >= habit.targetCount;

            return (
              <Card key={habit.id}>
                <Flex direction="column" gap="3" p="4">
                  <Flex justify="between" align="start" gap="3">
                    <Flex direction="column" gap="2" style={{ flex: 1 }}>
                      <Flex align="center" gap="2">
                        <Heading size="4">{habit.title}</Heading>
                        {isComplete && (
                          <Badge color="green" variant="soft" size="1">
                            Done
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
                        {habit.status.charAt(0) + habit.status.slice(1).toLowerCase()}
                      </Badge>
                    </Flex>
                  </Flex>

                  <Flex gap="4" align="center" wrap="wrap" justify="between">
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
                      {!isComplete && habit.status === HabitStatus.Active && (
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
