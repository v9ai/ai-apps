"use client";

import { useState } from "react";
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
import { Search } from "lucide-react";
import {
  useHealthcareSearchLazyQuery,
  type HealthcareSearchQuery,
} from "@/app/__generated__/hooks";
import { AuthGate } from "@/app/components/AuthGate";

const STARTER_QUERIES = [
  "high triglycerides",
  "kidney function",
  "metformin",
  "fatigue",
];

export default function SearchPage() {
  return (
    <AuthGate
      pageName="Health Search"
      description="Search across all your health records semantically. Sign in to search."
    >
      <SearchContent />
    </AuthGate>
  );
}

function SearchContent() {
  const [query, setQuery] = useState("");
  const [runSearch, { data, loading, error, called }] =
    useHealthcareSearchLazyQuery({ fetchPolicy: "network-only" });

  function fire(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    runSearch({ variables: { query: trimmed } });
  }

  const r = data?.healthcareSearch;

  return (
    <Box py="6">
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="1">
          <Heading size={{ initial: "6", md: "8" }} weight="bold">
            Search
          </Heading>
          <Text size="3" color="gray">
            Semantic search across blood markers, conditions, medications,
            symptoms, appointments.
          </Text>
        </Flex>

        <Separator size="4" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            fire(query);
          }}
        >
          <Flex gap="2">
            <Box flexGrow="1">
              <TextField.Root
                size="3"
                placeholder="e.g. cholesterol trends, recent fatigue, metformin side effects…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              >
                <TextField.Slot>
                  <Search size={14} />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Button size="3" type="submit" disabled={loading || !query.trim()}>
              {loading ? "Searching…" : "Search"}
            </Button>
          </Flex>
        </form>

        {!called && (
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">
              Try one of these:
            </Text>
            <Flex gap="2" wrap="wrap">
              {STARTER_QUERIES.map((q) => (
                <Badge
                  key={q}
                  color="blue"
                  variant="soft"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => fire(q)}
                >
                  {q}
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

        {!loading && !error && r && <SearchResults result={r} />}
      </Flex>
    </Box>
  );
}

function SearchResults({
  result,
}: {
  result: NonNullable<HealthcareSearchQuery["healthcareSearch"]>;
}) {
  const total =
    result.tests.length +
    result.markers.length +
    result.conditions.length +
    result.medications.length +
    result.symptoms.length +
    result.appointments.length;

  if (total === 0) {
    return (
      <Flex direction="column" align="center" gap="2" py="9">
        <Text size="2" color="gray">
          No matches above the similarity threshold.
        </Text>
        <Text size="1" color="gray">
          Try a different phrasing or upload more records.
        </Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="6">
      {result.tests.length > 0 && (
        <Group label="Blood tests" count={result.tests.length}>
          {result.tests.map((t) => (
            <Card key={t.id}>
              <Flex direction="column" gap="1" p="1">
                <Flex justify="between" align="start" gap="2">
                  <Text size="2" weight="medium">
                    {t.fileName ?? "Untitled test"}
                  </Text>
                  <SimBadge value={t.similarity} />
                </Flex>
                {t.testDate && (
                  <Text size="1" color="gray">
                    {t.testDate}
                  </Text>
                )}
                <Text size="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                  {t.content.slice(0, 280)}
                  {t.content.length > 280 ? "…" : ""}
                </Text>
              </Flex>
            </Card>
          ))}
        </Group>
      )}

      {result.markers.length > 0 && (
        <Group label="Blood markers" count={result.markers.length}>
          {result.markers.map((m) => (
            <Card key={m.markerId}>
              <Flex direction="column" gap="1" p="1">
                <Flex justify="between" align="start" gap="2">
                  <Text size="2" weight="medium">
                    {m.markerName}
                  </Text>
                  <SimBadge value={m.combinedScore} />
                </Flex>
                <Text size="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                  {m.content.slice(0, 280)}
                  {m.content.length > 280 ? "…" : ""}
                </Text>
              </Flex>
            </Card>
          ))}
        </Group>
      )}

      <HitGroup
        label="Conditions"
        hits={result.conditions}
        empty={result.conditions.length === 0}
      />
      <HitGroup
        label="Medications"
        hits={result.medications}
        empty={result.medications.length === 0}
      />
      <HitGroup
        label="Symptoms"
        hits={result.symptoms}
        empty={result.symptoms.length === 0}
      />
      <HitGroup
        label="Appointments"
        hits={result.appointments}
        empty={result.appointments.length === 0}
      />
    </Flex>
  );
}

type Hit = { id: string; entityId: string; content: string; similarity: number };

function HitGroup({
  label,
  hits,
  empty,
}: {
  label: string;
  hits: Hit[];
  empty: boolean;
}) {
  if (empty) return null;
  return (
    <Group label={label} count={hits.length}>
      {hits.map((h) => (
        <Card key={h.id}>
          <Flex direction="column" gap="1" p="1">
            <Flex justify="end">
              <SimBadge value={h.similarity} />
            </Flex>
            <Text size="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
              {h.content}
            </Text>
          </Flex>
        </Card>
      ))}
    </Group>
  );
}

function Group({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Flex direction="column" gap="2">
      <Heading size="3">
        {label}{" "}
        <Text size="1" color="gray" weight="regular">
          ({count})
        </Text>
      </Heading>
      <Flex direction="column" gap="2">
        {children}
      </Flex>
    </Flex>
  );
}

function SimBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 75 ? "green" : pct >= 55 ? "blue" : pct >= 35 ? "amber" : "gray";
  return (
    <Badge color={color} variant="soft" size="1">
      {pct}%
    </Badge>
  );
}
