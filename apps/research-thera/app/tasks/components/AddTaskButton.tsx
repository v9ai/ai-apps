"use client";

import { useState } from "react";
import {
  Dialog,
  Button,
  Flex,
  Text,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import {
  useCreateTaskMutation,
  TaskStatus,
} from "@/app/__generated__/hooks";
import { authClient } from "@/app/lib/auth/client";

const STATUS_TO_ENUM: Record<"inbox" | "active" | "completed", TaskStatus> = {
  inbox: TaskStatus.Inbox,
  active: TaskStatus.Active,
  completed: TaskStatus.Completed,
};

export function AddTaskButton({
  defaultStatus = "inbox",
  size = "2",
}: {
  defaultStatus?: "inbox" | "active" | "completed";
  size?: "1" | "2" | "3";
} = {}) {
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"inbox" | "active" | "completed">(defaultStatus);
  const [priorityManual, setPriorityManual] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setStatus(defaultStatus);
    setPriorityManual("");
    setDueDate("");
    setError(null);
  };

  const [createTask, { loading }] = useCreateTaskMutation({
    onCompleted: () => {
      setOpen(false);
      resetForm();
    },
    onError: (err) => {
      setError(err.message);
    },
    refetchQueries: ["GetTasks", "GetTaskCounts"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user?.id) {
      setError("You must be logged in to create a task");
      return;
    }

    if (!title.trim()) {
      setError("Please enter a task title");
      return;
    }

    try {
      await createTask({
        variables: {
          input: {
            title: title.trim(),
            description: description.trim() || undefined,
            status: STATUS_TO_ENUM[status],
            priorityManual: priorityManual ? Number(priorityManual) : undefined,
            dueDate: dueDate || undefined,
          },
        },
      });
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  };

  function handleOpenChange(next: boolean) {
    if (next) {
      resetForm();
    }
    setOpen(next);
  }

  if (!user) {
    return null;
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button size={size}>
          <PlusIcon width="16" height="16" />
          Add Task
        </Button>
      </Dialog.Trigger>

      <Dialog.Content style={{ maxWidth: 500 }}>
        <Dialog.Title>Create New Task</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Add a new task to your list.
        </Dialog.Description>

        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Title *
              </Text>
              <TextField.Root
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </label>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Description
              </Text>
              <TextArea
                placeholder="Add more detail (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={loading}
              />
            </label>

            <Flex gap="3">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text as="div" size="2" weight="medium">
                  Status
                </Text>
                <Select.Root
                  value={status}
                  onValueChange={(v) => setStatus(v as typeof status)}
                  disabled={loading}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value="inbox">Inbox</Select.Item>
                    <Select.Item value="active">Active</Select.Item>
                    <Select.Item value="completed">Completed</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>

              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text as="div" size="2" weight="medium">
                  Priority
                </Text>
                <Select.Root
                  value={priorityManual || "none"}
                  onValueChange={(v) => setPriorityManual(v === "none" ? "" : v)}
                  disabled={loading}
                >
                  <Select.Trigger style={{ width: "100%" }} />
                  <Select.Content>
                    <Select.Item value="none">—</Select.Item>
                    <Select.Item value="1">1 (highest)</Select.Item>
                    <Select.Item value="2">2</Select.Item>
                    <Select.Item value="3">3</Select.Item>
                    <Select.Item value="4">4</Select.Item>
                    <Select.Item value="5">5 (lowest)</Select.Item>
                  </Select.Content>
                </Select.Root>
              </Flex>
            </Flex>

            <label>
              <Text as="div" size="2" mb="1" weight="medium">
                Due date
              </Text>
              <TextField.Root
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={loading}
              />
            </label>

            {error && (
              <Text color="red" size="2">
                {error}
              </Text>
            )}

            <Flex gap="3" justify="end" mt="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" disabled={loading}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </Button>
            </Flex>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
