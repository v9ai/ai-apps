"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Separator,
  Text,
  Badge,
  TextField,
  TextArea,
  Select,
} from "@radix-ui/themes";
import { format, parseISO, isValid } from "date-fns";

function safeParse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}
function toDateInput(value: string | null | undefined): string {
  const d = safeParse(value);
  return d ? format(d, "yyyy-MM-dd") : "";
}
function formatBadge(value: string | null | undefined, fmt: string): string | null {
  const d = safeParse(value);
  return d ? format(d, fmt) : null;
}
import { PriorityBadge } from "./PriorityBadge";
import { Linkify } from "./Linkify";
import { SubtaskList } from "./SubtaskList";
import {
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useGetTaskQuery,
  TaskStatus,
  EnergyLevel,
} from "@/app/__generated__/hooks";
import type { Task } from "./types";

const ENERGY_TO_ENUM: Record<string, EnergyLevel> = {
  high: EnergyLevel.High,
  medium: EnergyLevel.Medium,
  low: EnergyLevel.Low,
};
const STATUS_TO_ENUM: Record<string, TaskStatus> = {
  inbox: TaskStatus.Inbox,
  active: TaskStatus.Active,
  completed: TaskStatus.Completed,
  archived: TaskStatus.Archived,
};

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const [updateTask, { loading: updating }] = useUpdateTaskMutation({
    refetchQueries: ["GetTasks", "GetTaskCounts", "GetTask", "GetUserStreak"],
  });
  const [deleteTask, { loading: deleting }] = useDeleteTaskMutation({
    refetchQueries: ["GetTasks", "GetTaskCounts"],
  });

  // Load fresh task with subtasks/blockers (server-side joined)
  const { data: detailData } = useGetTaskQuery({
    variables: { id: task.id },
    skip: !open,
    fetchPolicy: "cache-and-network",
  });
  const subtasks = (detailData?.task?.subtasks ?? []) as Task[];

  const isPending = updating || deleting;

  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? "");
  const [editDueDate, setEditDueDate] = useState(toDateInput(task.dueDate));
  const [editEnergy, setEditEnergy] = useState(task.energyPreference ?? "");
  const [editMinutes, setEditMinutes] = useState(task.estimatedMinutes?.toString() ?? "");
  const [editPriority, setEditPriority] = useState(
    task.priorityManual?.toString() ?? "none",
  );

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditDueDate(toDateInput(task.dueDate));
    setEditEnergy(task.energyPreference ?? "");
    setEditMinutes(task.estimatedMinutes?.toString() ?? "");
    setEditPriority(task.priorityManual?.toString() ?? "none");
  }, [
    task.id,
    task.title,
    task.description,
    task.dueDate,
    task.energyPreference,
    task.estimatedMinutes,
    task.priorityManual,
  ]);

  const isCompleted = task.status === "completed";

  function saveField(input: Record<string, unknown>) {
    updateTask({ variables: { id: task.id, input } });
  }

  async function handleComplete() {
    await updateTask({ variables: { id: task.id, input: { status: TaskStatus.Completed } } });
    onOpenChange(false);
  }
  async function handleDelete() {
    await deleteTask({ variables: { id: task.id } });
    onOpenChange(false);
  }
  function handleActivate() {
    updateTask({ variables: { id: task.id, input: { status: TaskStatus.Active } } });
  }
  async function handleMoveToInbox() {
    await updateTask({ variables: { id: task.id, input: { status: TaskStatus.Inbox } } });
    onOpenChange(false);
  }

  function handleTitleBlur() {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditTitle(task.title);
      return;
    }
    if (trimmed !== task.title) saveField({ title: trimmed });
  }
  function handleDescriptionBlur() {
    const trimmed = editDescription.trim();
    if (trimmed !== (task.description ?? ""))
      saveField({ description: trimmed || null });
  }
  function handleDueDateBlur() {
    const current = toDateInput(task.dueDate);
    if (editDueDate !== current)
      saveField({ dueDate: editDueDate ? new Date(editDueDate).toISOString() : null });
  }
  function handleEnergyChange(value: string) {
    const newVal = value === "none" ? "" : value;
    setEditEnergy(newVal);
    if (newVal !== (task.energyPreference ?? ""))
      saveField({ energyPreference: newVal ? ENERGY_TO_ENUM[newVal] : null });
  }
  function handlePriorityChange(value: string) {
    setEditPriority(value);
    const newVal = value === "none" ? null : Number(value);
    if (newVal !== task.priorityManual) saveField({ priorityManual: newVal });
  }
  function handleMinutesBlur() {
    if (editMinutes !== (task.estimatedMinutes?.toString() ?? ""))
      saveField({ estimatedMinutes: editMinutes ? Number(editMinutes) : null });
  }

  // ensure unused import warning is satisfied
  void STATUS_TO_ENUM;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="520px"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          descriptionRef.current?.focus();
        }}
      >
        <Flex direction="column" gap="3">
          {isCompleted ? (
            <Dialog.Title style={{ textDecoration: "line-through", color: "var(--gray-9)" }}>
              {task.title}
            </Dialog.Title>
          ) : (
            <>
              <Dialog.Title className="sr-only">{task.title}</Dialog.Title>
              <TextField.Root
                size="3"
                className="inline-edit"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                style={{ fontWeight: 600 }}
              />
            </>
          )}

          <Flex align="center" gap="2" wrap="wrap">
            <PriorityBadge score={task.priorityScore} manual={task.priorityManual} />
            {(() => {
              const d = formatBadge(task.dueDate, "MMM d");
              return d ? (
                <Badge variant="outline" size="1">
                  {d}
                </Badge>
              ) : null;
            })()}
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
            {(() => {
              const d = formatBadge(task.completedAt, "MMM d");
              return d ? (
                <Badge variant="soft" color="green" size="1">
                  Done {d}
                </Badge>
              ) : null;
            })()}
          </Flex>

          {isCompleted ? (
            task.description && (
              <Text size="2" color="gray" as="p" style={{ whiteSpace: "pre-wrap" }}>
                <Linkify text={task.description} />
              </Text>
            )
          ) : (
            <>
              <TextArea
                ref={descriptionRef}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Notes"
                aria-label={`Description for ${editTitle}`}
                rows={3}
              />
              <Flex gap="2" wrap="wrap">
                <TextField.Root
                  className="inline-edit"
                  size="1"
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  onBlur={handleDueDateBlur}
                  style={{ width: 160 }}
                />
                <Select.Root size="1" value={editPriority} onValueChange={handlePriorityChange}>
                  <Select.Trigger placeholder="Priority" />
                  <Select.Content>
                    <Select.Item value="none">No priority</Select.Item>
                    <Select.Item value="1">P1 — Critical</Select.Item>
                    <Select.Item value="2">P2 — High</Select.Item>
                    <Select.Item value="3">P3 — Medium</Select.Item>
                    <Select.Item value="4">P4 — Low</Select.Item>
                    <Select.Item value="5">P5 — Minimal</Select.Item>
                  </Select.Content>
                </Select.Root>
                <Select.Root size="1" value={editEnergy || "none"} onValueChange={handleEnergyChange}>
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

          <Flex gap="2" mt="1" justify="between">
            <Flex gap="2" wrap="wrap">
              {!isCompleted && (
                <Button size="1" variant="soft" color="green" onClick={handleComplete} disabled={isPending}>
                  Complete
                </Button>
              )}
              {task.status === "inbox" && (
                <Button size="1" variant="soft" color="cyan" onClick={handleActivate} disabled={isPending}>
                  Move to Active
                </Button>
              )}
              {task.status === "active" && (
                <Button size="1" variant="soft" color="gray" onClick={handleMoveToInbox} disabled={isPending}>
                  Move to Inbox
                </Button>
              )}
              <Button size="1" variant="soft" color="red" onClick={handleDelete} disabled={isPending}>
                Delete
              </Button>
            </Flex>
            <Dialog.Close>
              <Button size="1" variant="ghost" color="gray">
                Close
              </Button>
            </Dialog.Close>
          </Flex>

          {!task.parentTaskId && (
            <>
              <Separator size="4" />
              <Box>
                <Text size="1" weight="medium" color="gray" style={{ marginBottom: 6, display: "block" }}>
                  Subtasks
                </Text>
                <SubtaskList parentTaskId={task.id} subtasks={subtasks} parentHasParent={false} />
              </Box>
            </>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
