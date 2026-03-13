import { headers } from "next/headers";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { auth } from "@/lib/auth";
import { getTasksByStatus, getTaskCountByStatus } from "@/lib/queries/tasks";
import { TaskList } from "@/components/tasks/TaskList";

export default async function ActivePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [tasks, totalCount] = await Promise.all([
    getTasksByStatus(session.user.id, "active", 7, 0),
    getTaskCountByStatus(session.user.id, "active"),
  ]);

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between">
        <Heading size="5">Active</Heading>
        <Text size="2" color="gray">
          {totalCount} task{totalCount !== 1 ? "s" : ""}
        </Text>
      </Flex>
      {totalCount === 0 ? (
        <Text size="3" color="gray" align="center" style={{ marginTop: 40 }}>
          No active tasks. Move tasks from your inbox to get started.
        </Text>
      ) : (
        <TaskList
          initialTasks={tasks}
          totalCount={totalCount}
          status="active"
        />
      )}
    </Flex>
  );
}
