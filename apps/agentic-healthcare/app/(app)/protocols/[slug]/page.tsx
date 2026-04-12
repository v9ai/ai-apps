import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import {
  brainHealthProtocols,
  protocolSupplements,
  cognitiveBaselines,
  cognitiveCheckIns,
  researches,
} from "@/lib/db/schema";
import { and, eq, asc, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { Box, Badge, Card, Callout, Flex, Heading, Separator, Skeleton, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Suspense } from "react";
import { Brain, Pill, BarChart3, AlertTriangle, ExternalLink, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { MarkdownProse } from "@/components/markdown-prose";
import { deleteProtocol, deleteSupplement, updateProtocolStatus } from "../actions";
import { DeleteConfirmButton } from "@/components/delete-confirm-button";
import { AddSupplementForm } from "../add-supplement-form";
import { BaselineForm, CheckInForm } from "../cognitive-form";
import { css } from "styled-system/css";

const twoColClass = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "5",
  "@media (min-width: 900px)": {
    gridTemplateColumns: "1fr 360px",
  },
});

const supplementGrid = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "2",
});

const MECHANISM_LABELS: Record<string, { label: string; color: "blue" | "green" | "orange" | "violet" | "cyan" | "pink" | "amber" }> = {
  CHOLINERGIC: { label: "Cholinergic", color: "blue" },
  ANTIOXIDANT: { label: "Antioxidant", color: "green" },
  ANTI_INFLAMMATORY: { label: "Anti-inflammatory", color: "orange" },
  MITOCHONDRIAL: { label: "Mitochondrial", color: "violet" },
  NEUROTROPHIC: { label: "Neurotrophic", color: "cyan" },
  EPIGENETIC: { label: "Epigenetic", color: "pink" },
  HORMONAL: { label: "Hormonal", color: "amber" },
};

const AREA_LABELS: Record<string, string> = {
  MEMORY: "Memory",
  FOCUS: "Focus",
  PROCESSING_SPEED: "Processing",
  NEUROPLASTICITY: "Neuroplasticity",
  NEUROPROTECTION: "Neuroprotection",
  MOOD_REGULATION: "Mood",
  SLEEP_QUALITY: "Sleep",
};

const SCORE_FIELDS = [
  { key: "memoryScore", label: "Memory", color: "var(--indigo-9)" },
  { key: "focusScore", label: "Focus", color: "var(--cyan-9)" },
  { key: "processingSpeedScore", label: "Processing", color: "var(--violet-9)" },
  { key: "moodScore", label: "Mood", color: "var(--amber-9)" },
  { key: "sleepScore", label: "Sleep", color: "var(--blue-9)" },
] as const;

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

async function ProtocolDetail({ slug }: { slug: string }) {
  const { userId } = await withAuth();

  const [protocol] = await db
    .select()
    .from(brainHealthProtocols)
    .where(eq(brainHealthProtocols.slug, slug));

  if (!protocol || protocol.userId !== userId) notFound();

  const id = protocol.id;

  const supplements = await db
    .select()
    .from(protocolSupplements)
    .where(eq(protocolSupplements.protocolId, id))
    .orderBy(asc(protocolSupplements.name));

  const [baseline] = await db
    .select()
    .from(cognitiveBaselines)
    .where(eq(cognitiveBaselines.protocolId, id));

  const checkIns = await db
    .select()
    .from(cognitiveCheckIns)
    .where(eq(cognitiveCheckIns.protocolId, id))
    .orderBy(desc(cognitiveCheckIns.recordedAt));

  const [research] = await db
    .select()
    .from(researches)
    .where(and(eq(researches.type, "protocol"), eq(researches.entityId, id)))
    .orderBy(desc(researches.createdAt))
    .limit(1);

  const targetAreas = (protocol.targetAreas as string[]) || [];
  const statusColor = protocol.status === "active" ? "indigo" : protocol.status === "paused" ? "amber" : "green";

  const baselineScores = baseline
    ? {
        memoryScore: baseline.memoryScore,
        focusScore: baseline.focusScore,
        processingSpeedScore: baseline.processingSpeedScore,
        moodScore: baseline.moodScore,
        sleepScore: baseline.sleepScore,
      }
    : null;

  return (
    <div className={twoColClass}>
      {/* Main column */}
      <Flex direction="column" gap="5">
        {/* Header */}
        <Card>
          <Flex justify="between" align="start">
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <Brain size={20} style={{ color: "var(--indigo-11)" }} />
                <Heading size="5">{protocol.name}</Heading>
              </Flex>
              <Flex align="center" gap="2" wrap="wrap">
                <Badge color={statusColor} variant="soft">{protocol.status}</Badge>
                {targetAreas.map((a) => (
                  <Badge key={a} color="gray" variant="outline" size="1">
                    {AREA_LABELS[a] || a}
                  </Badge>
                ))}
              </Flex>
              {protocol.notes && (
                <Text size="2" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                  {protocol.notes}
                </Text>
              )}
              <Flex align="center" gap="3">
                {protocol.startDate && (
                  <Text size="1" color="gray">
                    Started {new Date(protocol.startDate).toLocaleDateString()}
                  </Text>
                )}
                <Text size="1" color="gray">
                  Created {protocol.createdAt.toLocaleDateString()}
                </Text>
              </Flex>
            </Flex>
            <DeleteConfirmButton
              action={async () => {
                "use server";
                await deleteProtocol(id);
                redirect("/protocols");
              }}
              description="This protocol and all its data will be permanently deleted."
              variant="icon-red"
            />
          </Flex>
        </Card>

        {/* Supplements */}
        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Pill size={16} style={{ color: "var(--indigo-11)" }} />
              <Heading size="3">Supplements</Heading>
              <Badge color="indigo" variant="soft" size="1">{supplements.length}</Badge>
            </Flex>

            {supplements.length === 0 ? (
              <Callout.Root color="gray">
                <Callout.Text>No supplements added yet.</Callout.Text>
              </Callout.Root>
            ) : (
              <div className={supplementGrid}>
                {supplements.map((s) => {
                  const mech = s.mechanism ? MECHANISM_LABELS[s.mechanism] : null;
                  const areas = (s.targetAreas as string[]) || [];
                  return (
                    <Card key={s.id} variant="surface">
                      <Flex justify="between" align="start">
                        <Flex direction="column" gap="1">
                          {s.url ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                              <Flex align="center" gap="1">
                                <Text size="2" weight="medium" color="indigo">{s.name}</Text>
                                <ExternalLink size={12} style={{ color: "var(--gray-8)" }} />
                              </Flex>
                            </a>
                          ) : (
                            <Text size="2" weight="medium">{s.name}</Text>
                          )}
                          <Text size="1" color="indigo">
                            {s.dosage} &middot; {s.frequency}
                          </Text>
                          <Flex gap="1" wrap="wrap">
                            {mech && (
                              <Badge color={mech.color} variant="soft" size="1">
                                {mech.label}
                              </Badge>
                            )}
                            {areas.map((a) => (
                              <Badge key={a} color="gray" variant="outline" size="1">
                                {AREA_LABELS[a] || a}
                              </Badge>
                            ))}
                          </Flex>
                          {s.notes && <Text size="1" color="gray">{s.notes}</Text>}
                        </Flex>
                        <DeleteConfirmButton
                          action={deleteSupplement.bind(null, s.id, id)}
                          description="This supplement will be removed from the protocol."
                          stopPropagation
                        />
                      </Flex>
                    </Card>
                  );
                })}
              </div>
            )}

            <AddSupplementForm protocolId={id} />
          </Flex>
        </Card>

        {/* Research */}
        {research && research.status === "completed" && (
          <Card>
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <BookOpen size={16} style={{ color: "var(--indigo-11)" }} />
                <Heading size="3">Research</Heading>
                <Badge color="green" variant="soft" size="1">
                  {research.supplementCount} supplements · {(Number(research.durationMs) / 1000).toFixed(0)}s
                </Badge>
              </Flex>

              {research.synthesis && (
                <Card variant="surface">
                  <Flex direction="column" gap="2">
                    <Text size="2" weight="medium" color="indigo">Synthesis</Text>
                    <MarkdownProse content={research.synthesis} />
                  </Flex>
                </Card>
              )}

              {Array.isArray(research.supplementFindings) &&
                (research.supplementFindings as Array<{ supplement_name: string; findings: string }>).length > 0 && (
                <Flex direction="column" gap="2">
                  <Text size="2" weight="medium" color="gray">Per-Supplement Findings</Text>
                  {(research.supplementFindings as Array<{ supplement_name: string; findings: string }>).map(
                    (sf, i) => (
                      <details key={i}>
                        <summary
                          className={css({
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            background: "var(--gray-a2)",
                            fontSize: "13px",
                            fontWeight: 500,
                            color: "var(--gray-12)",
                            listStyle: "none",
                            "&::-webkit-details-marker": { display: "none" },
                            "&::marker": { display: "none" },
                            _hover: { background: "var(--gray-a3)" },
                          })}
                        >
                          {sf.supplement_name}
                        </summary>
                        <div
                          className={css({
                            padding: "12px",
                            maxHeight: "400px",
                            overflow: "auto",
                          })}
                        >
                          <MarkdownProse content={sf.findings} />
                        </div>
                      </details>
                    ),
                  )}
                </Flex>
              )}

              <Text size="1" color="gray">
                Researched {research.createdAt.toLocaleDateString()}
              </Text>
            </Flex>
          </Card>
        )}

        {/* Check-ins timeline */}
        <Card>
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <BarChart3 size={16} style={{ color: "var(--indigo-11)" }} />
              <Heading size="3">Cognitive Check-ins</Heading>
              <Badge color="indigo" variant="soft" size="1">{checkIns.length}</Badge>
            </Flex>

            {checkIns.length === 0 ? (
              <Callout.Root color="gray">
                <Callout.Text>No check-ins recorded yet. Track your cognitive progress over time.</Callout.Text>
              </Callout.Root>
            ) : (
              <Flex direction="column" gap="2">
                {checkIns.map((c) => (
                  <Card key={c.id} variant="surface">
                    <Flex direction="column" gap="2">
                      <Text size="1" color="gray" weight="medium">
                        {c.recordedAt.toLocaleDateString()} {c.recordedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                      <Flex gap="3" wrap="wrap">
                        {SCORE_FIELDS.map(({ key, label }) => {
                          const val = c[key];
                          return val !== null ? (
                            <Flex key={key} align="center" gap="1">
                              <Text size="1" color="gray">{label}:</Text>
                              <Text size="1" weight="medium">{val.toFixed(1)}</Text>
                            </Flex>
                          ) : null;
                        })}
                      </Flex>
                      {c.sideEffects && (
                        <Flex align="center" gap="1">
                          <AlertTriangle size={12} style={{ color: "var(--amber-9)" }} />
                          <Text size="1" color="amber">{c.sideEffects}</Text>
                        </Flex>
                      )}
                      {c.notes && <Text size="1" color="gray">{c.notes}</Text>}
                    </Flex>
                  </Card>
                ))}
              </Flex>
            )}

            <CheckInForm protocolId={id} />
          </Flex>
        </Card>
      </Flex>

      {/* Sidebar */}
      <Flex direction="column" gap="4">
        {/* Baseline */}
        <Card>
          <Flex direction="column" gap="3">
            <Heading size="3">Cognitive Baseline</Heading>
            {baseline ? (
              <Flex direction="column" gap="2">
                {SCORE_FIELDS.map(({ key, label, color }) => (
                  <ScoreBar key={key} label={label} score={baseline[key]} color={color} />
                ))}
                <Text size="1" color="gray">
                  Recorded {baseline.recordedAt.toLocaleDateString()}
                </Text>
              </Flex>
            ) : (
              <Text size="1" color="gray">
                No baseline recorded. Set your starting scores to track progress.
              </Text>
            )}
            <BaselineForm protocolId={id} existing={baselineScores} />
          </Flex>
        </Card>

        {/* Latest check-in vs baseline */}
        {baseline && checkIns.length > 0 && (
          <Card>
            <Flex direction="column" gap="3">
              <Heading size="3">Progress</Heading>
              <Flex direction="column" gap="2">
                {SCORE_FIELDS.map(({ key, label, color }) => {
                  const baseVal = baseline[key];
                  const latestVal = checkIns[0][key];
                  if (baseVal === null || latestVal === null) return null;
                  const diff = latestVal - baseVal;
                  const diffColor = diff > 0 ? "green" : diff < 0 ? "red" : "gray";
                  return (
                    <Flex key={key} justify="between" align="center">
                      <Text size="1" color="gray">{label}</Text>
                      <Flex align="center" gap="2">
                        <Text size="1" color="gray">{baseVal.toFixed(1)}</Text>
                        <Text size="1" color="gray">&rarr;</Text>
                        <Text size="1" weight="medium">{latestVal.toFixed(1)}</Text>
                        <Badge color={diffColor} variant="soft" size="1">
                          {diff > 0 ? "+" : ""}{diff.toFixed(1)}
                        </Badge>
                      </Flex>
                    </Flex>
                  );
                })}
                <Text size="1" color="gray">
                  Latest: {checkIns[0].recordedAt.toLocaleDateString()}
                </Text>
              </Flex>
            </Flex>
          </Card>
        )}
      </Flex>
    </div>
  );
}

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Box py="6">
      <Flex direction="column" gap="5">
        <Text size="2" asChild>
          <Link href="/protocols" style={{ color: "var(--gray-9)" }}>
            &larr; Back to protocols
          </Link>
        </Text>
        <Suspense fallback={
          <Flex direction="column" gap="4">
            <Card>
              <Flex direction="column" gap="3">
                <Skeleton height="32px" width="300px" />
                <Skeleton height="16px" width="200px" />
              </Flex>
            </Card>
            <Card><Skeleton height="200px" /></Card>
          </Flex>
        }>
          <ProtocolDetail slug={slug} />
        </Suspense>
      </Flex>
    </Box>
  );
}
