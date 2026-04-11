import { Box, Badge, Card, Callout, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Sparkles, AlertTriangle, Clock, Pill, FlaskConical, Shield, BookOpen } from "lucide-react";
import { css } from "styled-system/css";
import { db } from "@/lib/db";
import { protocolResearches } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { MarkdownProse } from "@/components/markdown-prose";
import {
  NUTRITIONAL_MARKERS,
  DHT_TREATMENT_TIERS,
  DHT_TIMELINE,
  ENDOCRINE_MARKERS,
  AUTOIMMUNE_MARKERS,
  DAILY_STACK,
  RETEST_SCHEDULE,
  HAIR_CARE_PROTOCOL_ID,
} from "./data";
import type { BloodMarker } from "./data";

// ── Styles ───────────────────────────────────────────────────────

const twoColClass = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "5",
  "@media (min-width: 900px)": {
    gridTemplateColumns: "1fr 360px",
  },
});

const markerGridClass = css({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: "3",
});

const summaryClass = css({
  cursor: "pointer",
  padding: "12px 16px",
  borderRadius: "var(--radius-3)",
  background: "var(--gray-a2)",
  fontSize: "15px",
  fontWeight: 600,
  color: "var(--gray-12)",
  listStyle: "none",
  "&::-webkit-details-marker": { display: "none" },
  "&::marker": { display: "none" },
  _hover: { background: "var(--gray-a3)" },
  display: "flex",
  alignItems: "center",
  gap: "var(--space-3)",
});

const detailsContentClass = css({
  padding: "var(--space-4) 0",
});

const tierCardClass = css({
  borderLeft: "3px solid var(--amber-9)",
});

const timelineCardClass = css({
  borderLeft: "3px solid var(--indigo-9)",
});

const stackGroupClass = css({
  padding: "var(--space-3) var(--space-4)",
  borderTop: "1px solid var(--gray-a4)",
  "&:first-child": { borderTop: "none" },
});

const stackTimingClass = css({
  fontSize: "var(--font-size-1)",
  fontWeight: 600,
  color: "var(--indigo-11)",
  marginBottom: "var(--space-2)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2)",
});

const retestRowClass = css({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--space-2)",
  padding: "var(--space-2) 0",
  borderTop: "1px solid var(--gray-a3)",
  "&:first-child": { borderTop: "none" },
  "@media (max-width: 640px)": {
    gridTemplateColumns: "1fr",
  },
});

// ── Components ───────────────────────────────────────────────────

function MarkerCard({ marker, color }: { marker: BloodMarker; color: "green" | "amber" | "violet" | "red" }) {
  return (
    <Card variant="surface">
      <Flex direction="column" gap="2">
        <Flex align="center" gap="2">
          <Text size="2" weight="bold">{marker.name}</Text>
          <Badge color={color} variant="soft" size="1">{marker.threshold}</Badge>
        </Flex>

        {marker.treatments.length > 0 && (
          <Flex direction="column" gap="1">
            {marker.treatments.map((t, i) => (
              <Flex key={i} direction="column" gap="0">
                <Flex align="center" gap="2">
                  <Text size="2" weight="medium" color="indigo">{t.name}</Text>
                  <Text size="1" color="gray">{t.dosage}</Text>
                </Flex>
                <Text size="1" color="gray">{t.timing}</Text>
                {t.notes && <Text size="1" color="amber">{t.notes}</Text>}
              </Flex>
            ))}
          </Flex>
        )}

        <Flex align="center" gap="1">
          <Clock size={12} style={{ color: "var(--gray-8)" }} />
          <Text size="1" color="gray">Retest: {marker.retestInterval}</Text>
        </Flex>

        {marker.clinicalNotes.length > 0 && (
          <Flex direction="column" gap="1">
            {marker.clinicalNotes.map((note, i) => (
              <Text key={i} size="1" color="gray" style={{ lineHeight: 1.5 }}>
                {note}
              </Text>
            ))}
          </Flex>
        )}
      </Flex>
    </Card>
  );
}

// ── Research Section ─────────────────────────────────────────────

async function ResearchSection() {
  const [research] = await db
    .select()
    .from(protocolResearches)
    .where(eq(protocolResearches.protocolId, HAIR_CARE_PROTOCOL_ID))
    .orderBy(desc(protocolResearches.createdAt))
    .limit(1);

  if (!research || research.status !== "completed") return null;

  return (
    <Card>
      <Flex direction="column" gap="3">
        <Flex align="center" gap="2">
          <BookOpen size={16} style={{ color: "var(--indigo-11)" }} />
          <Heading size="3">Research</Heading>
          <Badge color="green" variant="soft" size="1">
            {research.supplementCount} topics &middot; {(Number(research.durationMs) / 1000).toFixed(0)}s
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
            <Text size="2" weight="medium" color="gray">Per-Topic Findings</Text>
            {(research.supplementFindings as Array<{ supplement_name: string; findings: string }>).map(
              (sf, i) => (
                <details key={i}>
                  <summary className={summaryClass}>
                    {sf.supplement_name}
                  </summary>
                  <div
                    className={css({
                      padding: "12px",
                      maxHeight: "500px",
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
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function HairCareProtocolPage() {
  return (
    <Box py="6">
      <Flex direction="column" gap="5">
        <Text size="2" asChild>
          <Link href="/protocols" style={{ color: "var(--gray-9)" }}>
            &larr; Back to protocols
          </Link>
        </Text>

        <div className={twoColClass}>
          {/* ── Main Column ─────────────────────────────────── */}
          <Flex direction="column" gap="5">
            {/* Header */}
            <Card>
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Sparkles size={20} style={{ color: "var(--indigo-11)" }} />
                  <Heading size="5">Hair Care Protocol</Heading>
                  <Badge color="indigo" variant="soft">Reference</Badge>
                </Flex>
                <Text size="2" color="gray">
                  Blood-test-driven hair restoration protocol. Act on each result below based on your lab work.
                  Inspired by Bryan Johnson&apos;s evidence-based approach.
                </Text>
              </Flex>
            </Card>

            {/* Disclaimer */}
            <Callout.Root color="amber">
              <Callout.Icon>
                <AlertTriangle size={16} />
              </Callout.Icon>
              <Callout.Text>
                This is a reference guide, not medical advice. Always consult with a healthcare provider before starting
                any supplement or treatment protocol. Individual results depend on your specific blood work.
              </Callout.Text>
            </Callout.Root>

            {/* Quick-reference anchors */}
            <Flex gap="2" wrap="wrap">
              <a href="#nutritional"><Badge color="green" variant="soft" size="2">Nutritional (6)</Badge></a>
              <a href="#dht"><Badge color="amber" variant="soft" size="2">DHT / Hormonal</Badge></a>
              <a href="#endocrine"><Badge color="violet" variant="soft" size="2">Endocrine (3)</Badge></a>
              <a href="#autoimmune"><Badge color="red" variant="soft" size="2">Autoimmune</Badge></a>
            </Flex>

            <Separator size="4" />

            {/* ── Nutritional Deficiencies ────────────────── */}
            <details id="nutritional" open>
              <summary className={summaryClass}>
                <FlaskConical size={16} style={{ color: "var(--green-11)" }} />
                Nutritional Deficiencies
                <Badge color="green" variant="soft" size="1">{NUTRITIONAL_MARKERS.length}</Badge>
              </summary>
              <div className={detailsContentClass}>
                <div className={markerGridClass}>
                  {NUTRITIONAL_MARKERS.map((m) => (
                    <MarkerCard key={m.name} marker={m} color="green" />
                  ))}
                </div>
              </div>
            </details>

            {/* ── DHT / Androgenetic Alopecia ─────────────── */}
            <details id="dht">
              <summary className={summaryClass}>
                <Shield size={16} style={{ color: "var(--amber-11)" }} />
                High DHT / Androgenetic Alopecia
                <Badge color="amber" variant="soft" size="1">Hormonal</Badge>
              </summary>
              <div className={detailsContentClass}>
                <Flex direction="column" gap="4">
                  <Text size="2" color="gray">
                    High DHT confirms androgenetic alopecia. Options from conservative to aggressive:
                  </Text>

                  {/* Treatment tiers */}
                  <Flex direction="column" gap="3">
                    {DHT_TREATMENT_TIERS.map((tier) => (
                      <Card key={tier.tier} variant="surface" className={tierCardClass}>
                        <Flex direction="column" gap="2">
                          <Flex align="center" gap="2">
                            <Badge color="amber" variant="soft" size="1">Tier {tier.tier}</Badge>
                            <Text size="2" weight="bold">{tier.label}</Text>
                          </Flex>
                          <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>{tier.description}</Text>
                          {tier.items.length > 0 && (
                            <Flex direction="column" gap="1">
                              {tier.items.map((item, i) => (
                                <Text key={i} size="1" color="indigo">&bull; {item}</Text>
                              ))}
                            </Flex>
                          )}
                        </Flex>
                      </Card>
                    ))}
                  </Flex>

                  <Separator size="4" />

                  {/* Action timeline */}
                  <Flex direction="column" gap="2">
                    <Flex align="center" gap="2">
                      <Clock size={16} style={{ color: "var(--indigo-11)" }} />
                      <Text size="3" weight="bold">Action Timeline</Text>
                    </Flex>
                    <Flex direction="column" gap="2">
                      {DHT_TIMELINE.map((phase) => (
                        <Card key={phase.period} variant="surface" className={timelineCardClass}>
                          <Flex direction="column" gap="1">
                            <Text size="2" weight="bold" color="indigo">{phase.period}</Text>
                            {phase.actions.map((action, i) => (
                              <Text key={i} size="1" color="gray">&bull; {action}</Text>
                            ))}
                          </Flex>
                        </Card>
                      ))}
                    </Flex>
                  </Flex>
                </Flex>
              </div>
            </details>

            {/* ── Endocrine Markers ───────────────────────── */}
            <details id="endocrine">
              <summary className={summaryClass}>
                <Pill size={16} style={{ color: "var(--violet-11)" }} />
                Endocrine Markers
                <Badge color="violet" variant="soft" size="1">{ENDOCRINE_MARKERS.length}</Badge>
              </summary>
              <div className={detailsContentClass}>
                <div className={markerGridClass}>
                  {ENDOCRINE_MARKERS.map((m) => (
                    <MarkerCard key={m.name} marker={m} color="violet" />
                  ))}
                </div>
              </div>
            </details>

            {/* ── Autoimmune ─────────────────────────────── */}
            <details id="autoimmune">
              <summary className={summaryClass}>
                <AlertTriangle size={16} style={{ color: "var(--red-11)" }} />
                Autoimmune (ANA)
                <Badge color="red" variant="soft" size="1">{AUTOIMMUNE_MARKERS.length}</Badge>
              </summary>
              <div className={detailsContentClass}>
                <div className={markerGridClass}>
                  {AUTOIMMUNE_MARKERS.map((m) => (
                    <MarkerCard key={m.name} marker={m} color="red" />
                  ))}
                </div>
              </div>
            </details>

            {/* ── Research ──────────────────────────────── */}
            <Separator size="4" />
            <ResearchSection />
          </Flex>

          {/* ── Sidebar ─────────────────────────────────────── */}
          <Flex direction="column" gap="4">
            {/* Daily Stack */}
            <Card>
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Pill size={16} style={{ color: "var(--indigo-11)" }} />
                  <Heading size="3">Daily Stack</Heading>
                </Flex>
                <Text size="1" color="gray">
                  Johnson-inspired, adjusted to your blood work results.
                </Text>
                <Separator size="4" />
                {DAILY_STACK.map((group) => (
                  <div key={group.timing} className={stackGroupClass}>
                    <div className={stackTimingClass}>
                      <span>{group.icon}</span> {group.timing}
                    </div>
                    <Flex direction="column" gap="1">
                      {group.items.map((item) => (
                        <Flex key={item.name} justify="between" align="center" gap="2">
                          <Text size="1" weight="medium">{item.name}</Text>
                          <Flex align="center" gap="1" style={{ flexShrink: 0 }}>
                            <Text size="1" color="gray">{item.dosage}</Text>
                            {item.condition && (
                              <Badge color="gray" variant="outline" size="1">{item.condition}</Badge>
                            )}
                          </Flex>
                        </Flex>
                      ))}
                    </Flex>
                  </div>
                ))}
              </Flex>
            </Card>

            {/* Retesting Schedule */}
            <Card>
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Clock size={16} style={{ color: "var(--indigo-11)" }} />
                  <Heading size="3">Retesting</Heading>
                </Flex>
                <Text size="1" color="gray">
                  Retest at 3 months, then every 6 months until stable.
                </Text>
                <Separator size="4" />
                <Flex direction="column">
                  {RETEST_SCHEDULE.map((entry) => (
                    <div key={entry.marker} className={retestRowClass}>
                      <Text size="1" weight="medium">{entry.marker}</Text>
                      <Flex direction="column">
                        <Text size="1" color="gray">{entry.interval}</Text>
                        {entry.notes && <Text size="1" color="amber">{entry.notes}</Text>}
                      </Flex>
                    </div>
                  ))}
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </div>
      </Flex>
    </Box>
  );
}
