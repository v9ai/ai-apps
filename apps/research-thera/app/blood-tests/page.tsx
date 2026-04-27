"use client";

import {
  Box,
  Card,
  Flex,
  Heading,
  Text,
  Badge,
  Separator,
  Spinner,
  Button,
  AlertDialog,
} from "@radix-ui/themes";
import { Droplets, Eye, Trash2 } from "lucide-react";
import {
  useBloodTestsQuery,
  useDeleteBloodTestMutation,
  BloodTestsDocument,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { UploadBloodTestForm } from "./upload-form";

const statusColor: Record<string, "gray" | "amber" | "green" | "red"> = {
  pending: "gray",
  processing: "amber",
  completed: "green",
  failed: "red",
};

export default function BloodTestsPage() {
  return (
    <AuthGate
      pageName="Blood Tests"
      description="Upload blood-test PDFs and track parsed marker history. Sign in to access your records."
    >
      <BloodTestsContent />
    </AuthGate>
  );
}

function BloodTestsContent() {
  const { data, loading, error } = useBloodTestsQuery({
    pollInterval: 5000, // poll while uploads are processing
  });
  const tests = data?.bloodTests ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Blood Tests
          </Heading>
          <Text size="3" color="gray">
            Upload blood-test PDFs — parsed and embedded by the merged Python
            pipeline (LlamaParse → FastEmbed → pgvector).
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Upload</Heading>
          <UploadBloodTestForm />
        </Flex>

        <Separator size="4" />

        {loading && tests.length === 0 && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading blood tests</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && tests.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Droplets size={48} color="var(--gray-8)" />
            <Heading size="4">No blood tests yet</Heading>
            <Text size="2" color="gray">
              Upload a PDF above to start building your trajectory.
            </Text>
          </Flex>
        )}

        {!loading && !error && tests.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Your blood tests ({tests.length})</Heading>
            <Flex direction="column" gap="2">
              {tests.map((t) => (
                <BloodTestRow
                  key={t.id}
                  id={t.id}
                  fileName={t.fileName}
                  status={t.status}
                  testDate={t.testDate ?? null}
                  errorMessage={t.errorMessage ?? null}
                  uploadedAt={t.uploadedAt}
                  markersCount={t.markersCount}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function BloodTestRow({
  id,
  fileName,
  status,
  testDate,
  errorMessage,
  uploadedAt,
  markersCount,
}: {
  id: string;
  fileName: string;
  status: string;
  testDate: string | null;
  errorMessage: string | null;
  uploadedAt: string;
  markersCount: number;
}) {
  const [deleteTest, { loading: deleting }] = useDeleteBloodTestMutation({
    refetchQueries: [{ query: BloodTestsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="start" gap="3">
        <Flex direction="column" gap="1" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" weight="medium">
              {fileName}
            </Text>
            <Badge
              color={statusColor[status] ?? "gray"}
              variant="soft"
              size="1"
            >
              {status}
            </Badge>
            {markersCount > 0 && (
              <Badge color="blue" variant="soft" size="1">
                {markersCount} marker{markersCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </Flex>
          <Flex gap="3" wrap="wrap">
            {testDate && (
              <Text size="1" color="gray">
                Test date: {testDate}
              </Text>
            )}
            <Text size="1" color="gray">
              Uploaded {new Date(uploadedAt).toLocaleString()}
            </Text>
          </Flex>
          {errorMessage && (
            <Text size="1" color="red">
              {errorMessage}
            </Text>
          )}
        </Flex>

        <Flex gap="1" align="center">
          <Button
            asChild
            variant="ghost"
            color="gray"
            size="1"
            aria-label="View PDF"
          >
            <a
              href={`/api/healthcare/blood-test-file/${id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Eye size={14} />
            </a>
          </Button>

          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button
                variant="ghost"
                color="gray"
                size="1"
                disabled={deleting}
                aria-label="Delete blood test"
              >
                <Trash2 size={14} />
              </Button>
            </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete blood test?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This removes the PDF from R2, all parsed markers, and all derived
              embeddings. Cannot be undone.
            </AlertDialog.Description>
            <Flex gap="3" mt="4" justify="end">
              <AlertDialog.Cancel>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action>
                <Button
                  color="red"
                  onClick={() => deleteTest({ variables: { id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
        </Flex>
      </Flex>
    </Card>
  );
}
