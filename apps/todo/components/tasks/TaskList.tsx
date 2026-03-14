"use client";

import { useState, useRef, useEffect, useTransition } from "react";
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
  const knownIds = useRef(new Set(initialTasks.map((t) => t.id)));
  const newIds = useRef(new Set<string>());
  const hasMore = tasks.length < totalCount;

  // Sync when server data changes (after router.refresh)
  useEffect(() => {
    const incoming = new Set(initialTasks.map((t) => t.id));
    for (const id of incoming) {
      if (!knownIds.current.has(id)) {
        newIds.current.add(id);
      }
    }
    knownIds.current = incoming;
    setTasks(initialTasks);
  }, [initialTasks]);

  function handleLoadMore() {
    startTransition(async () => {
      const moreTasks = await loadMoreTasks(status, tasks.length, chunkSize);
      const loaded = moreTasks as Task[];
      for (const t of loaded) knownIds.current.add(t.id);
      setTasks((prev) => [...prev, ...loaded]);
    });
  }

  return (
    <Flex direction="column" gap="2">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          defaultExpanded={newIds.current.has(task.id)}
        />
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
