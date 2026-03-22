"use client";

import { Flex, Heading, Text, Card, Badge } from "@radix-ui/themes";
import NextLink from "next/link";
import AddSubGoalButton from "@/app/components/AddSubGoalButton";
import type { GetGoalQuery } from "@/app/__generated__/hooks";

type Goal = NonNullable<GetGoalQuery["goal"]>;

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active": return "green" as const;
    case "completed": return "blue" as const;
    case "paused": return "orange" as const;
    default: return "gray" as const;
  }
}

export default function SubGoalsList({ goal }: { goal: Goal }) {
  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center">
          <Heading size="4">
            Sub-Goals {goal.subGoals ? `(${goal.subGoals.length})` : ""}
          </Heading>
          <AddSubGoalButton goalId={goal.id} />
        </Flex>

        {goal.subGoals && goal.subGoals.length > 0 ? (
          <Flex direction="column" gap="2">
            {goal.subGoals.map((subGoal) => (
              <Card key={subGoal.id} style={{ backgroundColor: "var(--gray-2)" }} asChild>
                <NextLink
                  href={subGoal.slug ? `/goals/${subGoal.slug}` : `/goals/${subGoal.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <Flex direction="column" gap="2" p="3">
                    <Flex justify="between" align="center">
                      <Text size="3" weight="medium">{subGoal.title}</Text>
                      <Badge color={getStatusColor(subGoal.status)} size="1">{subGoal.status}</Badge>
                    </Flex>
                    {subGoal.description && (
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
                        {subGoal.description}
                      </Text>
                    )}
                    <Text size="1" color="gray">
                      Created {new Date(subGoal.createdAt).toLocaleDateString()}
                    </Text>
                  </Flex>
                </NextLink>
              </Card>
            ))}
          </Flex>
        ) : (
          <Text size="2" color="gray">
            No sub-goals yet. Break this goal into smaller steps.
          </Text>
        )}
      </Flex>
    </Card>
  );
}
