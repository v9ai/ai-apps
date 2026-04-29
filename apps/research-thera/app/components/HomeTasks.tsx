"use client";

import { Flex, Heading } from "@radix-ui/themes";
import {
  useGetTasksQuery,
  useGetTaskCountsQuery,
  useGetUserPreferencesQuery,
  TaskStatus,
} from "@/app/__generated__/hooks";
import { TaskList } from "../tasks/components/TaskList";
import type { Task } from "../tasks/components/types";

const STATUS_SECTIONS = [
  { key: "inbox", label: "Inbox", status: TaskStatus.Inbox },
  { key: "active", label: "Active", status: TaskStatus.Active },
  { key: "completed", label: "Completed", status: TaskStatus.Completed },
] as const;

export function HomeTasks() {
  const { data: prefsData } = useGetUserPreferencesQuery();
  const { data: countsData } = useGetTaskCountsQuery();
  const chunkSize = prefsData?.userPreferences.chunkSize ?? 7;

  const inbox = useGetTasksQuery({
    variables: { status: TaskStatus.Inbox, limit: chunkSize, offset: 0 },
  });
  const active = useGetTasksQuery({
    variables: { status: TaskStatus.Active, limit: chunkSize, offset: 0 },
  });
  const completed = useGetTasksQuery({
    variables: { status: TaskStatus.Completed, limit: chunkSize, offset: 0 },
  });

  const counts = countsData?.taskCounts;
  const dataByKey = {
    inbox: inbox.data?.tasks,
    active: active.data?.tasks,
    completed: completed.data?.tasks,
  };

  if (!counts) return null;

  const visible = STATUS_SECTIONS.filter((s) => counts[s.key] > 0);
  if (visible.length === 0) return null;

  return (
    <Flex direction="column" gap="5">
      <Heading size="6">Your Tasks</Heading>
      {visible.map((s) => {
        const tasks = (dataByKey[s.key] ?? []) as Task[];
        return (
          <Flex key={s.key} direction="column" gap="2">
            <Heading size="4">
              {s.label} ({counts[s.key]})
            </Heading>
            <TaskList
              initialTasks={tasks}
              totalCount={counts[s.key]}
              status={s.key}
              chunkSize={chunkSize}
            />
          </Flex>
        );
      })}
    </Flex>
  );
}
