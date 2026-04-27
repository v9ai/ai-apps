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
import { Brain, Trash2 } from "lucide-react";
import {
  useMemoryEntriesQuery,
  useDeleteMemoryEntryMutation,
  MemoryEntriesDocument,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";
import { AddMemoryEntryForm } from "./add-memory-entry-form";
import { SetMemoryBaselineForm } from "./set-memory-baseline-form";

const categoryColor: Record<
  string,
  "gray" | "blue" | "green" | "yellow" | "red"
> = {
  observation: "gray",
  test: "blue",
  improvement: "green",
  decline: "red",
  side_effect: "yellow",
};

export default function BrainMemoryPage() {
  return (
    <AuthGate
      pageName="Brain Memory"
      description="Track cognitive scores over time. Sign in to access your records."
    >
      <BrainMemoryContent />
    </AuthGate>
  );
}

function BrainMemoryContent() {
  const { data, loading, error } = useMemoryEntriesQuery();
  const entries = data?.memoryEntries ?? [];
  const baseline = data?.memoryBaseline ?? null;

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Brain &amp; Memory
          </Heading>
          <Text size="3" color="gray">
            Track cognitive scores over time and compare against your baseline.
          </Text>
        </Flex>

        <Separator size="4" />

        <BaselinePanel baseline={baseline} />

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Log an entry</Heading>
          <AddMemoryEntryForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading entries</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && entries.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Brain size={48} color="var(--gray-8)" />
            <Heading size="4">No entries yet</Heading>
            <Text size="2" color="gray">
              Log a memory observation above to start tracking.
            </Text>
          </Flex>
        )}

        {!loading && !error && entries.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Recent entries ({entries.length})</Heading>
            <Flex direction="column" gap="2">
              {entries.map((e) => (
                <EntryRow
                  key={e.id}
                  id={e.id}
                  category={e.category}
                  description={e.description ?? null}
                  loggedAt={e.loggedAt}
                  scores={{
                    overall: e.overallScore ?? null,
                    short: e.shortTermScore ?? null,
                    long: e.longTermScore ?? null,
                    working: e.workingMemoryScore ?? null,
                    speed: e.recallSpeed ?? null,
                  }}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

type BaselineLite = {
  overallScore?: number | null;
  shortTermScore?: number | null;
  longTermScore?: number | null;
  workingMemoryScore?: number | null;
  recallSpeed?: number | null;
  recordedAt: string;
};

function BaselinePanel({ baseline }: { baseline: BaselineLite | null }) {
  return (
    <Card>
      <Flex direction="column" gap="3" p="2">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Heading size="4">Baseline</Heading>
          {baseline && (
            <Text size="1" color="gray">
              Recorded {new Date(baseline.recordedAt).toLocaleDateString()}
            </Text>
          )}
        </Flex>
        {baseline ? (
          <Flex gap="3" wrap="wrap">
            <ScoreChip label="Overall" value={baseline.overallScore ?? null} />
            <ScoreChip label="Short-term" value={baseline.shortTermScore ?? null} />
            <ScoreChip label="Long-term" value={baseline.longTermScore ?? null} />
            <ScoreChip label="Working" value={baseline.workingMemoryScore ?? null} />
            <ScoreChip label="Recall speed" value={baseline.recallSpeed ?? null} />
          </Flex>
        ) : (
          <Text size="2" color="gray">
            No baseline yet — set one below so future entries have a reference point.
          </Text>
        )}
        <SetMemoryBaselineForm baseline={baseline} />
      </Flex>
    </Card>
  );
}

function ScoreChip({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <Flex direction="column" gap="0">
      <Text size="1" color="gray">
        {label}
      </Text>
      <Text size="3" weight="medium">
        {value == null ? "—" : value}
      </Text>
    </Flex>
  );
}

function EntryRow({
  id,
  category,
  description,
  loggedAt,
  scores,
}: {
  id: string;
  category: string;
  description: string | null;
  loggedAt: string;
  scores: {
    overall: number | null;
    short: number | null;
    long: number | null;
    working: number | null;
    speed: number | null;
  };
}) {
  const [deleteEntry, { loading: deleting }] = useDeleteMemoryEntryMutation({
    refetchQueries: [{ query: MemoryEntriesDocument }],
  });
  const visibleScores = Object.entries(scores).filter(([, v]) => v != null);

  return (
    <Card>
      <Flex justify="between" align="start" gap="3">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Badge
              color={categoryColor[category] ?? "gray"}
              variant="soft"
              size="1"
            >
              {category}
            </Badge>
            <Text size="1" color="gray">
              {new Date(loggedAt).toLocaleString()}
            </Text>
          </Flex>
          {description && (
            <Text size="2">{description}</Text>
          )}
          {visibleScores.length > 0 && (
            <Flex gap="2" wrap="wrap">
              {visibleScores.map(([k, v]) => (
                <Text key={k} size="1" color="gray">
                  {k}: <strong>{v}</strong>
                </Text>
              ))}
            </Flex>
          )}
        </Flex>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button
              variant="ghost"
              color="gray"
              size="1"
              disabled={deleting}
              aria-label="Delete entry"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete entry?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This memory entry will be permanently removed.
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
                  onClick={() => deleteEntry({ variables: { id } })}
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
