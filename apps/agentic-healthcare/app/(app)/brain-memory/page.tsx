import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  memoryEntries,
  memoryBaseline,
  brainHealthProtocols,
  cognitiveCheckIns,
  cognitiveBaselines,
} from "@/lib/db/schema";
import { and, avg, count, desc, eq, gte, lt, sql } from "drizzle-orm";
import { Badge, Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { BrainCircuit } from "lucide-react";
import Link from "next/link";
import { css } from "styled-system/css";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { MemoryEntryForm } from "./memory-entry-form";
import { BaselineForm } from "./baseline-form";
import { deleteMemoryEntry } from "./actions";

const twoColClass = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "5",
  "@media (min-width: 900px)": {
    gridTemplateColumns: "1fr 360px",
  },
});

const SCORE_FIELDS = [
  { key: "overallScore", label: "Overall", color: "var(--indigo-9)" },
  { key: "shortTermScore", label: "Short-term", color: "var(--cyan-9)" },
  { key: "longTermScore", label: "Long-term", color: "var(--violet-9)" },
  { key: "workingMemoryScore", label: "Working", color: "var(--amber-9)" },
  { key: "recallSpeed", label: "Recall speed", color: "var(--blue-9)" },
] as const;

const CATEGORY_CONFIG: Record<string, { label: string; color: "gray" | "red" | "green" | "amber" | "blue" }> = {
  observation: { label: "Observation", color: "gray" },
  brain_fog: { label: "Brain Fog", color: "red" },
  clarity: { label: "Clarity", color: "green" },
  recall_issue: { label: "Recall Issue", color: "amber" },
  recall_success: { label: "Recall Success", color: "blue" },
};

function ScoreBar({ label, score, color, max = 10 }: { label: string; score: number | null; color: string; max?: number }) {
  if (score === null) return null;
  const pct = Math.min((score / max) * 100, 100);
  return (
    <Flex direction="column" gap="1">
      <Flex justify="between" align="center">
        <Text size="1" color="gray">{label}</Text>
        <Text size="1" weight="medium">{score.toFixed(1)}</Text>
      </Flex>
      <Box
        className={css({ height: "6px", borderRadius: "3px", background: "var(--gray-a3)", overflow: "hidden" })}
      >
        <Box
          className={css({ height: "100%", borderRadius: "3px", transition: "width 300ms ease" })}
          style={{ width: `${pct}%`, background: color }}
        />
      </Box>
    </Flex>
  );
}

export default async function BrainMemoryPage() {
  const { userId } = await withAuth();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Parallel queries
  const [
    entries,
    [baseline],
    recentAvgs,
    prevAvgs,
    categoryCounts,
    protocols,
  ] = await Promise.all([
    db
      .select()
      .from(memoryEntries)
      .where(eq(memoryEntries.userId, userId))
      .orderBy(desc(memoryEntries.loggedAt)),
    db
      .select()
      .from(memoryBaseline)
      .where(eq(memoryBaseline.userId, userId)),
    // Last 30 days averages
    db
      .select({
        avgOverall: avg(memoryEntries.overallScore),
        avgShortTerm: avg(memoryEntries.shortTermScore),
        avgLongTerm: avg(memoryEntries.longTermScore),
        avgWorking: avg(memoryEntries.workingMemoryScore),
        avgRecall: avg(memoryEntries.recallSpeed),
        count: count(),
      })
      .from(memoryEntries)
      .where(and(eq(memoryEntries.userId, userId), gte(memoryEntries.loggedAt, thirtyDaysAgo))),
    // Previous 30 days averages (for trend)
    db
      .select({
        avgOverall: avg(memoryEntries.overallScore),
      })
      .from(memoryEntries)
      .where(
        and(
          eq(memoryEntries.userId, userId),
          gte(memoryEntries.loggedAt, sixtyDaysAgo),
          lt(memoryEntries.loggedAt, thirtyDaysAgo),
        ),
      ),
    // Category breakdown (last 30 days)
    db
      .select({
        category: memoryEntries.category,
        count: count(),
      })
      .from(memoryEntries)
      .where(and(eq(memoryEntries.userId, userId), gte(memoryEntries.loggedAt, thirtyDaysAgo)))
      .groupBy(memoryEntries.category),
    // Active protocols for the form
    db
      .select({ id: brainHealthProtocols.id, name: brainHealthProtocols.name })
      .from(brainHealthProtocols)
      .where(and(eq(brainHealthProtocols.userId, userId), eq(brainHealthProtocols.status, "active"))),
  ]);

  // Protocol memory scores — latest check-in memoryScore per protocol
  const protocolScores = await db
    .select({
      protocolId: brainHealthProtocols.id,
      protocolName: brainHealthProtocols.name,
      protocolSlug: brainHealthProtocols.slug,
      latestMemory: sql<number | null>`(
        SELECT memory_score FROM cognitive_check_ins
        WHERE protocol_id = ${brainHealthProtocols.id}
        ORDER BY recorded_at DESC LIMIT 1
      )`,
      baselineMemory: sql<number | null>`(
        SELECT memory_score FROM cognitive_baselines
        WHERE protocol_id = ${brainHealthProtocols.id}
      )`,
    })
    .from(brainHealthProtocols)
    .where(eq(brainHealthProtocols.userId, userId));

  const recent = recentAvgs[0];
  const prev = prevAvgs[0];
  const recentOverall = recent?.avgOverall ? parseFloat(String(recent.avgOverall)) : null;
  const prevOverall = prev?.avgOverall ? parseFloat(String(prev.avgOverall)) : null;
  const trend = recentOverall !== null && prevOverall !== null ? recentOverall - prevOverall : null;

  const baselineScores = baseline
    ? {
        overallScore: baseline.overallScore,
        shortTermScore: baseline.shortTermScore,
        longTermScore: baseline.longTermScore,
        workingMemoryScore: baseline.workingMemoryScore,
        recallSpeed: baseline.recallSpeed,
      }
    : null;

  // Latest entry for progress delta
  const latestEntry = entries[0] ?? null;

  const totalEntries = entries.length;
  const isEmpty = totalEntries === 0 && !baseline;

  return (
    <div className={twoColClass}>
      {/* Main column */}
      <Flex direction="column" gap="5">
        {/* Header */}
        <Flex direction="column" gap="1">
          <Flex align="center" gap="2">
            <BrainCircuit size={24} style={{ color: "var(--indigo-11)" }} />
            <Heading size="6">Brain / Memory</Heading>
          </Flex>
          <Text size="2" color="gray">
            Track your memory health, log observations, and monitor cognitive patterns.
            {totalEntries > 0 && ` ${totalEntries} entries recorded.`}
          </Text>
        </Flex>

        {/* Summary card — 30 day averages */}
        {recent && recent.count > 0 && (
          <Card>
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center">
                <Text size="2" weight="medium">30-Day Summary</Text>
                <Flex align="center" gap="2">
                  <Text size="1" color="gray">{recent.count} entries</Text>
                  {trend !== null && (
                    <Badge color={trend > 0 ? "green" : trend < 0 ? "red" : "gray"} variant="soft" size="1">
                      {trend > 0 ? "+" : ""}{trend.toFixed(1)} overall
                    </Badge>
                  )}
                </Flex>
              </Flex>
              <Flex gap="3" wrap="wrap">
                {[
                  { label: "Overall", val: recent.avgOverall },
                  { label: "Short-term", val: recent.avgShortTerm },
                  { label: "Long-term", val: recent.avgLongTerm },
                  { label: "Working", val: recent.avgWorking },
                  { label: "Recall", val: recent.avgRecall },
                ].map((s) => {
                  const v = s.val ? parseFloat(String(s.val)) : null;
                  if (v === null) return null;
                  return (
                    <Flex key={s.label} direction="column" align="center" gap="1" style={{ flex: "1 1 60px" }}>
                      <Text size="4" weight="bold">{v.toFixed(1)}</Text>
                      <Text size="1" color="gray">{s.label}</Text>
                    </Flex>
                  );
                })}
              </Flex>
              {categoryCounts.length > 0 && (
                <Flex gap="2" wrap="wrap">
                  {categoryCounts.map((cc) => {
                    const cfg = CATEGORY_CONFIG[cc.category] || CATEGORY_CONFIG.observation;
                    return (
                      <Badge key={cc.category} color={cfg.color} variant="soft" size="1">
                        {cfg.label}: {cc.count}
                      </Badge>
                    );
                  })}
                </Flex>
              )}
            </Flex>
          </Card>
        )}

        {/* Entry form */}
        <MemoryEntryForm protocols={protocols} />

        {/* Empty state */}
        {isEmpty && (
          <Card>
            <Flex direction="column" align="center" gap="3" py="8">
              <BrainCircuit size={48} style={{ color: "var(--gray-8)" }} />
              <Heading size="3" color="gray">No memory entries yet</Heading>
              <Text size="2" color="gray" align="center" style={{ maxWidth: 400 }}>
                Start tracking your memory by logging entries above. Record scores for
                short-term, long-term, and working memory to monitor your cognitive health over time.
              </Text>
            </Flex>
          </Card>
        )}

        {/* Timeline */}
        {entries.length > 0 && (
          <Flex direction="column" gap="2">
            <Text size="2" weight="medium" color="gray">Timeline</Text>
            {entries.map((entry) => {
              const cfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.observation;
              const linkedProtocol = entry.protocolId
                ? protocols.find((p) => p.id === entry.protocolId)
                : null;

              return (
                <Card key={entry.id} variant="surface">
                  <Flex justify="between" align="start">
                    <Flex direction="column" gap="2" style={{ flex: 1 }}>
                      <Flex align="center" gap="2" wrap="wrap">
                        <Text size="1" color="gray">
                          {new Date(entry.loggedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                        <Badge color={cfg.color} variant="soft" size="1">{cfg.label}</Badge>
                        {entry.context && (
                          <Badge color="gray" variant="outline" size="1">{entry.context}</Badge>
                        )}
                        {linkedProtocol && (
                          <Badge color="indigo" variant="outline" size="1">
                            {linkedProtocol.name}
                          </Badge>
                        )}
                      </Flex>
                      {/* Scores row */}
                      <Flex gap="3" wrap="wrap">
                        {SCORE_FIELDS.map((f) => {
                          const val = entry[f.key];
                          if (val === null) return null;
                          return (
                            <Text key={f.key} size="1">
                              <Text size="1" color="gray">{f.label}: </Text>
                              <Text size="1" weight="medium">{val.toFixed(1)}</Text>
                            </Text>
                          );
                        })}
                      </Flex>
                      {entry.description && (
                        <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
                          {entry.description}
                        </Text>
                      )}
                    </Flex>
                    <DeleteConfirmButton
                      action={deleteMemoryEntry.bind(null, entry.id)}
                      description="This memory entry will be permanently deleted."
                    />
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        )}
      </Flex>

      {/* Sidebar */}
      <Flex direction="column" gap="4">
        {/* Baseline */}
        <Card>
          <Flex direction="column" gap="3">
            <Text size="2" weight="medium">Memory Baseline</Text>
            {baseline ? (
              <Flex direction="column" gap="2">
                {SCORE_FIELDS.map((f) => (
                  <ScoreBar
                    key={f.key}
                    label={f.label}
                    score={baselineScores?.[f.key] ?? null}
                    color={f.color}
                  />
                ))}
                <Text size="1" color="gray">
                  Set {new Date(baseline.recordedAt).toLocaleDateString()}
                </Text>
              </Flex>
            ) : (
              <Text size="1" color="gray">No baseline recorded. Set your starting scores to track progress.</Text>
            )}
            <BaselineForm existing={baselineScores} />
          </Flex>
        </Card>

        {/* Progress — latest entry vs baseline */}
        {baseline && latestEntry && (
          <Card>
            <Flex direction="column" gap="3">
              <Text size="2" weight="medium">Progress</Text>
              <Flex direction="column" gap="2">
                {SCORE_FIELDS.map((f) => {
                  const base = baselineScores?.[f.key];
                  const latest = latestEntry[f.key];
                  if (base === null || base === undefined || latest === null || latest === undefined) return null;
                  const delta = latest - base;
                  return (
                    <Flex key={f.key} justify="between" align="center">
                      <Text size="1" color="gray">{f.label}</Text>
                      <Badge
                        color={delta > 0 ? "green" : delta < 0 ? "red" : "gray"}
                        variant="soft"
                        size="1"
                      >
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </Badge>
                    </Flex>
                  );
                })}
                <Text size="1" color="gray">
                  Latest: {new Date(latestEntry.loggedAt).toLocaleDateString()}
                </Text>
              </Flex>
            </Flex>
          </Card>
        )}

        {/* Protocol memory scores */}
        {protocolScores.some((p) => p.latestMemory !== null) && (
          <Card>
            <Flex direction="column" gap="3">
              <Text size="2" weight="medium">Protocol Check-in Scores</Text>
              <Text size="1" color="gray">Memory scores from your protocol cognitive check-ins.</Text>
              <Flex direction="column" gap="2">
                {protocolScores.map((p) => {
                  if (p.latestMemory === null) return null;
                  const delta = p.baselineMemory !== null ? p.latestMemory - p.baselineMemory : null;
                  return (
                    <Flex key={p.protocolId} justify="between" align="center">
                      <Link
                        href={`/protocols/${p.protocolSlug}`}
                        className={css({
                          textDecoration: "none",
                          color: "var(--indigo-11)",
                          fontSize: "var(--font-size-2)",
                          "&:hover": { textDecoration: "underline" },
                        })}
                      >
                        {p.protocolName}
                      </Link>
                      <Flex align="center" gap="2">
                        <Text size="1" weight="medium">{p.latestMemory.toFixed(1)}</Text>
                        {delta !== null && (
                          <Badge
                            color={delta > 0 ? "green" : delta < 0 ? "red" : "gray"}
                            variant="soft"
                            size="1"
                          >
                            {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                          </Badge>
                        )}
                      </Flex>
                    </Flex>
                  );
                })}
              </Flex>
            </Flex>
          </Card>
        )}
      </Flex>
    </div>
  );
}
