import { getDemoSessions, getDemoFindings } from "@/lib/demo-data";
import { Badge, Box, Card, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import Link from "next/link";

const severityColor: Record<string, "gray" | "orange" | "red" | "crimson"> = {
  low: "gray",
  medium: "orange",
  high: "red",
  critical: "crimson",
};

function FindingsList() {
  const sessions = getDemoSessions();
  const allFindings = getDemoFindings();

  const grouped = new Map<string, typeof allFindings>();
  for (const f of allFindings) {
    if (!grouped.has(f.session_id)) grouped.set(f.session_id, []);
    grouped.get(f.session_id)!.push(f);
  }

  return (
    <Flex direction="column" gap="4">
      {Array.from(grouped.entries()).map(([sessionId, sessionFindings]) => {
        const session = sessions.find((s) => s.id === sessionId);
        return (
          <Flex key={sessionId} direction="column" gap="2">
            <Heading size="3" asChild>
              <Link
                href={`/sessions/${sessionId}`}
                style={{ textDecoration: "none" }}
              >
                {session?.brief_title ?? sessionId}
              </Link>
            </Heading>
            {sessionFindings.map((f) => (
              <Card key={f.id} size="1">
                <Flex direction="column" gap="1">
                  <Flex gap="2" align="center">
                    <Badge color={severityColor[f.severity] ?? "gray"} size="1">
                      {f.severity}
                    </Badge>
                    <Badge variant="outline" size="1">
                      {f.type}
                    </Badge>
                    {f.confidence != null && (
                      <Text size="1" color="gray">
                        {(f.confidence * 100).toFixed(0)}%
                      </Text>
                    )}
                  </Flex>
                  <Text size="2">{f.description}</Text>
                </Flex>
              </Card>
            ))}
            <Separator size="4" />
          </Flex>
        );
      })}
    </Flex>
  );
}

export default function FindingsPage() {
  return (
    <Box py="8" style={{ maxWidth: 700, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Heading size="6">All Findings</Heading>
        <FindingsList />
      </Flex>
    </Box>
  );
}
