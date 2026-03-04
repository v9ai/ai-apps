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
} from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { useQuery, useMutation } from "@apollo/client";
import {
  useGetNotesQuery,
  useCreateNoteMutation,
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

  const { data, loading, error, refetch } = useGetNotesQuery({
    variables: { entityId, entityType },
  });

  const [createNote, { loading: submitting }] = useCreateNoteMutation({
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
        <Button onClick={() => setShowAddNote(!showAddNote)}>
          <PlusIcon /> Add Note
        </Button>
      </Flex>

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
              Click "Add Note" to create your first note
            </Text>
          </Flex>
        </Card>
      ) : (
        <Flex direction="column" gap="3">
          {notes.map((note) => (
            <Card
              key={note.id}
              style={{ cursor: "pointer" }}
              onClick={() => {
                if (!note.slug) {
                  console.warn(`Note ${note.id} has no slug`);
                  return;
                }
                router.push(`/notes/${note.slug}`);
              }}
            >
              <Flex direction="column" gap="2" p="4">
                {note.goal && (
                  <Flex gap="2" align="center" mb="1">
                    <Badge color="indigo" variant="soft" size="1">
                      Goal: {note.goal.title}
                    </Badge>
                  </Flex>
                )}
                <Flex justify="between" align="start">
                  <Text
                    style={{
                      whiteSpace: "pre-wrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {note.content}
                  </Text>
                </Flex>
                <Flex gap="2" align="center" wrap="wrap">
                  {note.tags &&
                    note.tags.length > 0 &&
                    note.tags.map((tag, idx) => (
                      <Badge key={idx} variant="soft">
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
