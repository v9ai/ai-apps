"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge, Button, Card, Flex, Text } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

type AuditEvent = {
  type: "audit" | "session_complete" | "error";
  agent?: string;
  action?: string;
  output_summary?: string;
  round?: number;
  status?: string;
  overall_score?: number;
};

const agentColor: Record<string, "red" | "blue" | "amber" | "gray"> = {
  attacker: "red",
  defender: "blue",
  judge: "amber",
  system: "gray",
};

export function RunAnalysisButton({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/analyze`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleRun} disabled={loading} size="3">
      {loading ? "Starting..." : "Run Analysis"}
    </Button>
  );
}

export function SessionLive({ sessionId }: { sessionId: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [done, setDone] = useState(false);
  const router = useRouter();

  const connect = useCallback(() => {
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);

    es.onmessage = (e) => {
      const data: AuditEvent = JSON.parse(e.data);
      setEvents((prev) => [...prev, data]);

      if (data.type === "session_complete" || data.type === "error") {
        setDone(true);
        es.close();
        router.refresh();
      }
    };

    es.onerror = () => {
      es.close();
    };

    return es;
  }, [sessionId, router]);

  useEffect(() => {
    const es = connect();
    return () => es.close();
  }, [connect]);

  if (events.length === 0) {
    return (
      <Card>
        <Flex align="center" justify="center" py="4">
          <Text size="2" color="gray">
            Connecting to live feed...
          </Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card>
      <Flex direction="column" gap="2">
        <Text size="2" weight="medium">
          Live Activity {!done && <span style={{ animation: "pulse 1.5s infinite" }}>●</span>}
        </Text>
        {events.map((event, i) => (
          <Flex key={i} gap="2" align="center">
            {event.agent && (
              <Badge color={agentColor[event.agent] ?? "gray"} size="1">
                {event.agent}
              </Badge>
            )}
            <Text size="1">
              {event.action && <strong>{event.action}</strong>}
              {event.output_summary && ` — ${event.output_summary}`}
              {event.round != null && ` (round ${event.round})`}
              {event.type === "session_complete" &&
                `Analysis complete! Score: ${event.overall_score}`}
              {event.type === "error" && "Analysis failed."}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Card>
  );
}
