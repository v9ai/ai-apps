import { headers } from "next/headers";
import { Flex, Heading, Text } from "@radix-ui/themes";
import { auth } from "@/lib/auth";
import { getTasksByStatus, getTaskCountByStatus } from "@/lib/queries/tasks";
import { TaskList } from "@/components/tasks/TaskList";

export default async function InboxPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const [tasks, totalCount] = await Promise.all([
    getTasksByStatus(session.user.id, "inbox", 7, 0),
    getTaskCountByStatus(session.user.id, "inbox"),
  ]);

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" justify="between">
        <Heading size="5">Inbox</Heading>
        <Text size="2" color="gray">
          {totalCount} task{totalCount !== 1 ? "s" : ""}
        </Text>
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
      {totalCount === 0 ? (
        <Text size="3" color="gray" align="center" style={{ marginTop: 40 }}>
          Your inbox is empty. Capture a task to get started.
        </Text>
      ) : (
        <TaskList
          initialTasks={tasks}
          totalCount={totalCount}
          status="inbox"
        />
      )}
    </Flex>
  );
}
