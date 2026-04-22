"use client";

import { useState } from "react";
import {
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  Separator,
  Spinner,
  AlertDialog,
  Link,
} from "@radix-ui/themes";
import { GlassButton } from "@/app/components/GlassButton";
import {
  useGetJournalRecommendedBooksQuery,
  useGenerateJournalRecommendedBooksMutation,
  useDeleteJournalRecommendedBooksMutation,
} from "@/app/__generated__/hooks";

interface JournalRecommendedBooksSectionProps {
  journalEntryId: number;
  hasResearch: boolean;
}

function getCategoryColor(category: string) {
  switch (category) {
    case "parenting": return "blue" as const;
    case "therapy": return "purple" as const;
    case "self-help": return "green" as const;
    case "child development": return "orange" as const;
    case "education": return "cyan" as const;
    case "psychology": return "violet" as const;
    case "neuroscience": return "crimson" as const;
    default: return "gray" as const;
  }
}

export default function JournalRecommendedBooksSection({
  journalEntryId,
  hasResearch,
}: JournalRecommendedBooksSectionProps) {
  const { data, refetch } = useGetJournalRecommendedBooksQuery({
    variables: { journalEntryId },
    skip: !journalEntryId,
  });
  const books = data?.recommendedBooks ?? [];

  const [generateBooks, { loading: generating }] = useGenerateJournalRecommendedBooksMutation({
    onCompleted: () => refetch(),
  });

  const [deleteBooks, { loading: deleting }] = useDeleteJournalRecommendedBooksMutation({
    onCompleted: () => refetch(),
  });

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleGenerate = async () => {
    setMessage(null);
    try {
      const result = await generateBooks({ variables: { journalEntryId } });
      const res = result.data?.generateRecommendedBooks;
      if (res?.success) {
        setMessage({ text: res.message || "Books recommended.", type: "success" });
      } else {
        setMessage({ text: res?.message || "Failed to generate recommendations.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Error generating recommendations.", type: "error" });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBooks({ variables: { journalEntryId } });
      setMessage(null);
    } catch (err: any) {
      setMessage({ text: err.message || "Error deleting recommendations.", type: "error" });
    }
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Flex align="center" gap="2">
            <Heading size="4">
              Recommended Books {books.length > 0 ? `(${books.length})` : ""}
            </Heading>
          </Flex>
          <Flex gap="2">
            {books.length > 0 && (
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  <Button variant="soft" color="red" size="2" disabled={deleting || generating}>
                    {deleting ? "Deleting..." : "Clear"}
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content style={{ maxWidth: 400 }}>
                  <AlertDialog.Title>Clear Book Recommendations</AlertDialog.Title>
                  <AlertDialog.Description size="2">
                    Delete all {books.length} book recommendation{books.length === 1 ? "" : "s"} for this journal entry?
                  </AlertDialog.Description>
                  <Flex gap="3" mt="4" justify="end">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">Cancel</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button variant="solid" color="red" onClick={handleDelete}>Delete</Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            )}
            <GlassButton
              variant="primary"
              size="medium"
              loading={generating}
              disabled={!hasResearch}
              onClick={handleGenerate}
            >
              {generating && <Spinner size="1" />}
              {books.length > 0 ? "Regenerate" : "Recommend Books"}
            </GlassButton>
          </Flex>
        </Flex>

        {!hasResearch && (
          <Text size="2" color="gray">
            Generate research first to unlock book recommendations.
          </Text>
        )}

        {message && (
          <Text size="2" color={message.type === "success" ? "green" : "red"}>
            {message.text}
          </Text>
        )}

        {books.length > 0 && (
          <>
            <Separator size="4" />
            {books.map((book) => (
              <Card key={book.id} variant="surface">
                <Flex direction="column" gap="2" p="3">
                  <Flex justify="between" align="start" gap="2">
                    <Flex direction="column" gap="1" style={{ flex: 1 }}>
                      <Text size="2" weight="bold">{book.title}</Text>
                      <Text size="1" color="gray">
                        {book.authors.join(", ")}
                        {book.year ? ` (${book.year})` : ""}
                      </Text>
                    </Flex>
                    <Badge variant="soft" color={getCategoryColor(book.category)} size="1">
                      {book.category}
                    </Badge>
                  </Flex>

                  <Text size="1" style={{ lineHeight: "1.6" }}>
                    {book.description}
                  </Text>

                  <Text size="1" color="indigo" style={{ lineHeight: "1.6", fontStyle: "italic" }}>
                    {book.whyRecommended}
                  </Text>

                  <Flex gap="2" align="center" wrap="wrap">
                    {book.isbn && (
                      <Text size="1" color="gray">ISBN: {book.isbn}</Text>
                    )}
                    {book.amazonUrl && (
                      <Link href={book.amazonUrl} target="_blank" rel="noopener noreferrer" size="1">
                        View on Amazon
                      </Link>
                    )}
                  </Flex>
                </Flex>
              </Card>
            ))}
          </>
        )}

        {hasResearch && books.length === 0 && !generating && (
          <Text size="2" color="gray">
            Get personalized book recommendations based on the research papers for this journal entry.
          </Text>
        )}
      </Flex>
    </Card>
  );
}
