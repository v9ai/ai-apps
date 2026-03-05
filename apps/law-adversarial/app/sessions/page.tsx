import { createClient } from "@/lib/supabase/server";
import {
  Badge,
  Box,
  Card,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import Link from "next/link";
import { NewSessionForm } from "./new-session-form";

const statusColor: Record<string, "gray" | "blue" | "green" | "red"> = {
  pending: "gray",
  running: "blue",
  completed: "green",
  failed: "red",
};

function scoreColor(score: number): string {
  if (score >= 70) return "var(--green-9)";
  if (score >= 50) return "var(--amber-9)";
  return "var(--crimson-9)";
}

export default async function SessionsPage() {
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("stress_test_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  const list = sessions ?? [];

  return (
    <Box py="8" style={{ maxWidth: 700, margin: "0 auto" }}>
      <Flex direction="column" gap="6">
        <Heading size="6">Stress Test Sessions</Heading>

        <NewSessionForm />

        <Separator size="4" />

        <Flex direction="column" gap="3">
          <Heading size="4">Your Sessions ({list.length})</Heading>
          {list.length === 0 && (
            <Text size="2" color="gray">
              No sessions yet. Create one above.
            </Text>
          )}
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {list.map((s: any) => (
            <Card key={s.id} asChild variant="surface">
              <Link
                href={`/sessions/${s.slug}`}
                style={{ textDecoration: "none" }}
              >
                <Flex justify="between" align="center" gap="4">
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    <Text size="2" weight="medium">
                      {s.brief_title}
                    </Text>
                    <Flex gap="2" align="center" wrap="wrap">
                      <Badge color={statusColor[s.status] ?? "gray"} size="1">
                        {s.status}
                      </Badge>
                      {s.jurisdiction && (
                        <Badge variant="surface" color="blue" size="1">
                          {s.jurisdiction}
                        </Badge>
                      )}
                    </Flex>
                    <Text size="1" color="gray">
                      {new Date(s.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </Flex>
                  {s.overall_score != null && (
                    <Box
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        border: `3px solid ${scoreColor(s.overall_score)}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Text
                        size="3"
                        weight="bold"
                        style={{ color: scoreColor(s.overall_score) }}
                      >
                        {Math.round(s.overall_score)}
                      </Text>
                    </Box>
                  )}
                </Flex>
              </Link>
            </Card>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
