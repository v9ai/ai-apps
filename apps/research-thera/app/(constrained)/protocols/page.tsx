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
import Link from "next/link";
import {
  useProtocolsQuery,
  useDeleteProtocolMutation,
  ProtocolsDocument,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";
import { AddProtocolForm } from "./add-protocol-form";

const AREA_LABELS: Record<string, string> = {
  MEMORY: "Memory",
  FOCUS: "Focus",
  PROCESSING_SPEED: "Processing",
  NEUROPLASTICITY: "Neuroplasticity",
  NEUROPROTECTION: "Neuroprotection",
  MOOD_REGULATION: "Mood",
  SLEEP_QUALITY: "Sleep",
};

const statusColor: Record<string, "indigo" | "amber" | "green" | "gray"> = {
  active: "indigo",
  paused: "amber",
  completed: "green",
};

export default function ProtocolsPage() {
  return (
    <AuthGate
      pageName="Protocols"
      description="Track supplement stacks and cognitive progress over time. Sign in to access your protocols."
    >
      <ProtocolsContent />
    </AuthGate>
  );
}

function ProtocolsContent() {
  const { data, loading, error } = useProtocolsQuery();
  const protocols = data?.protocols ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Brain Health Protocols
          </Heading>
          <Text size="3" color="gray">
            Track supplement stacks and cognitive progress over time.
          </Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">New protocol</Heading>
          <AddProtocolForm />
        </Flex>

        <Separator size="4" />

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Error loading protocols</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && protocols.length === 0 && (
          <Flex direction="column" align="center" gap="3" py="9">
            <Brain size={48} color="var(--gray-8)" />
            <Heading size="4">No protocols yet</Heading>
            <Text size="2" color="gray">
              Create one above to track supplements and cognitive progress.
            </Text>
          </Flex>
        )}

        {!loading && !error && protocols.length > 0 && (
          <Flex direction="column" gap="3">
            <Heading size="4">Your protocols ({protocols.length})</Heading>
            <Flex
              direction="column"
              gap="3"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              }}
            >
              {protocols.map((p) => (
                <ProtocolCard
                  key={p.id}
                  id={p.id}
                  slug={p.slug}
                  name={p.name}
                  status={p.status}
                  targetAreas={p.targetAreas}
                  notes={p.notes ?? null}
                  startDate={p.startDate ?? null}
                  supplementCount={p.supplementCount}
                />
              ))}
            </Flex>
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

function ProtocolCard({
  id,
  slug,
  name,
  status,
  targetAreas,
  notes,
  startDate,
  supplementCount,
}: {
  id: string;
  slug: string;
  name: string;
  status: string;
  targetAreas: string[];
  notes: string | null;
  startDate: string | null;
  supplementCount: number;
}) {
  const [deleteProtocol, { loading: deleting }] = useDeleteProtocolMutation({
    refetchQueries: [{ query: ProtocolsDocument }],
  });

  const borderColor =
    status === "active"
      ? "var(--indigo-9)"
      : status === "paused"
        ? "var(--amber-9)"
        : status === "completed"
          ? "var(--green-9)"
          : "var(--gray-7)";

  return (
    <Card style={{ borderLeft: `3px solid ${borderColor}` }}>
      <Flex justify="between" align="start" gap="2">
        <Flex direction="column" gap="2" style={{ flexGrow: 1, minWidth: 0 }}>
          <Flex align="center" gap="2" wrap="wrap">
            <Link
              href={`/protocols/${slug}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Text size="2" weight="bold">
                {name}
              </Text>
            </Link>
            <Badge
              color={statusColor[status] ?? "gray"}
              variant="soft"
              size="1"
            >
              {status}
            </Badge>
          </Flex>

          {targetAreas.length > 0 && (
            <Flex gap="1" wrap="wrap">
              {targetAreas.slice(0, 4).map((a) => (
                <Badge key={a} color="gray" variant="outline" size="1">
                  {AREA_LABELS[a] ?? a}
                </Badge>
              ))}
              {targetAreas.length > 4 && (
                <Badge color="gray" variant="outline" size="1">
                  +{targetAreas.length - 4}
                </Badge>
              )}
            </Flex>
          )}

          <Flex align="center" gap="3">
            <Text size="1" color="gray">
              {supplementCount} supplement
              {supplementCount !== 1 ? "s" : ""}
            </Text>
            {startDate && (
              <Text size="1" color="gray">
                Since {new Date(startDate).toLocaleDateString()}
              </Text>
            )}
          </Flex>

          {notes && (
            <Text
              size="1"
              color="gray"
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {notes}
            </Text>
          )}
        </Flex>

        <AlertDialog.Root>
          <AlertDialog.Trigger>
            <Button
              variant="ghost"
              color="gray"
              size="1"
              disabled={deleting}
              aria-label="Delete protocol"
            >
              <Trash2 size={14} />
            </Button>
          </AlertDialog.Trigger>
          <AlertDialog.Content maxWidth="400px">
            <AlertDialog.Title>Delete protocol?</AlertDialog.Title>
            <AlertDialog.Description size="2">
              This protocol and all its supplements, baselines, and check-ins
              will be permanently removed.
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
                  onClick={() => deleteProtocol({ variables: { id } })}
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
