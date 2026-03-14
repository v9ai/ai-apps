import { headers } from "next/headers";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { auth } from "@/lib/auth";
import { getTasksByStatus, getAllTaskCounts } from "@/lib/queries/tasks";
import { TaskList } from "@/components/tasks/TaskList";
import { StatusTabs } from "@/components/navigation/StatusTabs";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { db } from "@/src/db";
import { userPreferences } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import type { TaskStatus } from "@/src/db/schema";

const VALID_STATUSES = ["inbox", "active", "completed"] as const;

const emptyMessages: Record<string, string> = {
  inbox: "Your inbox is empty. Capture a task to get started.",
  active: "No active tasks. Move tasks from your inbox to get started.",
  completed: "No completed tasks yet. Complete some tasks to see them here.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const params = await searchParams;
  const status: TaskStatus = VALID_STATUSES.includes(
    params.status as (typeof VALID_STATUSES)[number]
  )
    ? (params.status as TaskStatus)
    : "inbox";

  const [tasks, counts, prefs] = await Promise.all([
    getTasksByStatus(session.user.id, status, 7, 0),
    getAllTaskCounts(session.user.id),
    db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1),
  ]);

  const currentPrefs = prefs[0] ?? null;
  const totalCount = counts[status as keyof typeof counts] ?? 0;

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between">
        <Heading size="5">Tasks</Heading>
        <SettingsModal
          chronotype={currentPrefs?.chronotype ?? "intermediate"}
          chunkSize={currentPrefs?.chunkSize ?? 7}
          gamificationEnabled={currentPrefs?.gamificationEnabled ?? true}
          bufferPercentage={currentPrefs?.bufferPercentage ?? 25}
          priorityWeights={
            currentPrefs?.priorityWeights ?? {
              deadlineUrgency: 0.4,
              userValue: 0.3,
              dependencyImpact: 0.2,
              projectWeight: 0.1,
            }
          }
        />
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
        or tap the + button to add a task
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
        />
      )}
    </Flex>
  );
}
