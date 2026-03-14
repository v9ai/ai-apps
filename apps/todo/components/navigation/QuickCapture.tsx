"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Flex, TextArea, TextField } from "@radix-ui/themes";
import { createTaskQuickAction } from "@/lib/actions/tasks";

export function QuickCapture() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    await createTaskQuickAction(title.trim(), description.trim() || undefined);
    setTitle("");
    setDescription("");
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
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
      >
        +
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
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
              {title.trim() && (
                <TextArea
                  placeholder="Add notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  size="2"
                  rows={2}
                  className="auto-grow-textarea"
                />
              )}
              <Flex justify="end" gap="2">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <Button type="submit" disabled={loading || !title.trim()}>
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
