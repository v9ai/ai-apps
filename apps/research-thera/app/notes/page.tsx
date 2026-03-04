"use client";

import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { useGetAllNotesQuery } from "../__generated__/hooks";
import { useUser } from "@clerk/nextjs";
import { AuthGate } from "../components/AuthGate";

export default function NotesPage() {
  const router = useRouter();
  const { user } = useUser();

  const { data, loading, error } = useGetAllNotesQuery({ skip: !user });

  const notes = data?.allNotes || [];

  return (
    <AuthGate
      pageName="Notes"
      description="Your therapeutic notes are private. Sign in to access your reflections."
    >
    <Flex direction="column" gap="4">
      <Flex direction="column" gap="1">
        <Heading size="8">Notes</Heading>
        <Text size="3" color="gray">
          Manage your therapeutic notes and reflections
        </Text>
      </Flex>

      <Card>
        {loading && (
          <Flex justify="center" align="center" p="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading notes</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && notes.length === 0 && (
          <Flex direction="column" align="center" p="6" gap="3">
            <Text size="4" weight="bold">
              Notes ({notes.length})
            </Text>
            <Text color="gray">No notes yet</Text>
            <Text size="2" color="gray">
              Click "Add Note" to create your first note
            </Text>
          </Flex>
        )}

        {!loading && !error && notes.length > 0 && (
          <Flex direction="column" gap="4">
            <Flex justify="between" align="center">
              <Heading size="4">Notes ({notes.length})</Heading>
            </Flex>

            <Flex direction="column" gap="3">
              {notes.map((note) => (
                <Card
                  key={note.id}
                  onClick={() =>
                    router.push(
                      note.slug ? `/notes/${note.slug}` : `/notes/${note.id}`,
                    )
                  }
                  style={{
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--gray-3)";
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--gray-2)";
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <Flex direction="column" gap="2">
                    <Flex justify="between" align="start">
                      <Heading size="3">
                        {note.title || "Untitled Note"}
                      </Heading>
                      <Badge variant="soft" size="1">
                        {note.entityType}
                      </Badge>
                    </Flex>
                    <Text size="2" color="gray" style={{ lineHeight: 1.5 }}>
                      {note.content.slice(0, 150)}
                      {note.content.length > 150 && "..."}
                    </Text>
                    <Flex gap="2" align="center" wrap="wrap">
                      {note.tags?.map((tag, idx) => (
                        <Badge key={idx} variant="outline" size="1">
                          {tag}
                        </Badge>
                      ))}
                      <Text size="1" color="gray">
                        {new Date(note.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </Text>
                    </Flex>
                    {note.goal && (
                      <Flex gap="2" align="center">
                        <Text size="1" color="gray">
                          Goal:
                        </Text>
                        <Text size="1" weight="medium">
                          {note.goal.title}
                        </Text>
                      </Flex>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          </Flex>
        )}
      </Card>
    </Flex>
    </AuthGate>
  );
}
