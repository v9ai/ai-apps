"use client";

import { useState, useTransition } from "react";
import { Button, Flex } from "@radix-ui/themes";
import { TaskCard } from "./TaskCard";
import { loadMoreTasks } from "@/lib/actions/tasks";

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

export function TaskList({
  initialTasks,
  totalCount,
  status,
  chunkSize = 7,
}: {
  initialTasks: Task[];
  totalCount: number;
  status: "inbox" | "active" | "completed" | "archived";
  chunkSize?: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isPending, startTransition] = useTransition();
  const hasMore = tasks.length < totalCount;

  function handleLoadMore() {
    startTransition(async () => {
      const moreTasks = await loadMoreTasks(status, tasks.length, chunkSize);
      setTasks((prev) => [...prev, ...(moreTasks as Task[])]);
    });
  }

  return (
    <Flex direction="column" gap="2">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
      {hasMore && (
        <Button
          variant="ghost"
          color="gray"
          onClick={handleLoadMore}
          disabled={isPending}
          style={{ alignSelf: "center", marginTop: 8 }}
        >
          {isPending ? "Loading..." : `Load more (${totalCount - tasks.length} remaining)`}
        </Button>
      )}
    </Flex>
  );
}
