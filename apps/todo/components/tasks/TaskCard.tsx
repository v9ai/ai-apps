"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Card,
  Checkbox,
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
  onFocus,
  onKeyDown,
  placeholder,
  className,
  ariaLabel,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
  onFocus?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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
      onFocus={onFocus}
      onKeyDown={onKeyDown}
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

export function TaskCard({ task, defaultExpanded = false }: { task: Task; defaultExpanded?: boolean }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [completing, setCompleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const titleRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const focusedField = useRef<string | null>(null);

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

  // Sync local state when task prop updates (after router.refresh()), but
  // don't overwrite fields the user is currently editing.
  useEffect(() => {
    if (focusedField.current !== "title") setEditTitle(task.title);
    if (focusedField.current !== "description") setEditDescription(task.description ?? "");
    if (focusedField.current !== "dueDate")
      setEditDueDate(task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "");
    if (focusedField.current !== "energy") setEditEnergy(task.energyPreference ?? "");
    if (focusedField.current !== "minutes") setEditMinutes(task.estimatedMinutes?.toString() ?? "");
  }, [task.title, task.description, task.dueDate, task.energyPreference, task.estimatedMinutes]);

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
    focusedField.current = null;
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
    focusedField.current = null;
    const trimmed = editDescription.trim();
    const current = task.description ?? "";
    if (trimmed !== current) {
      saveField({ description: trimmed || null });
    }
  }

  function handleDescriptionKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      setEditDescription(task.description ?? ""); // revert
      e.currentTarget.blur(); // handleDescriptionBlur will no-op (value matches)
    }
  }

  function handleDueDateBlur() {
    focusedField.current = null;
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
    focusedField.current = null;
    const current = task.estimatedMinutes?.toString() ?? "";
    if (editMinutes !== current) {
      saveField({
        estimatedMinutes: editMinutes ? Number(editMinutes) : null,
      });
    }
  }

  // Escape key collapses the card when focus is on the card but not in an input
  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (cardRef.current?.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  const metadataBadges = (
    <>
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
    </>
  );

  return (
    <Card
      ref={cardRef}
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
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} task: ${editTitle}`}
          style={{ flex: 1, cursor: "pointer" }}
          onClick={() => setExpanded(!expanded)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded(!expanded);
            }
          }}
        >
          <Flex align="center" gap="2" wrap="wrap">
            <TextField.Root
              ref={titleRef}
              className="inline-edit"
              size="2"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onFocus={() => { focusedField.current = "title"; }}
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
            {metadataBadges}
          </Flex>

          {!expanded && !isCompleted && (
            <Text
              size="1"
              as="p"
              style={{
                marginTop: 4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                whiteSpace: "pre-wrap",
                color: task.description ? "var(--gray-11)" : "var(--gray-7)",
                fontStyle: task.description ? "normal" : "italic",
              }}
            >
              {task.description ? <Linkify text={task.description} /> : "Notes"}
            </Text>
          )}

          {!expanded && isCompleted && task.description && (
            <Text
              size="1"
              color="gray"
              as="p"
              style={{
                marginTop: 4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                whiteSpace: "pre-wrap",
              }}
            >
              <Linkify text={task.description} />
            </Text>
          )}

          {expanded && (
            <Box
              className="task-details-enter"
              style={{ marginTop: 8 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {isCompleted ? (
                <>
                  {task.description && (
                    <Text
                      size="2"
                      color="gray"
                      as="p"
                      style={{ marginBottom: 8, whiteSpace: "pre-wrap" }}
                    >
                      <Linkify text={task.description} />
                    </Text>
                  )}
                  {(task.dueDate || task.energyPreference || task.estimatedMinutes || task.completedAt) && (
                    <Flex gap="2" wrap="wrap" mb="2" align="center">
                      {metadataBadges}
                      {task.completedAt && (
                        <Badge variant="soft" color="green" size="1">
                          Done {format(new Date(task.completedAt), "MMM d")}
                        </Badge>
                      )}
                    </Flex>
                  )}
                </>
              ) : (
                <>
                  <AutoGrowTextArea
                    className="auto-grow-textarea"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onFocus={() => { focusedField.current = "description"; }}
                    onBlur={handleDescriptionBlur}
                    onKeyDown={handleDescriptionKeyDown}
                    placeholder="Notes"
                    ariaLabel={`Description for ${editTitle}`}
                  />
                  <Flex gap="2" wrap="wrap" mb="2">
                    <TextField.Root
                      className="inline-edit"
                      size="1"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      onFocus={() => { focusedField.current = "dueDate"; }}
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
                      onFocus={() => { focusedField.current = "minutes"; }}
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
