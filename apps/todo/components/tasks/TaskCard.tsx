"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Box, Card, Checkbox, Flex, Text, Badge } from "@radix-ui/themes";
import { useSortable } from "@dnd-kit/sortable";
import { useDndMonitor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PriorityBadge } from "./PriorityBadge";
import { Linkify } from "./Linkify";
import { updateTaskAction } from "@/lib/actions/tasks";
import { format } from "date-fns";
import type { Task } from "./types";

const PRIORITY_COLORS = {
  1: "red",
  2: "orange",
  3: "amber",
  4: "blue",
  5: "gray",
} as const;

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3" cy="2.5" r="1.5" />
      <circle cx="7" cy="2.5" r="1.5" />
      <circle cx="3" cy="7" r="1.5" />
      <circle cx="7" cy="7" r="1.5" />
      <circle cx="3" cy="11.5" r="1.5" />
      <circle cx="7" cy="11.5" r="1.5" />
    </svg>
  );
}

export function TaskCard({
  task,
  index,
  onOpen,
  isOverlay,
}: {
  task: Task;
  index: number;
  onOpen: () => void;
  isOverlay?: boolean;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: isOverlay });

  const wasDragging = useRef(false);
  useEffect(() => {
    if (isDragging) wasDragging.current = true;
  }, [isDragging]);
  useDndMonitor({
    onDragCancel() { wasDragging.current = false; },
  });

  const isCompleted = task.status === "completed";

  function handleComplete() {
    setCompleting(true);
    startTransition(async () => {
      await updateTaskAction({ id: task.id, status: "completed" });
      router.refresh();
    });
  }

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition ?? undefined,
        position: "relative",
        zIndex: isDragging ? 10 : undefined,
      }}
    >
    <Card
      className={`task-card ${isOverlay ? "drag-overlay" : ""} ${completing ? "task-completing" : isDragging ? "" : "fade-in"}`}
      style={{
        opacity: isDragging ? 0.3 : isPending && !completing ? 0.6 : 1,
        transition: "opacity 150ms",
        cursor: isOverlay ? "grabbing" : "pointer",
        ...(index <= 2 && !isOverlay ? {
          "--card-background-color": "var(--red-a2)",
          outline: "1px solid var(--red-a6)",
          outlineOffset: "-1px",
        } : {}) as React.CSSProperties,
      }}
      onClick={() => {
        if (wasDragging.current) { wasDragging.current = false; return; }
        onOpen();
      }}
    >
      <Flex align="center" gap="3">
        <div
          ref={isOverlay ? undefined : setActivatorNodeRef}
          {...(isOverlay ? {} : { ...attributes, ...listeners })}
          className="drag-handle"
          style={{
            cursor: isDragging || isOverlay ? "grabbing" : "grab",
            color: "var(--gray-6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "8px 4px",
            margin: "-8px -4px",
            flexShrink: 0,
            touchAction: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <GripIcon />
        </div>

        <Text
          size="1"
          weight="bold"
          style={{
            minWidth: 20,
            textAlign: "center",
            fontVariantNumeric: "tabular-nums",
            color: index <= 9 ? "var(--cyan-9)" : "var(--gray-8)",
          }}
        >
          {index}
        </Text>

        {!isCompleted && (
          <Box
            style={{ paddingTop: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={false}
              onCheckedChange={handleComplete}
              disabled={isPending}
            />
          </Box>
        )}

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text
              size="2"
              weight="medium"
              style={{
                textDecoration: isCompleted ? "line-through" : "none",
                color: isCompleted ? "var(--gray-9)" : "var(--gray-12)",
              }}
            >
              {task.title}
            </Text>
            {task.priorityManual && (
              <Badge
                size="1"
                variant="solid"
                color={PRIORITY_COLORS[task.priorityManual as keyof typeof PRIORITY_COLORS] ?? "gray"}
              >
                P{task.priorityManual}
              </Badge>
            )}
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

          {task.description && (
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
        </Box>
      </Flex>
    </Card>
    </div>
  );
}
