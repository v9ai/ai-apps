"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Checkbox,
  Flex,
  Text,
  Badge,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { PriorityBadge } from "./PriorityBadge";
import { updateTaskAction, deleteTaskAction } from "@/lib/actions/tasks";
import { format } from "date-fns";

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

export function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const titleRef = useRef<HTMLInputElement>(null);

  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(
    task.description ?? ""
  );
  const [editDueDate, setEditDueDate] = useState(
    task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""
  );
  const [editEnergy, setEditEnergy] = useState(task.energyPreference ?? "");
  const [editMinutes, setEditMinutes] = useState(
    task.estimatedMinutes?.toString() ?? ""
  );

  const isCompleted = task.status === "completed";

  function saveField(update: Record<string, unknown>) {
    startTransition(async () => {
      await updateTaskAction({ id: task.id, ...update });
      router.refresh();
    });
  }

  function handleComplete() {
    setCompleting(true);
    startTransition(async () => {
      await updateTaskAction({ id: task.id, status: "completed" });
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTaskAction(task.id);
      router.refresh();
    });
  }

  function handleActivate() {
    startTransition(async () => {
      await updateTaskAction({ id: task.id, status: "active" });
      router.refresh();
    });
  }

  function handleTitleBlur() {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditTitle(task.title);
      return;
    }
    if (trimmed !== task.title) {
      saveField({ title: trimmed });
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      titleRef.current?.blur();
    } else if (e.key === "Escape") {
      setEditTitle(task.title);
      titleRef.current?.blur();
    }
  }

  function handleDescriptionBlur() {
    const trimmed = editDescription.trim();
    const current = task.description ?? "";
    if (trimmed !== current) {
      saveField({ description: trimmed || null });
    }
  }

  function handleDueDateBlur() {
    const current = task.dueDate
      ? format(new Date(task.dueDate), "yyyy-MM-dd")
      : "";
    if (editDueDate !== current) {
      saveField({ dueDate: editDueDate ? new Date(editDueDate) : null });
    }
  }

  function handleEnergyChange(value: string) {
    const newVal = value === "none" ? "" : value;
    setEditEnergy(newVal);
    const current = task.energyPreference ?? "";
    if (newVal !== current) {
      saveField({
        energyPreference:
          (newVal as "high" | "medium" | "low") || null,
      });
    }
  }

  function handleMinutesBlur() {
    const current = task.estimatedMinutes?.toString() ?? "";
    if (editMinutes !== current) {
      saveField({
        estimatedMinutes: editMinutes ? Number(editMinutes) : null,
      });
    }
  }

  return (
    <Card
      className={completing ? "task-completing" : "fade-in"}
      style={{
        opacity: isPending && !completing ? 0.6 : 1,
        transition: "opacity 150ms",
      }}
    >
      <Flex align="start" gap="3">
        {!isCompleted && (
          <Box style={{ paddingTop: 2 }}>
            <Checkbox
              checked={false}
              onCheckedChange={handleComplete}
              disabled={isPending}
            />
          </Box>
        )}

        <Box
          style={{ flex: 1, cursor: "pointer" }}
          onClick={() => setExpanded(!expanded)}
        >
          <Flex align="center" gap="2" wrap="wrap">
            <TextField.Root
              ref={titleRef}
              className="inline-edit"
              size="2"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              onClick={(e) => e.stopPropagation()}
              disabled={isCompleted}
              style={{
                flex: 1,
                minWidth: 120,
                fontWeight: 500,
                textDecoration: isCompleted ? "line-through" : "none",
                color: isCompleted ? "var(--gray-9)" : "var(--gray-12)",
              }}
            />
            <PriorityBadge
              score={task.priorityScore}
              manual={task.priorityManual}
            />
            {task.dueDate && (
              <Badge variant="outline" size="1">
                {format(new Date(task.dueDate), "MMM d")}
              </Badge>
            )}
            {task.energyPreference && (
              <Badge variant="soft" color="blue" size="1">
                {task.energyPreference}
              </Badge>
            )}
            {task.estimatedMinutes && (
              <Badge variant="soft" color="gray" size="1">
                {task.estimatedMinutes}m
              </Badge>
            )}
          </Flex>

          {expanded && (
            <Box
              style={{ marginTop: 8 }}
              onClick={(e) => e.stopPropagation()}
            >
              {isCompleted ? (
                <>
                  {task.description && (
                    <Text
                      size="2"
                      color="gray"
                      as="p"
                      style={{ marginBottom: 8 }}
                    >
                      {task.description}
                    </Text>
                  )}
                </>
              ) : (
                <>
                  <TextArea
                    className="inline-edit"
                    size="1"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Add details..."
                    rows={2}
                    style={{ marginBottom: 8 }}
                  />
                  <Flex gap="2" wrap="wrap" mb="2">
                    <TextField.Root
                      className="inline-edit"
                      size="1"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      onBlur={handleDueDateBlur}
                      style={{ width: 160 }}
                    />
                    <Select.Root
                      size="1"
                      value={editEnergy || "none"}
                      onValueChange={handleEnergyChange}
                    >
                      <Select.Trigger placeholder="Energy" />
                      <Select.Content>
                        <Select.Item value="none">No energy pref</Select.Item>
                        <Select.Item value="high">High energy</Select.Item>
                        <Select.Item value="medium">Medium energy</Select.Item>
                        <Select.Item value="low">Low energy</Select.Item>
                      </Select.Content>
                    </Select.Root>
                    <TextField.Root
                      className="inline-edit"
                      size="1"
                      type="number"
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(e.target.value)}
                      onBlur={handleMinutesBlur}
                      placeholder="Minutes"
                      style={{ width: 90 }}
                    />
                  </Flex>
                </>
              )}
              <Flex gap="2">
                {task.status === "inbox" && (
                  <Text
                    size="1"
                    color="cyan"
                    style={{ cursor: "pointer" }}
                    onClick={handleActivate}
                  >
                    Move to Active
                  </Text>
                )}
                <Text
                  size="1"
                  color="red"
                  style={{ cursor: "pointer" }}
                  onClick={handleDelete}
                >
                  Delete
                </Text>
              </Flex>
            </Box>
          )}
        </Box>
      </Flex>
    </Card>
  );
}
