"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Text,
  Badge,
  TextField,
  Select,
} from "@radix-ui/themes";
import { PriorityBadge } from "./PriorityBadge";
import { Linkify } from "./Linkify";
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

function AutoGrowTextArea({
  value,
  onChange,
  onBlur,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={(e) => {
        onChange(e);
        resize();
      }}
      onBlur={onBlur}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={1}
      style={{
        width: "100%",
        resize: "none",
        overflow: "hidden",
        marginBottom: 8,
        padding: "6px 8px",
        fontSize: "var(--font-size-2)",
        lineHeight: "var(--line-height-2)",
        minHeight: "calc(var(--line-height-2) + 12px)",
        fontFamily: "inherit",
        borderRadius: "var(--radius-1)",
        border: "1px solid transparent",
        background: "transparent",
        color: "var(--gray-12)",
        outline: "none",
        transition: "border-color 150ms, background 150ms",
      }}
    />
  );
}

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditDueDate(
      task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""
    );
    setEditEnergy(task.energyPreference ?? "");
    setEditMinutes(task.estimatedMinutes?.toString() ?? "");
  }, [
    task.id,
    task.title,
    task.description,
    task.dueDate,
    task.energyPreference,
    task.estimatedMinutes,
  ]);

  const isCompleted = task.status === "completed";

  function saveField(update: Record<string, unknown>) {
    startTransition(async () => {
      await updateTaskAction({ id: task.id, ...update });
      router.refresh();
    });
  }

  function handleComplete() {
    startTransition(async () => {
      await updateTaskAction({ id: task.id, status: "completed" });
      router.refresh();
      onOpenChange(false);
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTaskAction(task.id);
      router.refresh();
      onOpenChange(false);
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
    if (trimmed !== task.title) saveField({ title: trimmed });
  }

  function handleDescriptionBlur() {
    const trimmed = editDescription.trim();
    if (trimmed !== (task.description ?? ""))
      saveField({ description: trimmed || null });
  }

  function handleDueDateBlur() {
    const current = task.dueDate
      ? format(new Date(task.dueDate), "yyyy-MM-dd")
      : "";
    if (editDueDate !== current)
      saveField({ dueDate: editDueDate ? new Date(editDueDate) : null });
  }

  function handleEnergyChange(value: string) {
    const newVal = value === "none" ? "" : value;
    setEditEnergy(newVal);
    if (newVal !== (task.energyPreference ?? "")) {
      saveField({
        energyPreference: (newVal as "high" | "medium" | "low") || null,
      });
    }
  }

  function handleMinutesBlur() {
    if (editMinutes !== (task.estimatedMinutes?.toString() ?? "")) {
      saveField({
        estimatedMinutes: editMinutes ? Number(editMinutes) : null,
      });
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="500px">
        <Flex direction="column" gap="3">
          {isCompleted ? (
            <Dialog.Title
              style={{
                textDecoration: "line-through",
                color: "var(--gray-9)",
              }}
            >
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
            {task.completedAt && (
              <Badge variant="soft" color="green" size="1">
                Done {format(new Date(task.completedAt), "MMM d")}
              </Badge>
            )}
          </Flex>

          {isCompleted ? (
            task.description && (
              <Text
                size="2"
                color="gray"
                as="p"
                style={{ whiteSpace: "pre-wrap" }}
              >
                <Linkify text={task.description} />
              </Text>
            )
          ) : (
            <>
              <AutoGrowTextArea
                className="auto-grow-textarea"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Notes"
                ariaLabel={`Description for ${editTitle}`}
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

          <Flex gap="2" mt="2" justify="between">
            <Flex gap="2">
              {!isCompleted && (
                <Button
                  size="1"
                  variant="soft"
                  color="green"
                  onClick={handleComplete}
                  disabled={isPending}
                >
                  Complete
                </Button>
              )}
              {task.status === "inbox" && (
                <Button
                  size="1"
                  variant="soft"
                  color="cyan"
                  onClick={handleActivate}
                  disabled={isPending}
                >
                  Move to Active
                </Button>
              )}
              <Button
                size="1"
                variant="soft"
                color="red"
                onClick={handleDelete}
                disabled={isPending}
              >
                Delete
              </Button>
            </Flex>
            <Dialog.Close>
              <Button size="1" variant="ghost" color="gray">
                Close
              </Button>
            </Dialog.Close>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
