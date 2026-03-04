"use client";

import { useState, useTransition } from "react";
import { Badge, Box, Button, Flex, Table, Text, TextField } from "@radix-ui/themes";
import { getMarkerTrend } from "../blood-tests/search-actions";
import Link from "next/link";

type TrendResult = {
  marker_id: string;
  test_id: string;
  marker_name: string;
  content: string;
  similarity: number;
  value: string;
  unit: string;
  flag: string;
  test_date: string | null;
  file_name: string;
};

const flagColor: Record<string, "blue" | "red" | "green"> = {
  low: "blue",
  high: "red",
  normal: "green",
};

export function TrendsSection() {
  const [query, setQuery] = useState("");
  const [markerName, setMarkerName] = useState("");
  const [results, setResults] = useState<TrendResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      const data = await getMarkerTrend(query, markerName || undefined);
      setResults(data);
    });
  }

  return (
    <Flex direction="column" gap="4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <Flex gap="2">
          <Box flexGrow="1">
            <TextField.Root
              placeholder="Search query (e.g. cholesterol, iron)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Box>
          <Box style={{ width: 200 }}>
            <TextField.Root
              placeholder="Exact marker name (opt)"
              value={markerName}
              onChange={(e) => setMarkerName(e.target.value)}
            />
          </Box>
          <Button type="submit" disabled={isPending || !query.trim()}>
            {isPending ? "Loading..." : "Trends"}
          </Button>
        </Flex>
      </form>

      {results.length > 0 && (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Marker</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Value</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Flag</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Test</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Match</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {results.map((r) => (
              <Table.Row key={r.marker_id}>
                <Table.Cell>
                  <Text size="1">
                    {r.test_date
                      ? new Date(r.test_date).toLocaleDateString()
                      : "—"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text weight="medium">{r.marker_name}</Text>
                </Table.Cell>
                <Table.Cell>
                  {r.value} {r.unit}
                </Table.Cell>
                <Table.Cell>
                  <Badge
                    color={flagColor[r.flag] ?? "green"}
                    variant="soft"
                  >
                    {r.flag}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <Text size="1" asChild>
                    <Link href={`/protected/blood-tests/${r.test_id}`}>
                      {r.file_name}
                    </Link>
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color="blue" variant="soft">
                    {(r.similarity * 100).toFixed(0)}%
                  </Badge>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {results.length === 0 && !isPending && query && (
        <Text size="2" color="gray">
          No trend data found. Try a different search or upload more tests.
        </Text>
      )}
    </Flex>
  );
}
