"use client";

import Link from "next/link";
import { Flex, Heading, Text } from "@radix-ui/themes";
import {
  useGetTasksQuery,
  useGetTaskCountsQuery,
  useGetUserPreferencesQuery,
  TaskStatus,
} from "@/app/__generated__/hooks";
import { TaskList } from "../tasks/components/TaskList";
import type { Task } from "../tasks/components/types";

export function HomeTasks() {
  const { data: prefsData } = useGetUserPreferencesQuery();
  const { data: countsData } = useGetTaskCountsQuery();
  const chunkSize = prefsData?.userPreferences.chunkSize ?? 7;

  const inbox = useGetTasksQuery({
    variables: { status: TaskStatus.Inbox, limit: chunkSize, offset: 0 },
  });

  const counts = countsData?.taskCounts;
  if (!counts) return null;

  const tasks = (inbox.data?.tasks ?? []) as Task[];
  const inboxCount = counts.inbox;

  return (
    <Flex direction="column" gap="3">
      <Link href="/tasks" style={{ textDecoration: "none", color: "inherit" }}>
        <Heading size="6">Your Tasks</Heading>
      </Link>
      <Heading size="4">Inbox ({inboxCount})</Heading>
      {inboxCount > 0 ? (
        <TaskList
          initialTasks={tasks}
          totalCount={inboxCount}
          status="inbox"
          chunkSize={chunkSize}
        />
      ) : (
        <Text size="3" color="gray">
          Your inbox is empty.
        </Text>
      )}
    </Flex>
  );
}
