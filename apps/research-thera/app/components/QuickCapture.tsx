"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button, Dialog, Flex, Select, TextArea, TextField } from "@radix-ui/themes";
import {
  useCreateTaskMutation,
  EnergyLevel,
} from "@/app/__generated__/hooks";

const ENERGY_TO_ENUM: Record<string, EnergyLevel> = {
  high: EnergyLevel.High,
  medium: EnergyLevel.Medium,
  low: EnergyLevel.Low,
};

export function QuickCapture() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("none");
  const [energy, setEnergy] = useState("none");
  const [minutes, setMinutes] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [createTask, { loading }] = useCreateTaskMutation({
    refetchQueries: ["GetTasks", "GetTaskCounts"],
  });

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "k" || e.key === "K") {
          // avoid hijacking native browser shortcuts when typing in a field
          const tag = (e.target as HTMLElement | null)?.tagName ?? "";
          if (tag === "INPUT" || tag === "TEXTAREA") return;
          e.preventDefault();
          setOpen(true);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function resetForm() {
    setTitle("");
    setDescription("");
    setDueDate("");
    setPriority("none");
    setEnergy("none");
    setMinutes("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    await createTask({
      variables: {
        input: {
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          priorityManual: priority !== "none" ? Number(priority) : null,
          energyPreference: energy !== "none" ? ENERGY_TO_ENUM[energy] : null,
          estimatedMinutes: minutes ? Number(minutes) : null,
        },
      },
    });
    resetForm();
    setOpen(false);
    if (!pathname.startsWith("/tasks")) router.push("/tasks");
  }

  const hasTitle = title.trim().length > 0;
  const onTasksRoute = pathname.startsWith("/tasks");

  return (
    <>
      {onTasksRoute && (
        <Button
          onClick={() => setOpen(true)}
          size="2"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 10,
            borderRadius: "50%",
            width: 48,
            height: 48,
            fontSize: 24,
            cursor: "pointer",
          }}
          aria-label="Quick capture"
        >
          +
        </Button>
      )}

      <Dialog.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <Dialog.Content
          size="3"
          style={{ maxWidth: 500 }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title size="4">Quick Capture</Dialog.Title>
          <Dialog.Description size="2" color="gray">
            Add a task to your inbox
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="3" style={{ marginTop: 12 }}>
              <TextField.Root
                ref={inputRef}
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                size="3"
              />
              {hasTitle && (
                <>
                  <TextArea
                    placeholder="Add notes..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    size="2"
                    rows={2}
                  />
                  <Flex gap="2" wrap="wrap">
                    <TextField.Root
                      className="inline-edit"
                      size="1"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{ width: 160 }}
                    />
                    <Select.Root size="1" value={priority} onValueChange={setPriority}>
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
                    <Select.Root size="1" value={energy} onValueChange={setEnergy}>
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
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      placeholder="Minutes"
                      style={{ width: 90 }}
                    />
                  </Flex>
                </>
              )}
              <Flex justify="end" gap="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={loading || !hasTitle}>
                  {loading ? "Adding..." : "Add Task"}
                </Button>
              </Flex>
            </Flex>
          </form>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
