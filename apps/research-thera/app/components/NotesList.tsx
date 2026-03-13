"use client";

import { useState } from "react";
import {
  Card,
  Flex,
  Heading,
  Text,
  Button,
  TextArea,
  Badge,
  Spinner,
  Checkbox,
  AlertDialog,
  IconButton,
} from "@radix-ui/themes";
import { PlusIcon, MixIcon, TrashIcon } from "@radix-ui/react-icons";
import { useQuery, useMutation } from "@apollo/client";
import {
  useGetNotesQuery,
  useCreateNoteMutation,
  useDeleteNoteMutation,
} from "@/app/__generated__/hooks";
import { useRouter } from "next/navigation";

interface NotesListProps {
  entityId: number;
  entityType: string;
}

export default function NotesList({ entityId, entityType }: NotesListProps) {
  const router = useRouter();
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteTags, setNewNoteTags] = useState("");

  // Merge mode state
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useGetNotesQuery({
    variables: { entityId, entityType },
  });

  const [createNote, { loading: submitting }] = useCreateNoteMutation({
    refetchQueries: ["GetNotes"],
  });

  const [deleteNote] = useDeleteNoteMutation({
    refetchQueries: ["GetNotes"],
  });

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    try {
      await createNote({
        variables: {
          input: {
            entityId,
            entityType,
            content: newNoteContent,
            tags: newNoteTags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          },
        },
      });

      setNewNoteContent("");
      setNewNoteTags("");
      setShowAddNote(false);
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMerge = async () => {
    if (selectedIds.size < 2) return;
    setMerging(true);
    setMergeError(null);

    try {
      const res = await fetch("/api/merge-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          noteIds: Array.from(selectedIds),
          entityId,
          entityType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMergeError(data.error || "Merge failed");
        return;
      }

      // Refresh notes list and exit merge mode.
      await refetch();
      setMergeMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      setMergeError("Network error");
      console.error("Merge failed:", err);
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Flex align="center" justify="center" p="6">
          <Spinner />
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error.message}</Text>
          <Button onClick={() => refetch()}>Retry</Button>
        </Flex>
      </Card>
    );
  }

  const notes = data?.notes || [];

  return (
    <Flex direction="column" gap="4">
      <Flex justify="between" align="center">
        <Heading size="5">Notes ({notes.length})</Heading>
        <Flex gap="2">
          {notes.length >= 2 && (
            <Button
              variant={mergeMode ? "solid" : "outline"}
              color={mergeMode ? "orange" : "gray"}
              onClick={() => {
                setMergeMode(!mergeMode);
                setSelectedIds(new Set());
                setMergeError(null);
              }}
            >
              <MixIcon /> {mergeMode ? "Cancel Merge" : "Merge"}
            </Button>
          )}
          <Button onClick={() => setShowAddNote(!showAddNote)}>
            <PlusIcon /> Add Note
          </Button>
        </Flex>
      </Flex>

      {/* Merge toolbar */}
      {mergeMode && (
        <Card>
          <Flex direction="column" gap="2" p="3">
            <Flex justify="between" align="center">
              <Text size="2" color="gray">
                Select notes to merge ({selectedIds.size} selected)
              </Text>
              <Flex gap="2" align="center">
                <Button
                  size="1"
                  variant="soft"
                  onClick={() => {
                    setSelectedIds(new Set(notes.map((n) => n.id)));
                  }}
                >
                  Select All
                </Button>
                <Button
                  size="2"
                  color="cyan"
                  disabled={selectedIds.size < 2 || merging}
                  onClick={handleMerge}
                >
                  {merging ? (
                    <>
                      <Spinner size="1" /> Merging via Qwen...
                    </>
                  ) : (
                    `Merge ${selectedIds.size} Notes`
                  )}
                </Button>
              </Flex>
            </Flex>
            {mergeError && (
              <Text size="2" color="red">
                {mergeError}
              </Text>
            )}
          </Flex>
        </Card>
      )}

      {showAddNote && (
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Heading size="4">New Note</Heading>
            <TextArea
              placeholder="Enter note content..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
            />
            <TextArea
              placeholder="Tags (comma-separated)"
              value={newNoteTags}
              onChange={(e) => setNewNoteTags(e.target.value)}
              rows={1}
            />
            <Flex gap="2">
              <Button onClick={handleAddNote} disabled={submitting}>
                {submitting ? <Spinner /> : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddNote(false)}>
                Cancel
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}

      {notes.length === 0 ? (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text color="gray">No notes yet</Text>
            <Text size="2" color="gray">
              Click &quot;Add Note&quot; to create your first note
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {notes.map((note) => (
            <Card
              key={note.id}
              style={{
                cursor: "pointer",
                outline: selectedIds.has(note.id)
                  ? "2px solid var(--cyan-9)"
                  : undefined,
              }}
              onClick={() => {
                if (mergeMode) {
                  toggleSelect(note.id);
                  return;
                }
                if (!note.slug) {
                  console.warn(`Note ${note.id} has no slug`);
                  return;
                }
                router.push(`/notes/${note.slug}`);
              }}
            >
              <Flex direction="column" gap="2" p="4">
                <Flex justify="between" align="start">
                  <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
                    {note.title && (
                      <Text size="3" weight="bold">
                        {note.title}
                      </Text>
                    )}
                    {note.goal && (
                      <Badge color="indigo" variant="soft" size="1" style={{ alignSelf: "flex-start" }}>
                        Goal: {note.goal.title}
                      </Badge>
                    )}
                    <Text
                      size="2"
                      color="gray"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {note.content}
                    </Text>
                  </Flex>
                  <Flex gap="2" align="center" ml="3" mt="1">
                    {mergeMode && (
                      <Checkbox
                        checked={selectedIds.has(note.id)}
                        onCheckedChange={() => toggleSelect(note.id)}
                        onClick={(e) => e.stopPropagation()}
                        size="3"
                      />
                    )}
                    <AlertDialog.Root>
                      <AlertDialog.Trigger>
                        <IconButton
                          size="1"
                          variant="ghost"
                          color="red"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <TrashIcon />
                        </IconButton>
                      </AlertDialog.Trigger>
                      <AlertDialog.Content maxWidth="400px">
                        <AlertDialog.Title>Delete Note</AlertDialog.Title>
                        <AlertDialog.Description size="2">
                          Are you sure you want to delete &quot;{note.title || "this note"}&quot;? This cannot be undone.
                        </AlertDialog.Description>
                        <Flex gap="3" mt="4" justify="end">
                          <AlertDialog.Cancel>
                            <Button variant="soft" color="gray">Cancel</Button>
                          </AlertDialog.Cancel>
                          <AlertDialog.Action>
                            <Button
                              variant="solid"
                              color="red"
                              onClick={() => {
                                deleteNote({ variables: { id: note.id } });
                              }}
                            >
                              Delete
                            </Button>
                          </AlertDialog.Action>
                        </Flex>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  </Flex>
                </Flex>
                <Flex gap="2" align="center" wrap="wrap">
                  {note.noteType && (
                    <Badge
                      variant="surface"
                      size="1"
                      color={
                        note.noteType === "DEEP_RESEARCH_SYNTHESIS"
                          ? "cyan"
                          : note.noteType === "DEEP_RESEARCH_FINDING"
                            ? "blue"
                            : note.noteType === "DEEP_RESEARCH_MERGED"
                              ? "orange"
                              : "gray"
                      }
                    >
                      {note.noteType
                        .replace("DEEP_RESEARCH_", "")
                        .toLowerCase()}
                    </Badge>
                  )}
                  {note.tags &&
                    note.tags.length > 0 &&
                    note.tags.map((tag, idx) => (
                      <Badge key={idx} variant="soft" size="1">
                        {tag}
                      </Badge>
                    ))}
                  <Text size="1" color="gray">
                    {new Date(note.createdAt).toLocaleDateString()} at{" "}
                    {new Date(note.createdAt).toLocaleTimeString()}
                  </Text>
                </Flex>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
