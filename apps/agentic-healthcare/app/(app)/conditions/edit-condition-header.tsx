"use client";

import { updateConditionName } from "./update-action";
import { Badge, Card, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useState, useTransition, useRef, useEffect } from "react";
import { CheckIcon, Cross2Icon, Pencil1Icon } from "@radix-ui/react-icons";
import { Heart } from "lucide-react";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";

export function EditConditionHeader({
  conditionId,
  initialName,
  createdAt,
  deleteAction,
}: {
  conditionId: string;
  initialName: string;
  createdAt: string;
  deleteAction: (formData: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleSave() {
    if (!name.trim() || name.trim() === initialName) {
      setName(initialName);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name.trim());
      await updateConditionName(conditionId, formData);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleCancel() {
    setName(initialName);
    setEditing(false);
  }

  return (
    <Card
      style={{
        background:
          "linear-gradient(135deg, var(--indigo-a2), var(--accent-a2))",
      }}
    >
      <Flex justify="between" align="start">
        <Flex align="start" gap="4">
          <Flex
            align="center"
            justify="center"
            style={{
              width: 48,
              height: 48,
              borderRadius: "var(--radius-3)",
              background: "var(--indigo-a3)",
              flexShrink: 0,
            }}
          >
            <Heart size={24} style={{ color: "var(--indigo-11)" }} />
          </Flex>
          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              {editing ? (
                <Flex align="center" gap="2">
                  <TextField.Root
                    ref={inputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave();
                      if (e.key === "Escape") handleCancel();
                    }}
                    disabled={isPending}
                    size="3"
                    style={{ minWidth: 200 }}
                  />
                  <button
                    onClick={handleSave}
                    disabled={isPending || !name.trim()}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--green-11)",
                    }}
                    title="Save"
                  >
                    <CheckIcon width={18} height={18} />
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--gray-11)",
                    }}
                    title="Cancel"
                  >
                    <Cross2Icon width={18} height={18} />
                  </button>
                </Flex>
              ) : (
                <Flex align="center" gap="2">
                  <Heading
                    size="6"
                    onClick={() => setEditing(true)}
                    style={{ cursor: "pointer" }}
                  >
                    {initialName}
                  </Heading>
                  <button
                    onClick={() => setEditing(true)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: "var(--gray-9)",
                    }}
                    title="Edit name"
                  >
                    <Pencil1Icon width={16} height={16} />
                  </button>
                  {saved && (
                    <Flex align="center" gap="1">
                      <CheckIcon style={{ color: "var(--green-11)" }} />
                      <Text size="1" color="green">Saved</Text>
                    </Flex>
                  )}
                  <Badge color="indigo" variant="soft">Active</Badge>
                </Flex>
              )}
            </Flex>
            <Text size="2" color="gray">
              Added {new Date(createdAt).toLocaleDateString()}
            </Text>
          </Flex>
        </Flex>
        <DeleteConfirmButton
          action={deleteAction}
          description="This condition and its notes will be permanently deleted."
          variant="icon-red"
        />
      </Flex>
    </Card>
  );
}
