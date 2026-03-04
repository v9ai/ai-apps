"use client";

import { useState, useTransition } from "react";
import { Badge, Box, Button, Card, Flex, SegmentedControl, Text, TextField } from "@radix-ui/themes";
import { searchBloodTests, searchMarkers } from "../blood-tests/search-actions";
import Link from "next/link";

type TestResult = {
  id: string;
  test_id: string;
  content: string;
  similarity: number;
  file_name: string;
  test_date: string | null;
};

type MarkerResult = {
  id: string;
  marker_id: string;
  test_id: string;
  marker_name: string;
  content: string;
  similarity: number;
};

export function SearchForm() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"tests" | "markers">("tests");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [markerResults, setMarkerResults] = useState<MarkerResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      if (mode === "tests") {
        const results = await searchBloodTests(query);
        setTestResults(results);
        setMarkerResults([]);
      } else {
        const results = await searchMarkers(query);
        setMarkerResults(results);
        setTestResults([]);
      }
    });
  }

  return (
    <Flex direction="column" gap="4">
      <SegmentedControl.Root
        value={mode}
        onValueChange={(v) => setMode(v as "tests" | "markers")}
      >
        <SegmentedControl.Item value="tests">Tests</SegmentedControl.Item>
        <SegmentedControl.Item value="markers">Markers</SegmentedControl.Item>
      </SegmentedControl.Root>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        <Flex gap="2">
          <Box flexGrow="1">
            <TextField.Root
              placeholder={
                mode === "tests"
                  ? "Search blood tests..."
                  : "Search individual markers..."
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Box>
          <Button type="submit" disabled={isPending || !query.trim()}>
            {isPending ? "Searching..." : "Search"}
          </Button>
        </Flex>
      </form>

      {testResults.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold">
            {testResults.length} test(s) found
          </Text>
          {testResults.map((r) => (
            <Card key={r.id}>
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <Text size="2" weight="medium" asChild>
                    <Link href={`/protected/blood-tests/${r.test_id}`}>
                      {r.file_name}
                    </Link>
                  </Text>
                  <Badge color="blue" variant="soft">
                    {(r.similarity * 100).toFixed(0)}% match
                  </Badge>
                </Flex>
                {r.test_date && (
                  <Text size="1" color="gray">
                    {new Date(r.test_date).toLocaleDateString()}
                  </Text>
                )}
                <Text size="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                  {r.content.slice(0, 200)}
                  {r.content.length > 200 ? "..." : ""}
                </Text>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {markerResults.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold">
            {markerResults.length} marker(s) found
          </Text>
          {markerResults.map((r) => (
            <Card key={r.id}>
              <Flex direction="column" gap="2">
                <Flex justify="between" align="center">
                  <Text size="2" weight="medium" asChild>
                    <Link href={`/protected/blood-tests/${r.test_id}`}>
                      {r.marker_name}
                    </Link>
                  </Text>
                  <Badge color="blue" variant="soft">
                    {(r.similarity * 100).toFixed(0)}% match
                  </Badge>
                </Flex>
                <Text size="1" color="gray" style={{ whiteSpace: "pre-wrap" }}>
                  {r.content}
                </Text>
              </Flex>
            </Card>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
