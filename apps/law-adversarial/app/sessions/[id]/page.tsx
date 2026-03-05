import { createClient } from "@/lib/supabase/server";
import { getDemoSession, getDemoFindings, getDemoAuditTrail } from "@/lib/demo-data";
import { notFound } from "next/navigation";
import {
  Badge,
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Separator,
  Tabs,
  Text,
} from "@radix-ui/themes";
import { deleteSession } from "../actions";
import { RunAnalysisButton, SessionLive } from "./session-live";

const severityColor: Record<string, "gray" | "orange" | "red" | "crimson"> = {
  low: "gray",
  medium: "orange",
  high: "red",
  critical: "crimson",
};

const severityCss: Record<string, string> = {
  critical: "var(--crimson-9)",
  high: "var(--red-9)",
  medium: "var(--orange-9)",
  low: "var(--gray-8)",
};

const agentColor: Record<string, "red" | "blue" | "purple" | "gray"> = {
  attacker: "red",
  defender: "blue",
  judge: "purple",
  system: "gray",
};

const agentCss: Record<string, string> = {
  attacker: "var(--red-9)",
  defender: "var(--blue-9)",
  judge: "var(--purple-9)",
  system: "var(--gray-9)",
};

function scoreColor(score: number) {
  if (score >= 70) return "var(--green-9)";
  if (score >= 50) return "var(--amber-9)";
  return "var(--crimson-9)";
}

function scoreLabel(score: number) {
  if (score >= 80) return "Ready for filing";
  if (score >= 70) return "Needs revision";
  if (score >= 50) return "Major revision required";
  return "Seriously flawed";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupByRound(findings: any[]): Record<number, any[]> {
  const map: Record<number, unknown[]> = {};
  for (const f of findings) {
    const r = f.round ?? 0;
    (map[r] ??= []).push(f);
  }
  return map;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const sessionResult = await supabase
    .from("stress_test_sessions")
    .select("*")
    .eq("slug", id)
    .single();

  // Fall back to demo data when DB has no matching row
  const demoSession = getDemoSession(id);

  if ((sessionResult.error || !sessionResult.data) && !demoSession) notFound();

  const stressSession = sessionResult.data ?? demoSession!;
  const sessionId = stressSession.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let findings: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let auditTrail: any[];

  if (sessionResult.data) {
    const [findingsResult, auditResult] = await Promise.all([
      supabase
        .from("findings")
        .select("*")
        .eq("session_id", sessionId)
        .order("severity", { ascending: false }),
      supabase
        .from("audit_trail")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
    ]);
    findings = findingsResult.data ?? [];
    auditTrail = auditResult.data ?? [];
  } else {
    findings = getDemoFindings(id);
    auditTrail = getDemoAuditTrail(id);
  }

  const isCompleted = stressSession.status === "completed";
  const isPending = stressSession.status === "pending";
  const isRunning = stressSession.status === "running";

  const rounds = groupByRound(findings);
  const roundNumbers = Object.keys(rounds).map(Number).sort((a, b) => a - b);

  const score = stressSession.overall_score ?? 0;
  const color = scoreColor(score);

  const sevCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1;
  const totalFindings = findings.length || 1;

  return (
    <Box py="8" style={{ maxWidth: 860, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        {/* ===== HEADER ===== */}
        <Flex gap="6" align="start" wrap="wrap">
          {/* Score ring (only when completed) */}
          {isCompleted && stressSession.overall_score != null && (
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                border: `6px solid ${color}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 0 24px color-mix(in srgb, ${color} 25%, transparent)`,
              }}
            >
              <Text size="7" weight="bold" style={{ color, lineHeight: 1 }}>
                {Math.round(score)}
              </Text>
              <Text size="1" color="gray" style={{ marginTop: 2 }}>
                / 100
              </Text>
            </div>
          )}

          <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
            <Flex justify="between" align="start">
              <Heading size="7" style={{ lineHeight: 1.15 }}>
                {stressSession.brief_title}
              </Heading>
            </Flex>

            <Flex gap="2" align="center" wrap="wrap">
              {stressSession.jurisdiction && (
                <Badge size="2" variant="surface" color="blue">
                  {stressSession.jurisdiction}
                </Badge>
              )}
              <Badge size="2" variant="soft" color={
                isPending ? "gray" : isRunning ? "blue" : isCompleted ? "green" : "red"
              }>
                {stressSession.status}
              </Badge>
            </Flex>

            {isCompleted && (
              <Flex gap="3" align="center" wrap="wrap">
                <Text size="3" weight="medium" style={{ color }}>
                  {scoreLabel(score)}
                </Text>
                <Text size="1" color="gray">
                  {findings.length} finding{findings.length !== 1 ? "s" : ""} across{" "}
                  {roundNumbers.length} round{roundNumbers.length !== 1 ? "s" : ""}
                </Text>
              </Flex>
            )}

            <Text size="1" color="gray">
              Created {new Date(stressSession.created_at).toLocaleString()}
              {stressSession.completed_at &&
                ` | Completed ${new Date(stressSession.completed_at).toLocaleString()}`}
            </Text>
          </Flex>
        </Flex>

        {/* ===== RUN ANALYSIS (pending) ===== */}
        {isPending && (
          <div className="no-print">
            <Separator size="4" />
            <Flex direction="column" gap="3">
              <Heading size="4">Run Analysis</Heading>
              {stressSession.brief_text ? (
                <RunAnalysisButton sessionId={sessionId} />
              ) : (
                <Text size="2" color="red">
                  No brief text available. Go back and paste text or upload a document.
                </Text>
              )}
            </Flex>
          </div>
        )}

        {/* ===== LIVE FEED (running) ===== */}
        {isRunning && (
          <div className="no-print">
            <Separator size="4" />
            <SessionLive sessionId={sessionId} />
          </div>
        )}

        {/* ===== SEVERITY DISTRIBUTION (completed) ===== */}
        {isCompleted && findings.length > 0 && (
          <>
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" color="gray">
                Finding Severity Distribution
              </Text>
              <div style={{ display: "flex", width: "100%", height: 28, borderRadius: 6, overflow: "hidden" }}>
                {(["critical", "high", "medium", "low"] as const).map(
                  (sev) =>
                    sevCounts[sev] > 0 && (
                      <div
                        key={sev}
                        style={{
                          width: `${(sevCounts[sev] / totalFindings) * 100}%`,
                          backgroundColor: severityCss[sev],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 32,
                        }}
                      >
                        <Text size="1" weight="bold" style={{ color: "white", textTransform: "uppercase", fontSize: 10 }}>
                          {sevCounts[sev]}
                        </Text>
                      </div>
                    ),
                )}
              </div>
              <Flex gap="4">
                {(["critical", "high", "medium", "low"] as const).map((sev) => (
                  <Flex key={sev} gap="1" align="center">
                    <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: severityCss[sev] }} />
                    <Text size="1" color="gray">{sev} ({sevCounts[sev]})</Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
            <Separator size="4" />
          </>
        )}

        {/* ===== TABS ===== */}
        <Tabs.Root defaultValue="findings">
          <Tabs.List size="2">
            <Tabs.Trigger value="findings">Findings ({findings.length})</Tabs.Trigger>
            <Tabs.Trigger value="timeline">Timeline ({auditTrail.length})</Tabs.Trigger>
          </Tabs.List>

          {/* FINDINGS TAB */}
          <Tabs.Content value="findings">
            <Flex direction="column" gap="5" pt="4">
              {findings.length === 0 ? (
                <Text size="2" color="gray">
                  {isPending ? "Start the analysis to generate findings." : "No findings yet."}
                </Text>
              ) : (
                roundNumbers.map((r) => (
                  <Flex key={r} direction="column" gap="3">
                    <Flex gap="2" align="center">
                      <div style={{ width: 32, height: 32, borderRadius: "50%", backgroundColor: "var(--accent-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Text size="2" weight="bold" color="gray">{r}</Text>
                      </div>
                      <Heading size="4">Round {r}</Heading>
                      <Badge variant="outline" size="1">{rounds[r].length} finding{rounds[r].length !== 1 ? "s" : ""}</Badge>
                    </Flex>
                    <Grid columns="1" gap="3">
                      {rounds[r].map((f: Record<string, unknown>) => (
                        <Card key={f.id as string}>
                          <Flex direction="column" gap="3">
                            <Flex gap="2" align="center" wrap="wrap">
                              <Badge color={severityColor[f.severity as string] ?? "gray"} size="2">{f.severity as string}</Badge>
                              <Badge variant="outline" size="1">{f.type as string}</Badge>
                              {f.confidence != null && (
                                <Text size="1" weight="medium" style={{ backgroundColor: "var(--accent-3)", padding: "2px 8px", borderRadius: 4 }}>
                                  {((f.confidence as number) * 100).toFixed(0)}% confidence
                                </Text>
                              )}
                            </Flex>
                            <Text size="2" style={{ lineHeight: 1.6 }}>{f.description as string}</Text>
                            {typeof f.suggested_fix === "string" && (
                              <div style={{ backgroundColor: "var(--green-2)", border: "1px solid var(--green-5)", borderRadius: 6, padding: "10px 14px" }}>
                                <Text size="1" weight="bold" style={{ color: "var(--green-11)" }}>Suggested Fix</Text>
                                <Text as="p" size="2" style={{ color: "var(--green-11)", marginTop: 4, lineHeight: 1.5 }}>{f.suggested_fix as string}</Text>
                              </div>
                            )}
                          </Flex>
                        </Card>
                      ))}
                    </Grid>
                    {r !== roundNumbers[roundNumbers.length - 1] && <Separator size="4" style={{ opacity: 0.4 }} />}
                  </Flex>
                ))
              )}
            </Flex>
          </Tabs.Content>

          {/* TIMELINE TAB */}
          <Tabs.Content value="timeline">
            <Flex direction="column" gap="0" pt="4" style={{ position: "relative" }}>
              {auditTrail.length === 0 ? (
                <Text size="2" color="gray">No audit entries yet.</Text>
              ) : (
                <>
                  <div style={{ position: "absolute", left: 18, top: 16, bottom: 16, width: 2, backgroundColor: "var(--gray-5)" }} />
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {auditTrail.map((entry: any, i: number) => {
                    const dotColor = agentCss[entry.agent] ?? "var(--gray-9)";
                    return (
                      <Flex key={entry.id} gap="4" style={{ paddingBottom: i === auditTrail.length - 1 ? 0 : 24, position: "relative" }}>
                        <div style={{ width: 38, display: "flex", justifyContent: "center", flexShrink: 0, zIndex: 1 }}>
                          <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: dotColor, border: "3px solid var(--color-background)", marginTop: 4 }} />
                        </div>
                        <Card style={{ flex: 1 }} size="1">
                          <Flex direction="column" gap="1">
                            <Flex gap="2" align="center" wrap="wrap">
                              <Badge color={agentColor[entry.agent] ?? "gray"} size="2" variant="soft">{entry.agent}</Badge>
                              <Badge variant="outline" size="1">{entry.action.replace(/_/g, " ")}</Badge>
                              {entry.round != null && <Badge variant="surface" size="1" color="gray">Round {entry.round}</Badge>}
                            </Flex>
                            {entry.output_summary && <Text size="2" style={{ lineHeight: 1.5 }}>{entry.output_summary}</Text>}
                          </Flex>
                        </Card>
                      </Flex>
                    );
                  })}
                </>
              )}
            </Flex>
          </Tabs.Content>

        </Tabs.Root>
      </Flex>
    </Box>
  );
}
