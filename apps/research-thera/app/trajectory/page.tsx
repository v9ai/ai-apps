"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  Badge,
  Spinner,
  Separator,
} from "@radix-ui/themes";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  useHealthcareMarkerTrendLazyQuery,
  type HealthcareMarkerTrendQuery,
} from "../__generated__/hooks";
import { AuthGate } from "../components/AuthGate";

const STARTER = [
  { query: "HDL cholesterol over time", markerName: "HDL Cholesterol" },
  { query: "creatinine kidney function", markerName: "Creatinine" },
  { query: "fasting glucose trend", markerName: "Glucose" },
  { query: "triglycerides", markerName: "Triglycerides" },
];

const flagColor: Record<string, "gray" | "green" | "amber" | "red"> = {
  normal: "green",
  high: "red",
  low: "amber",
  critical: "red",
};

export default function TrajectoryPage() {
  return (
    <AuthGate
      pageName="Trajectory"
      description="Track how individual markers change over time. Sign in to view your trajectory."
    >
      <TrajectoryContent />
    </AuthGate>
  );
}

function TrajectoryContent() {
  const [query, setQuery] = useState("");
  const [markerName, setMarkerName] = useState("");
  const [run, { data, loading, error, called }] =
    useHealthcareMarkerTrendLazyQuery({ fetchPolicy: "network-only" });

  function fire(q: string, m: string) {
    const trimmedQuery = q.trim();
    if (!trimmedQuery) return;
    setQuery(trimmedQuery);
    setMarkerName(m);
    run({
      variables: {
        query: trimmedQuery,
        markerName: m.trim() || null,
      },
    });
  }

  const hits = data?.healthcareMarkerTrend ?? [];

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Marker Trajectory
          </Heading>
          <Text size="3" color="gray">
            Track how individual blood markers change across your tests.
          </Text>
        </Flex>

        <Separator size="4" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fire(query, markerName);
          }}
        >
          <Flex direction="column" gap="2">
            <Flex gap="2" wrap="wrap">
              <Box style={{ flex: 2, minWidth: 240 }}>
                <Text size="1" color="gray">
                  Search query (semantic)
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="e.g. cholesterol over time"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </Box>
              <Box style={{ flex: 1, minWidth: 200 }}>
                <Text size="1" color="gray">
                  Filter by marker (optional)
                </Text>
                <TextField.Root
                  size="3"
                  placeholder="e.g. HDL Cholesterol"
                  value={markerName}
                  onChange={(e) => setMarkerName(e.target.value)}
                />
              </Box>
            </Flex>
            <Flex justify="end">
              <Button size="3" type="submit" disabled={loading || !query.trim()}>
                {loading ? "Searching…" : "Plot trajectory"}
              </Button>
            </Flex>
          </Flex>
        </form>

        {!called && (
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              Quick starts:
            </Text>
            <Flex gap="2" wrap="wrap">
              {STARTER.map((s) => (
                <Badge
                  key={s.markerName}
                  color="indigo"
                  variant="soft"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => fire(s.query, s.markerName)}
                >
                  {s.markerName}
                </Badge>
              ))}
            </Flex>
          </Flex>
        )}

        {loading && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}

        {error && (
          <Flex direction="column" align="center" p="6" gap="2">
            <Text color="red">Search failed</Text>
            <Text size="1" color="gray">
              {error.message}
            </Text>
          </Flex>
        )}

        {!loading && !error && called && hits.length === 0 && (
          <Flex direction="column" align="center" gap="2" py="9">
            <Text size="2" color="gray">
              No matching marker history.
            </Text>
            <Text size="1" color="gray">
              Try a different query or upload more blood tests.
            </Text>
          </Flex>
        )}

        {!loading && !error && hits.length > 0 && <TrendView hits={hits} />}
      </Flex>
    </Box>
  );
}

type Hits = NonNullable<HealthcareMarkerTrendQuery["healthcareMarkerTrend"]>;

function TrendView({ hits }: { hits: Hits }) {
  // Sort chronologically (oldest → newest), use testDate when available.
  const sorted = useMemo(
    () =>
      [...hits].sort((a, b) => {
        const da = a.testDate ?? "";
        const db = b.testDate ?? "";
        return da.localeCompare(db);
      }),
    [hits],
  );

  // Group by markerName so multi-marker results render as separate series.
  const grouped = useMemo(() => {
    const map = new Map<string, Hits>();
    for (const h of sorted) {
      const arr = map.get(h.markerName) ?? [];
      arr.push(h);
      map.set(h.markerName, arr);
    }
    return Array.from(map.entries());
  }, [sorted]);

  return (
    <Flex direction="column" gap="6">
      {grouped.map(([name, series]) => (
        <Flex key={name} direction="column" gap="3">
          <Flex align="center" gap="2">
            <Heading size="4">{name}</Heading>
            <Text size="1" color="gray">
              {series.length} reading{series.length !== 1 ? "s" : ""}
            </Text>
          </Flex>
          <Flex direction="column" gap="2">
            {series.map((h, i) => {
              const prev = i > 0 ? parseFloat(series[i - 1].value) : null;
              const curr = parseFloat(h.value);
              const trend =
                prev != null && Number.isFinite(prev) && Number.isFinite(curr)
                  ? curr > prev
                    ? "up"
                    : curr < prev
                      ? "down"
                      : "flat"
                  : null;
              const TrendIcon =
                trend === "up"
                  ? TrendingUp
                  : trend === "down"
                    ? TrendingDown
                    : trend === "flat"
                      ? Minus
                      : null;
              return (
                <Card key={h.markerId}>
                  <Flex
                    justify="between"
                    align="center"
                    gap="3"
                    style={{ minHeight: 32 }}
                  >
                    <Flex direction="column" gap="0" style={{ minWidth: 100 }}>
                      <Text size="2" weight="medium">
                        {h.testDate ?? "Unknown date"}
                      </Text>
                      <Text size="1" color="gray">
                        {h.fileName}
                      </Text>
                    </Flex>
                    <Flex align="center" gap="2">
                      {TrendIcon && (
                        <TrendIcon
                          size={14}
                          color={
                            trend === "up"
                              ? "var(--red-9)"
                              : trend === "down"
                                ? "var(--green-9)"
                                : "var(--gray-9)"
                          }
                        />
                      )}
                      <Text size="3" weight="bold">
                        {h.value}
                      </Text>
                      <Text size="1" color="gray">
                        {h.unit}
                      </Text>
                      <Badge
                        color={flagColor[h.flag.toLowerCase()] ?? "gray"}
                        variant="soft"
                        size="1"
                      >
                        {h.flag}
                      </Badge>
                    </Flex>
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}
