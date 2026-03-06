"use client";

import * as React from "react";
import { useState } from "react";
import {
  useGetTasksQuery,
  useCreateTaskMutation,
  useCompleteTaskMutation,
  useDeleteTaskMutation,
  useUpdateTaskMutation,
} from "@/__generated__/hooks";
import type { GetTasksQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Container,
  Dialog,
  Flex,
  Heading,
  Select,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

type Task = NonNullable<GetTasksQuery["tasks"]["tasks"]>[number];

const PRIORITY_COLORS: Record<string, "red" | "orange" | "gray"> = {
  high: "red",
  medium: "orange",
  low: "gray",
};

export default function AdminTasksPage() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const [statusFilter, setStatusFilter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data, loading, refetch } = useGetTasksQuery({
    variables: {
      status: statusFilter || undefined,
      limit: 200,
    },
    skip: !isAdmin,
    fetchPolicy: "cache-and-network",
  });

  const [createTask, { loading: creating }] = useCreateTaskMutation();
  const [completeTask] = useCompleteTaskMutation();
  const [deleteTask] = useDeleteTaskMutation();
  const [updateTask] = useUpdateTaskMutation();

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const allTasks = data?.tasks?.tasks ?? [];
  const totalCount = data?.tasks?.totalCount ?? 0;

  const highTasks = allTasks.filter((t) => t.priority === "high" && t.status !== "done");
  const mediumTasks = allTasks.filter((t) => t.priority === "medium" && t.status !== "done");
  const lowTasks = allTasks.filter((t) => t.priority === "low" && t.status !== "done");
  const doneTasks = allTasks.filter((t) => t.status === "done");

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createTask({
      variables: {
        input: {
          title: fd.get("title") as string,
          description: fd.get("description") as string || undefined,
          priority: fd.get("priority") as string || "medium",
          dueDate: fd.get("dueDate") as string || undefined,
        },
      },
    });
    setCreateOpen(false);
    refetch();
  }

  async function handleToggle(task: Task) {
    if (task.status === "done") {
      await updateTask({ variables: { id: task.id, input: { status: "todo" } } });
    } else {
      await completeTask({ variables: { id: task.id } });
    }
    refetch();
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this task?")) return;
    await deleteTask({ variables: { id } });
    refetch();
  }

  function isOverdue(task: Task) {
    if (!task.dueDate || task.status === "done") return false;
    return new Date(task.dueDate) < new Date();
  }

  function TaskSection({ title, tasks, color }: { title: string; tasks: Task[]; color: "red" | "orange" | "gray" }) {
    if (tasks.length === 0) return null;
    return (
      <Box mb="4">
        <Flex align="center" gap="2" mb="2">
          <Badge color={color} variant="soft" size="2">{title}</Badge>
          <Text size="1" color="gray">{tasks.length}</Text>
        </Flex>
        <Flex direction="column" gap="2">
          {tasks.map((task) => (
            <Card key={task.id}>
              <Flex align="center" gap="3" p="2">
                <Checkbox
                  checked={task.status === "done"}
                  onCheckedChange={() => handleToggle(task)}
                />
                <Box style={{ flex: 1 }}>
                  <Flex align="center" gap="2" wrap="wrap">
                    <Text
                      size="2"
                      weight="medium"
                      style={{
                        textDecoration: task.status === "done" ? "line-through" : undefined,
                        opacity: task.status === "done" ? 0.6 : 1,
                      }}
                    >
                      {task.title}
                    </Text>
                    {task.status === "in_progress" && (
                      <Badge color="blue" variant="soft" size="1">in progress</Badge>
                    )}
                    {isOverdue(task) && (
                      <Badge color="red" variant="solid" size="1">overdue</Badge>
                    )}
                  </Flex>
                  {task.description && (
                    <Text size="1" color="gray" as="p" mt="1">{task.description}</Text>
                  )}
                  {task.dueDate && (
                    <Text size="1" color={isOverdue(task) ? "red" : "gray"} mt="1" as="p">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </Text>
                  )}
                </Box>
                <Button size="1" variant="ghost" color="red" onClick={() => handleDelete(task.id)}>
                  <TrashIcon />
                </Button>
              </Flex>
            </Card>
          ))}
        </Flex>
      </Box>
    );
  }

  return (
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="6">
        <Flex align="center" gap="3">
          <Heading size="7">Tasks</Heading>
          <Text size="2" color="gray">{totalCount} total</Text>
        </Flex>
        <Flex align="center" gap="3">
          <Select.Root value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger placeholder="All statuses" />
            <Select.Content>
              <Select.Item value="">All</Select.Item>
              <Select.Item value="todo">To Do</Select.Item>
              <Select.Item value="in_progress">In Progress</Select.Item>
              <Select.Item value="done">Done</Select.Item>
            </Select.Content>
          </Select.Root>
          <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
            <Dialog.Trigger>
              <Button size="2"><PlusIcon /> New Task</Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="450px">
              <Dialog.Title>New Task</Dialog.Title>
              <form onSubmit={handleCreate}>
                <Flex direction="column" gap="3" mt="3">
                  <TextField.Root name="title" placeholder="Task title *" required />
                  <TextArea name="description" placeholder="Description (optional)" />
                  <Flex gap="3">
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="label">Priority</Text>
                      <select name="priority" defaultValue="medium" style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--gray-6)" }}>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </Box>
                    <Box style={{ flex: 1 }}>
                      <Text size="1" color="gray" mb="1" as="label">Due date</Text>
                      <input name="dueDate" type="date" style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--gray-6)" }} />
                    </Box>
                  </Flex>
                  <Flex gap="3" justify="end" mt="2">
                    <Dialog.Close>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </Dialog.Close>
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating…" : "Create"}
                    </Button>
                  </Flex>
                </Flex>
              </form>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </Flex>

      {loading ? (
        <Flex justify="center" py="6"><Spinner size="3" /></Flex>
      ) : allTasks.length === 0 ? (
        <Callout.Root color="gray" variant="soft">
          <Callout.Text>No tasks yet. Create one to get started.</Callout.Text>
        </Callout.Root>
      ) : (
        <>
          <TaskSection title="High Priority" tasks={highTasks} color="red" />
          <TaskSection title="Medium Priority" tasks={mediumTasks} color="orange" />
          <TaskSection title="Low Priority" tasks={lowTasks} color="gray" />
          {doneTasks.length > 0 && (
            <Box mt="6">
              <Text size="2" color="gray" weight="medium" mb="2" as="p">
                Completed ({doneTasks.length})
              </Text>
              <Flex direction="column" gap="1">
                {doneTasks.slice(0, 10).map((task) => (
                  <Card key={task.id} style={{ opacity: 0.6 }}>
                    <Flex align="center" gap="3" p="2">
                      <Checkbox checked onCheckedChange={() => handleToggle(task)} />
                      <Text size="2" style={{ textDecoration: "line-through", flex: 1 }}>{task.title}</Text>
                      <Button size="1" variant="ghost" color="red" onClick={() => handleDelete(task.id)}>
                        <TrashIcon />
                      </Button>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
