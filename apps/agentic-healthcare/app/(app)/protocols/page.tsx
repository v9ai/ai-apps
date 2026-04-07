import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { brainHealthProtocols, protocolSupplements } from "@/lib/db/schema";
import { eq, desc, count } from "drizzle-orm";
import { Box, Badge, Card, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import { Suspense } from "react";
import { Brain } from "lucide-react";
import Link from "next/link";
import { AddProtocolForm } from "./add-form";
import { deleteProtocol } from "./actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { css } from "styled-system/css";

const protocolGrid = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "3",
});

const cardClass = css({
  textDecoration: "none",
  transition: "box-shadow 0.15s ease, transform 0.15s ease",
  display: "block",
  _hover: {
    boxShadow: "0 4px 16px var(--shadow-3)",
    transform: "translateY(-1px)",
  },
});

const activeCard = css({
  borderLeft: "3px solid var(--indigo-9)",
});

const pausedCard = css({
  borderLeft: "3px solid var(--amber-9)",
});

const completedCard = css({
  borderLeft: "3px solid var(--green-9)",
});

const emptyState = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "var(--space-3)",
  padding: "var(--space-9) var(--space-4)",
  borderRadius: "var(--radius-3)",
  background: "var(--gray-2)",
  textAlign: "center",
});

function statusColor(status: string): "indigo" | "amber" | "green" | "gray" {
  if (status === "active") return "indigo";
  if (status === "paused") return "amber";
  if (status === "completed") return "green";
  return "gray";
}

function statusBorder(status: string) {
  if (status === "active") return activeCard;
  if (status === "paused") return pausedCard;
  if (status === "completed") return completedCard;
  return "";
}

const AREA_LABELS: Record<string, string> = {
  MEMORY: "Memory",
  FOCUS: "Focus",
  PROCESSING_SPEED: "Processing",
  NEUROPLASTICITY: "Neuroplasticity",
  NEUROPROTECTION: "Neuroprotection",
  MOOD_REGULATION: "Mood",
  SLEEP_QUALITY: "Sleep",
};

async function ProtocolsList() {
  const { userId } = await withAuth();

  const rows = await db
    .select()
    .from(brainHealthProtocols)
    .where(eq(brainHealthProtocols.userId, userId))
    .orderBy(desc(brainHealthProtocols.createdAt));

  if (!rows.length) {
    return (
      <div className={emptyState}>
        <Brain size={48} color="var(--gray-8)" />
        <Heading size="4">No protocols yet</Heading>
        <Text size="2" color="gray">
          Create a brain health protocol to track supplements and cognitive progress.
        </Text>
      </div>
    );
  }

  // Get supplement counts
  const supplementCounts = await db
    .select({ protocolId: protocolSupplements.protocolId, count: count() })
    .from(protocolSupplements)
    .groupBy(protocolSupplements.protocolId);

  const countMap = new Map(supplementCounts.map((r) => [r.protocolId, r.count]));

  return (
    <div className={protocolGrid}>
      {rows.map((p) => {
        const areas = (p.targetAreas as string[]) || [];
        const suppCount = countMap.get(p.id) || 0;

        return (
          <Card key={p.id} asChild className={`${cardClass} ${statusBorder(p.status)}`}>
            <Link href={`/protocols/${p.id}`}>
              <Flex justify="between" align="start">
                <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                  <Flex align="center" gap="2">
                    <Text size="2" weight="bold">{p.name}</Text>
                    <Badge color={statusColor(p.status)} variant="soft" size="1">
                      {p.status}
                    </Badge>
                  </Flex>

                  {areas.length > 0 && (
                    <Flex gap="1" wrap="wrap">
                      {areas.slice(0, 4).map((a) => (
                        <Badge key={a} color="gray" variant="outline" size="1">
                          {AREA_LABELS[a] || a}
                        </Badge>
                      ))}
                      {areas.length > 4 && (
                        <Badge color="gray" variant="outline" size="1">
                          +{areas.length - 4}
                        </Badge>
                      )}
                    </Flex>
                  )}

                  <Flex align="center" gap="3">
                    <Text size="1" color="gray">
                      {suppCount} supplement{suppCount !== 1 ? "s" : ""}
                    </Text>
                    {p.startDate && (
                      <Text size="1" color="gray">
                        Since {new Date(p.startDate).toLocaleDateString()}
                      </Text>
                    )}
                  </Flex>

                  {p.notes && (
                    <Text size="1" color="gray" className={css({ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" })}>
                      {p.notes}
                    </Text>
                  )}
                </Flex>
                <DeleteConfirmButton
                  action={deleteProtocol.bind(null, p.id)}
                  description="This protocol and all its supplements and check-ins will be permanently deleted."
                  stopPropagation
                />
              </Flex>
            </Link>
          </Card>
        );
      })}
    </div>
  );
}

export default function ProtocolsPage() {
  return (
    <Box py="8">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7" weight="bold">Brain Health Protocols</Heading>
          <Text size="2" color="gray">Track supplement stacks and cognitive progress over time.</Text>
        </Flex>

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">New protocol</Heading>
          <AddProtocolForm />
        </Flex>

        <Separator size="4" />

        <Suspense fallback={
          <div className={protocolGrid}>
            <Skeleton height="100px" />
            <Skeleton height="100px" />
          </div>
        }>
          <ProtocolsList />
        </Suspense>
      </Flex>
    </Box>
  );
}
