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
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useGetGoalsQuery } from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";
import AddGoalButton from "@/app/components/AddGoalButton";
import { AuthGate } from "@/app/components/AuthGate";

function GoalsListContent() {
  const router = useRouter();
  const { user } = useUser();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );

  const { data, loading, error, refetch } = useGetGoalsQuery({
    variables: {
      status: statusFilter,
    },
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

  const allGoals = data?.goals || [];
  const goals = allGoals.filter((g) => !g.parentGoalId);
  const subGoalCount = allGoals.length - goals.length;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "green";
      case "completed":
        return "blue";
      case "paused":
        return "orange";
      case "archived":
        return "gray";
      default:
        return "gray";
    }
  };

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Heading size="5">
          My Goals ({goals.length})
          {subGoalCount > 0 && (
            <Text size="2" color="gray" weight="regular">
              {" "}
              + {subGoalCount} sub-goal{subGoalCount !== 1 ? "s" : ""}
            </Text>
          )}
        </Heading>
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
              <Select.Item value="active">Active</Select.Item>
              <Select.Item value="completed">Completed</Select.Item>
              <Select.Item value="paused">Paused</Select.Item>
              <Select.Item value="archived">Archived</Select.Item>
            </Select.Content>
          </Select.Root>
          <AddGoalButton />
        </Flex>
      </Flex>

      {goals.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text color="gray">No goals found</Text>
            <Text size="2" color="gray">
              {statusFilter
                ? `No ${statusFilter} goals yet`
                : "Create your first goal to get started"}
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {goals.map((goal) => (
            <Card
              key={goal.id}
              style={{ cursor: "pointer" }}
              onClick={() => router.push(`/goals/${goal.id}`)}
            >
              <Flex direction="column" gap="3" p="4">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="2" style={{ flex: 1 }}>
                    <Heading size="4">{goal.title}</Heading>
                    {goal.familyMember && (
                      <Badge
                        color="cyan"
                        size="1"
                        style={{ width: "fit-content" }}
                      >
                        {goal.familyMember.firstName ?? goal.familyMember.name}
                        {goal.familyMember.relationship
                          ? ` · ${goal.familyMember.relationship}`
                          : ""}
                      </Badge>
                    )}
                    {goal.description && (
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
                        {goal.description}
                      </Text>
                    )}
                  </Flex>
                  <Badge
                    color={getStatusColor(goal.status)}
                    variant="soft"
                    size="2"
                  >
                    {goal.status}
                  </Badge>
                </Flex>

                <Flex gap="4" align="center" wrap="wrap">
                  {goal.notes && goal.notes.length > 0 && (
                    <Flex align="center" gap="2">
                      <Badge color="indigo" variant="outline" size="1">
                        {goal.notes.length} note
                        {goal.notes.length !== 1 ? "s" : ""}
                      </Badge>
                    </Flex>
                  )}
                  <Text size="1" color="gray">
                    Created {new Date(goal.createdAt).toLocaleDateString()}
                  </Text>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}

const DynamicGoalsListContent = dynamic(
  () => Promise.resolve(GoalsListContent),
  { ssr: false },
);

export default function GoalsPage() {
  return (
    <AuthGate
      pageName="Goals"
      description="Your therapeutic goals are private. Sign in to manage your progress."
    >
      <Flex direction="column" gap="4">
        <Heading size="8">Goals</Heading>
        <DynamicGoalsListContent />
      </Flex>
    </AuthGate>
  );
}
