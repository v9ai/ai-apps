"use client";

import { useState } from "react";
import { Box, Button, Flex, Text, TextField } from "@radix-ui/themes";
import { TaskCard } from "./TaskCard";
import { TaskDetailModal } from "./TaskDetailModal";
import { useCreateTaskMutation } from "@/app/__generated__/hooks";
import type { Task } from "./types";

export function SubtaskList({
  parentTaskId,
  subtasks,
  parentHasParent,
}: {
  parentTaskId: string;
  subtasks: Task[];
  parentHasParent: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const [createTask, { loading: isPending }] = useCreateTaskMutation({
    refetchQueries: ["GetTasks", "GetTaskCounts", "GetTask"],
  });

  // Enforce 2-level max: if parent already has a parent, no subtasks allowed
  if (parentHasParent) return null;

  const openTask = openTaskId
    ? subtasks.find((t) => t.id === openTaskId) ?? null
    : null;

  async function handleAdd() {
    if (!title.trim()) return;
    await createTask({
      variables: { input: { title: title.trim(), parentTaskId } },
    });
    setTitle("");
    setAdding(false);
  }

  return (
    <Box style={{ marginLeft: 24, marginTop: 8 }}>
      {subtasks.map((subtask, i) => (
        <Box key={subtask.id} style={{ marginBottom: 4 }}>
          <TaskCard
            task={subtask}
            index={i + 1}
            onOpen={() => setOpenTaskId(subtask.id)}
          />
        </Box>
      ))}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenTaskId(null);
          }}
        />
      )}

      {adding ? (
        <Flex gap="2" align="center" style={{ marginTop: 4 }}>
          <TextField.Root
            size="1"
            placeholder="Subtask title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setAdding(false);
            }}
            autoFocus
          />
          <Button size="1" onClick={handleAdd} disabled={isPending}>
            Add
          </Button>
          <Button
            size="1"
            variant="ghost"
            color="gray"
            onClick={() => setAdding(false)}
          >
            Cancel
          </Button>
        </Flex>
      ) : (
        <Text
          size="1"
          color="cyan"
          style={{ cursor: "pointer", marginTop: 4, display: "inline-block" }}
          onClick={() => setAdding(true)}
        >
          + Add subtask
        </Text>
      )}
    </Box>
  );
}
