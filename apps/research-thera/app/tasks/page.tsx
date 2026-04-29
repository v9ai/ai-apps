"use client";

import { useSearchParams } from "next/navigation";
import { Flex, Heading, Text } from "@radix-ui/themes";
import {
  useGetTasksQuery,
  useGetTaskCountsQuery,
  useGetUserPreferencesQuery,
  useGetUserStreakQuery,
  TaskStatus,
} from "@/app/__generated__/hooks";
import { TaskList } from "./components/TaskList";
import { StatusTabs } from "./components/StatusTabs";
import { SettingsModal } from "./components/SettingsModal";
import { StreakCounter } from "./components/StreakCounter";
import type { Task } from "./components/types";

const VALID_STATUSES = ["inbox", "active", "completed"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

const STATUS_TO_ENUM: Record<ValidStatus, TaskStatus> = {
  inbox: TaskStatus.Inbox,
  active: TaskStatus.Active,
  completed: TaskStatus.Completed,
};

const emptyMessages: Record<string, string> = {
  inbox: "Your inbox is empty. Press Cmd+K to capture a task.",
  active: "No active tasks. Move tasks from your inbox to get started.",
  completed: "No completed tasks yet. Complete some tasks to see them here.",
};

export default function TasksPage() {
  const params = useSearchParams();
  const rawStatus = params.get("status") ?? "inbox";
  const status: ValidStatus = (VALID_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as ValidStatus)
    : "inbox";

  const { data: prefsData } = useGetUserPreferencesQuery();
  const { data: countsData } = useGetTaskCountsQuery();
  const { data: streakData } = useGetUserStreakQuery();
  const { data: tasksData } = useGetTasksQuery({
    variables: {
      status: STATUS_TO_ENUM[status],
      limit: prefsData?.userPreferences.chunkSize ?? 7,
      offset: 0,
    },
  });

  const prefs = prefsData?.userPreferences;
  const counts = countsData?.taskCounts ?? { inbox: 0, active: 0, completed: 0, archived: 0 };
  const streak = streakData?.userStreak;
  const tasks = (tasksData?.tasks ?? []) as Task[];
  const totalCount = counts[status];

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between">
        <Flex align="center" gap="3">
          <Heading size="5">Tasks</Heading>
          {streak && prefs?.gamificationEnabled && (
            <StreakCounter
              currentStreak={streak.currentStreak}
              longestStreak={streak.longestStreak}
              freezeAvailable={streak.freezeAvailable}
              optedIn={streak.streakOptIn}
            />
          )}
        </Flex>
        {prefs && (
          <SettingsModal
            chronotype={prefs.chronotype}
            chunkSize={prefs.chunkSize}
            gamificationEnabled={prefs.gamificationEnabled}
            bufferPercentage={prefs.bufferPercentage}
            priorityWeights={prefs.priorityWeights}
          />
        )}
      </Flex>

      <Text size="2" color="gray">
        Press{" "}
        <kbd
          style={{
            padding: "2px 6px",
            borderRadius: 4,
            border: "1px solid var(--gray-a6)",
            fontSize: "0.85em",
          }}
        >
          Cmd+K
        </kbd>{" "}
        to add a task
      </Text>

      <StatusTabs counts={counts} />

      {totalCount === 0 ? (
        <Text size="3" color="gray" align="center" style={{ marginTop: 40 }}>
          {emptyMessages[status]}
        </Text>
      ) : (
        <TaskList
          initialTasks={tasks}
          totalCount={totalCount}
          status={status}
          chunkSize={prefs?.chunkSize ?? 7}
        />
      )}
    </Flex>
  );
}

