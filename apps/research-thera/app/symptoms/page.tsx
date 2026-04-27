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
import { Activity, Trash2 } from "lucide-react";
import {
  useSymptomsQuery,
  useDeleteSymptomMutation,
  SymptomsDocument,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { AddSymptomForm } from "./add-symptom-form";

const severityColor: Record<
  string,
  "gray" | "yellow" | "orange" | "red"
> = {
  mild: "yellow",
  moderate: "orange",
  severe: "red",
};

export default function SymptomsPage() {
  return (
    <AuthGate
      pageName="Symptoms"
      description="Log and track your symptoms over time. Sign in to access your records."
    >
      <SymptomsContent />
    </AuthGate>
  );
}

function SymptomsContent() {
  const { data, loading, error } = useSymptomsQuery();
  const symptoms = data?.symptoms ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Symptoms
          </Heading>
          <Text size="3" color="gray">
            Log and track symptoms over time.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Log a symptom</Heading>
          <AddSymptomForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading symptoms</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && symptoms.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Activity size={48} color="var(--gray-8)" />
            <Heading size="4">No symptoms logged</Heading>
            <Text size="2" color="gray">
              Log a symptom above to start tracking.
            </Text>
          </Flex>
        )}

        {!loading && !error && symptoms.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Recent symptoms ({symptoms.length})</Heading>
            <Flex direction="column" gap="2">
              {symptoms.map((s) => (
                <SymptomRow
                  key={s.id}
                  id={s.id}
                  description={s.description}
                  severity={s.severity ?? null}
                  loggedAt={s.loggedAt}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function SymptomRow({
  id,
  description,
  severity,
  loggedAt,
}: {
  id: string;
  description: string;
  severity: string | null;
  loggedAt: string;
}) {
  const [deleteSymptom, { loading: deleting }] = useDeleteSymptomMutation({
    refetchQueries: [{ query: SymptomsDocument }],
  });

  return (
    <Card>
      <Flex justify="between" align="center" gap="3">
        <Flex direction="column" gap="1" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" weight="medium">
              {description}
            </Text>
            {severity && (
              <Badge
                color={severityColor[severity.toLowerCase()] ?? "gray"}
                variant="soft"
                size="1"
              >
                {severity}
              </Badge>
            )}
          </Flex>
          <Text size="1" color="gray">
            {new Date(loggedAt).toLocaleString()}
          </Text>
        </Flex>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button
              variant="ghost"
              color="gray"
              size="1"
              disabled={deleting}
              aria-label="Delete symptom"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete symptom?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This symptom log will be permanently removed.
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
                  onClick={() => deleteSymptom({ variables: { id } })}
                >
                  Delete
                </Button>
              </AlertDialog.Action>
            </Flex>
          </AlertDialog.Content>
        </AlertDialog.Root>
      </Flex>
    </Card>
  );
}
