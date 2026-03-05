import {
  Box,
  Card,
  Flex,
  Grid,
  Heading,
  Text,
  Badge,
  Separator,
} from "@radix-ui/themes";
import { Shield, AlertTriangle, BarChart3, FileSearch } from "lucide-react";
import Link from "next/link";
import { getDemoSessions, getDemoFindings } from "@/lib/demo-data";

function scoreColor(score: number): string {
  if (score >= 70) return "var(--green-9)";
  if (score >= 50) return "var(--amber-9)";
  return "var(--crimson-9)";
}

function severityColor(
  severity: string
): "crimson" | "red" | "amber" | "gray" {
  switch (severity) {
    case "critical":
      return "crimson";
    case "high":
      return "red";
    case "medium":
      return "amber";
    default:
      return "gray";
  }
}

export default function ProtectedPage() {
  const sessions = getDemoSessions();
  const allFindings = getDemoFindings();

  const totalCases = sessions.length;
  const avgScore = Math.round(
    sessions.reduce((sum, s) => sum + s.overall_score, 0) / sessions.length
  );
  const criticalFindings = allFindings.filter(
    (f) => f.severity === "critical"
  ).length;
  const totalFindings = allFindings.length;

  const criticalAndHigh = allFindings
    .filter((f) => f.severity === "critical" || f.severity === "high")
    .slice(0, 5);

  const sessionMap = Object.fromEntries(sessions.map((s) => [s.id, s]));

  return (
    <Box py="8" style={{ maxWidth: 1100, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size="7">Dashboard</Heading>
          <Text size="2" color="gray">
            Stress-test your legal briefs with adversarial analysis.
          </Text>
        </Flex>

        {/* Stats Row */}
        <Grid columns={{ initial: "2", sm: "4" }} gap="4">
          <Card>
            <Flex direction="column" align="center" gap="1" py="2">
              <Flex align="center" gap="2">
                <FileSearch size={18} />
                <Text size="1" color="gray" weight="medium">
                  Cases Analyzed
                </Text>
              </Flex>
              <Heading size="8">{totalCases}</Heading>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" align="center" gap="1" py="2">
              <Flex align="center" gap="2">
                <BarChart3 size={18} />
                <Text size="1" color="gray" weight="medium">
                  Average Score
                </Text>
              </Flex>
              <Heading size="8">{avgScore}</Heading>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" align="center" gap="1" py="2">
              <Flex align="center" gap="2">
                <AlertTriangle size={18} />
                <Text size="1" color="gray" weight="medium">
                  Critical Findings
                </Text>
              </Flex>
              <Heading size="8" style={{ color: "var(--crimson-9)" }}>
                {criticalFindings}
              </Heading>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" align="center" gap="1" py="2">
              <Flex align="center" gap="2">
                <Shield size={18} />
                <Text size="1" color="gray" weight="medium">
                  Total Findings
                </Text>
              </Flex>
              <Heading size="8">{totalFindings}</Heading>
            </Flex>
          </Card>
        </Grid>

        <Separator size="4" />

        {/* Cases Grid */}
        <Flex direction="column" gap="3">
          <Heading size="5">Cases</Heading>
          <Grid columns={{ initial: "1", md: "2" }} gap="4">
            {sessions.map((session) => {
              const findings = getDemoFindings(session.id);
              const severityCounts = findings.reduce(
                (acc, f) => {
                  acc[f.severity] = (acc[f.severity] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              );

              return (
                <Link
                  key={session.id}
                  href={`/sessions/${session.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card
                    style={{ cursor: "pointer" }}
                    variant="surface"
                  >
                    <Flex direction="column" gap="3">
                      <Flex justify="between" align="start" gap="3">
                        <Flex direction="column" gap="1" style={{ flex: 1 }}>
                          <Heading size="4">{session.brief_title}</Heading>
                          <Badge
                            variant="soft"
                            color="blue"
                            size="1"
                            style={{ alignSelf: "flex-start" }}
                          >
                            {session.jurisdiction}
                          </Badge>
                        </Flex>
                        <Box
                          className="score-ring"
                          style={{
                            "--score-color": scoreColor(session.overall_score),
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            border: `3px solid ${scoreColor(session.overall_score)}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          } as React.CSSProperties}
                        >
                          <Text
                            size="4"
                            weight="bold"
                            style={{ color: scoreColor(session.overall_score) }}
                          >
                            {session.overall_score}
                          </Text>
                        </Box>
                      </Flex>

                      <Flex gap="2" wrap="wrap">
                        {severityCounts.critical && (
                          <Badge color="crimson" variant="soft" size="1">
                            {severityCounts.critical} critical
                          </Badge>
                        )}
                        {severityCounts.high && (
                          <Badge color="red" variant="soft" size="1">
                            {severityCounts.high} high
                          </Badge>
                        )}
                        {severityCounts.medium && (
                          <Badge color="amber" variant="soft" size="1">
                            {severityCounts.medium} medium
                          </Badge>
                        )}
                        {severityCounts.low && (
                          <Badge color="gray" variant="soft" size="1">
                            {severityCounts.low} low
                          </Badge>
                        )}
                      </Flex>

                      <Text size="1" color="gray">
                        {new Date(session.created_at).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </Text>
                    </Flex>
                  </Card>
                </Link>
              );
            })}
          </Grid>
        </Flex>

        <Separator size="4" />

        {/* Recent Critical Findings */}
        <Flex direction="column" gap="3">
          <Heading size="5">Recent Critical Findings</Heading>
          <Flex direction="column" gap="3">
            {criticalAndHigh.map((finding) => {
              const session = sessionMap[finding.session_id];
              return (
                <Link
                  key={finding.id}
                  href={`/sessions/${finding.session_id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Card variant="surface" style={{ cursor: "pointer" }}>
                    <Flex direction="column" gap="2">
                      <Flex justify="between" align="center">
                        <Text size="1" color="gray">
                          {session?.brief_title}
                        </Text>
                        <Badge
                          color={severityColor(finding.severity)}
                          variant="soft"
                          size="1"
                        >
                          {finding.severity}
                        </Badge>
                      </Flex>
                      <Text
                        size="2"
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {finding.description}
                      </Text>
                    </Flex>
                  </Card>
                </Link>
              );
            })}
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}
