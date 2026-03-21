"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Checkbox, Flex, Text, Badge } from "@radix-ui/themes";
import { PriorityBadge } from "./PriorityBadge";
import { Linkify } from "./Linkify";
import { updateTaskAction } from "@/lib/actions/tasks";
import { format } from "date-fns";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorityScore: number | null;
  priorityManual: number | null;
  dueDate: Date | null;
  estimatedMinutes: number | null;
  energyPreference: string | null;
  parentTaskId: string | null;
  completedAt: Date | null;
};

export function TaskCard({
  task,
  index,
  onOpen,
}: {
  task: Task;
  index: number;
  onOpen: () => void;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isCompleted = task.status === "completed";

  function handleComplete() {
    setCompleting(true);
    startTransition(async () => {
      await updateTaskAction({ id: task.id, status: "completed" });
      router.refresh();
    });
  }

  return (
    <Card
      className={completing ? "task-completing" : "fade-in"}
      style={{
        opacity: isPending && !completing ? 0.6 : 1,
        transition: "opacity 150ms",
        cursor: "pointer",
      }}
      onClick={onOpen}
    >
      <Flex align="center" gap="3">
        <Text
          size="1"
          weight="bold"
          style={{
            minWidth: 20,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            color: index <= 9 ? "var(--cyan-9)" : "var(--gray-8)",
          }}
        >
          {index}
        </Text>

        {!isCompleted && (
          <Box
            style={{ paddingTop: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={false}
              onCheckedChange={handleComplete}
              disabled={isPending}
            />
          </Box>
        )}

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text
              size="2"
              weight="medium"
              style={{
                textDecoration: isCompleted ? "line-through" : "none",
                color: isCompleted ? "var(--gray-9)" : "var(--gray-12)",
              }}
            >
              {task.title}
            </Text>
            <PriorityBadge
              score={task.priorityScore}
              manual={task.priorityManual}
            />
            {task.dueDate && (
              <Badge variant="outline" size="1">
                {format(new Date(task.dueDate), "MMM d")}
              </Badge>
            )}
            {task.energyPreference && (
              <Badge variant="soft" color="blue" size="1">
                {task.energyPreference}
              </Badge>
            )}
            {task.estimatedMinutes && (
              <Badge variant="soft" color="gray" size="1">
                {task.estimatedMinutes}m
              </Badge>
            )}
          </Flex>

          {task.description && (
            <Text
              size="1"
              color="gray"
              as="p"
              style={{
                marginTop: 4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                whiteSpace: "pre-wrap",
              }}
            >
              <Linkify text={task.description} />
            </Text>
          )}
        </Box>
      </Flex>
    </Card>
  );
}
