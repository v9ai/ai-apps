"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Button, Flex } from "@radix-ui/themes";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { TaskCard } from "./TaskCard";
import { TaskDetailModal } from "./TaskDetailModal";
import { loadMoreTasks, reorderTasksAction } from "@/lib/actions/tasks";

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

export function TaskList({
  initialTasks,
  totalCount,
  status,
  chunkSize = 7,
}: {
  initialTasks: Task[];
  totalCount: number;
  status: "inbox" | "active" | "completed" | "archived";
  chunkSize?: number;
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isPending, startTransition] = useTransition();
  const knownIds = useRef(new Set(initialTasks.map((t) => t.id)));
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const hasMore = tasks.length < totalCount;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(tasks, oldIndex, newIndex);
    setTasks(reordered);

    const lo = Math.min(oldIndex, newIndex);
    const hi = Math.max(oldIndex, newIndex);
    const updates = reordered
      .slice(lo, hi + 1)
      .map((t, i) => ({ id: t.id, position: lo + i + 1 }));
    startTransition(async () => {
      await reorderTasksAction(updates);
    });
  }

  useEffect(() => {
    const incoming = new Set(initialTasks.map((t) => t.id));
    let firstNewId: string | null = null;
    for (const t of initialTasks) {
      if (!knownIds.current.has(t.id)) {
        if (firstNewId === null) firstNewId = t.id;
      }
    }
    knownIds.current = incoming;
    setTasks(initialTasks);
    if (firstNewId !== null) setOpenTaskId(firstNewId);
  }, [initialTasks]);

  // Keyboard: 1-9 opens modal for that task
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.target as HTMLElement).isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9 && num <= tasks.length) {
        e.preventDefault();
        setOpenTaskId(tasks[num - 1].id);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [tasks]);

  function handleLoadMore() {
    startTransition(async () => {
      const moreTasks = await loadMoreTasks(status, tasks.length, chunkSize);
      const loaded = moreTasks as Task[];
      for (const t of loaded) knownIds.current.add(t.id);
      setTasks((prev) => [...prev, ...loaded]);
    });
  }

  const openTask = openTaskId
    ? tasks.find((t) => t.id === openTaskId) ?? null
    : null;

  return (
    <Flex direction="column" gap="2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i + 1}
              onOpen={() => setOpenTaskId(task.id)}
            />
          ))}
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {activeId ? (() => {
            const idx = tasks.findIndex((t) => t.id === activeId);
            const task = tasks[idx];
            return task ? (
              <TaskCard task={task} index={idx + 1} onOpen={() => {}} isOverlay />
            ) : null;
          })() : null}
        </DragOverlay>
      </DndContext>
      {hasMore && (
        <Button
          variant="ghost"
          color="gray"
          onClick={handleLoadMore}
          disabled={isPending}
          style={{ alignSelf: "center", marginTop: 8 }}
        >
          {isPending
            ? "Loading..."
            : `Load more (${totalCount - tasks.length} remaining)`}
        </Button>
      )}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          open={true}
          onOpenChange={(open) => {
            if (!open) setOpenTaskId(null);
          }}
        />
      )}
    </Flex>
  );
}
