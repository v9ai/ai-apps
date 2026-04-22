"use client";

import { useEffect, useState } from "react";
import {
  Box,
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
  useGetGenerationJobQuery,
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

  const [jobId, setJobId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [generateBooks, { loading: starting }] = useGenerateJournalRecommendedBooksMutation({
    onCompleted: (res) => {
      const newJobId = res.generateRecommendedBooks.jobId ?? null;
      if (newJobId) setJobId(newJobId);
    },
  });

  const [deleteBooks, { loading: deleting }] = useDeleteJournalRecommendedBooksMutation({
    onCompleted: () => refetch(),
  });

  const { data: jobData, stopPolling } = useGetGenerationJobQuery({
    variables: { id: jobId! },
    skip: !jobId,
    pollInterval: 2000,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const jobStatus = jobData?.generationJob?.status;
  const isRunning = !!jobId && jobStatus !== "SUCCEEDED" && jobStatus !== "FAILED";

  useEffect(() => {
    if (!jobId || !jobStatus) return;
    if (jobStatus === "SUCCEEDED") {
      stopPolling();
      setJobId(null);
      setMessage({ text: "Books recommended.", type: "success" });
      refetch();
    } else if (jobStatus === "FAILED") {
      stopPolling();
      setJobId(null);
      setMessage({
        text: jobData?.generationJob?.error?.message ?? "Failed to generate recommendations.",
        type: "error",
      });
    }
  }, [jobId, jobStatus, jobData, refetch, stopPolling]);

  const generating = starting || isRunning;

  const handleGenerate = async () => {
    setMessage(null);
    try {
      await generateBooks({ variables: { journalEntryId } });
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

        {generating && (
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Generating book recommendations...</Text>
            <Box style={{ height: 6, borderRadius: 3, background: "var(--gray-4)", overflow: "hidden" }}>
              <Box style={{ height: "100%", width: "40%", background: "var(--indigo-9)", borderRadius: 3, animation: "researchSweep 1.4s ease-in-out infinite" }} />
            </Box>
          </Flex>
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
