"use client";

import { useState, useTransition } from "react";
import { Box, Button, Flex, Text, TextField } from "@radix-ui/themes";
import { TaskCard } from "./TaskCard";
import { createTaskQuickAction } from "@/lib/actions/tasks";

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
  const [isPending, startTransition] = useTransition();

  // Enforce 2-level max: if parent already has a parent, no subtasks allowed
  if (parentHasParent) return null;

  function handleAdd() {
    if (!title.trim()) return;
    startTransition(async () => {
      // Create via FormData to include parentTaskId
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("parentTaskId", parentTaskId);
      const { createTaskAction } = await import("@/lib/actions/tasks");
      await createTaskAction(fd);
      setTitle("");
      setAdding(false);
    });
  }

  return (
    <Box style={{ marginLeft: 24, marginTop: 8 }}>
      {subtasks.map((subtask) => (
        <Box key={subtask.id} style={{ marginBottom: 4 }}>
          <TaskCard task={subtask} />
        </Box>
      ))}

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
