import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { journalEntries } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { Badge, Box, Card, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { BookOpen } from "lucide-react";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { EntryForm } from "./entry-form";
import { deleteJournalEntry } from "./actions";

export default async function JournalPage() {
  const { userId } = await withAuth();

  const entries = await db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.loggedAt));

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Flex direction="column" gap="1">
            <Flex align="center" gap="2">
              <BookOpen size={24} style={{ color: "var(--indigo-11)" }} />
              <Heading size="7" weight="bold">Journal</Heading>
            </Flex>
            <Text size="2" color="gray">
              Free-form health journal. Capture how you're feeling, what you noticed, what you tried.
              {entries.length > 0 && ` ${entries.length} ${entries.length === 1 ? "entry" : "entries"}.`}
            </Text>
          </Flex>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">New entry</Heading>
          <EntryForm />
        </Flex>

        {entries.length === 0 ? (
          <Flex direction="column" align="center" gap="3" py="9">
            <BookOpen size={48} color="var(--gray-8)" />
            <Heading size="4">No journal entries yet</Heading>
            <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
              Write your first entry above. Anything goes — how you feel, what you noticed,
              side effects, small wins.
            </Text>
          </Flex>
        ) : (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="3">
              <Heading size="4">Timeline</Heading>
              <Flex direction="column" gap="3">
                {entries.map((entry) => (
                  <Card key={entry.id} variant="surface">
                    <Flex justify="between" align="start" gap="3">
                      <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
                        <Flex align="center" gap="2" wrap="wrap">
                          <Text size="1" color="gray">
                            {new Date(entry.loggedAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                          {entry.mood && (
                            <Badge color="indigo" variant="soft" size="1">
                              {entry.mood}
                            </Badge>
                          )}
                          {entry.tags.map((tag) => (
                            <Badge key={tag} color="gray" variant="outline" size="1">
                              {tag}
                            </Badge>
                          ))}
                        </Flex>
                        {entry.title && (
                          <Heading size="3" weight="medium">
                            {entry.title}
                          </Heading>
                        )}
                        <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                          {entry.body}
                        </Text>
                      </Flex>
                      <DeleteConfirmButton
                        action={deleteJournalEntry.bind(null, entry.id)}
                        description="This journal entry will be permanently deleted."
                      />
                    </Flex>
                  </Card>
                ))}
              </Flex>
            </Flex>
          </>
        )}
      </Flex>
    </Box>
  );
}
