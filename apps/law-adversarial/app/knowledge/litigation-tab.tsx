"use client";

import { Badge, Button, Card, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { useState, useTransition } from "react";
import { searchLitigation } from "./actions";
import type { CivilLitigation } from "@/lib/socrata";

const caseCategories = [
  { value: "", label: "All Categories" },
  { value: "General Liability", label: "General Liability" },
  { value: "Civil Rights", label: "Civil Rights" },
  { value: "Motor Vehicle", label: "Motor Vehicle" },
  { value: "Medical/Dental Malpractice", label: "Medical/Dental Malpractice" },
  { value: "Contract", label: "Contract" },
  { value: "Labor Law", label: "Labor Law" },
  { value: "Police Action", label: "Police Action" },
];

export function LitigationTab() {
  const [results, setResults] = useState<CivilLitigation[]>([]);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const doSearch = (newPage: number) => {
    const form = document.getElementById("litigation-form") as HTMLFormElement;
    const fd = new FormData(form);

    startTransition(async () => {
      const data = await searchLitigation({
        query: fd.get("query") as string,
        caseCategory: fd.get("caseCategory") as string,
        page: newPage,
      });
      setResults(data);
      setPage(newPage);
      setHasSearched(true);
    });
  };

  return (
    <Flex direction="column" gap="4">
      <form
        id="litigation-form"
        onSubmit={(e) => {
          e.preventDefault();
          doSearch(1);
        }}
      >
        <Flex gap="3" wrap="wrap" align="end">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 200 }}>
            <Text as="label" size="2" weight="medium">Search</Text>
            <TextField.Root name="query" placeholder="Search cases..." />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">Case Category</Text>
            <Select.Root name="caseCategory" defaultValue="">
              <Select.Trigger />
              <Select.Content>
                {caseCategories.map((c) => (
                  <Select.Item key={c.value} value={c.value}>
                    {c.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Button type="submit" disabled={isPending}>
            {isPending ? "Searching..." : "Search"}
          </Button>
        </Flex>
      </form>

      {isPending && (
        <Text size="2" color="gray">Loading...</Text>
      )}

      {!isPending && hasSearched && results.length === 0 && (
        <Text size="2" color="gray">No litigation records found.</Text>
      )}

      {results.map((l, i) => (
        <Card key={`${l.matter_name}-${l.filing_date}-${i}`} size="1">
          <Flex direction="column" gap="1">
            <Flex gap="2" align="center" wrap="wrap">
              {l.case_category && (
                <Badge color="blue" size="1">{l.case_category}</Badge>
              )}
              {l.disposition && (
                <Badge variant="outline" size="1">{l.disposition}</Badge>
              )}
              {l.filing_date && (
                <Text size="1" color="gray">
                  Filed: {new Date(l.filing_date).toLocaleDateString()}
                </Text>
              )}
            </Flex>
            <Text size="2" weight="medium">{l.matter_name}</Text>
            {l.cause_of_action && (
              <Text size="1" color="gray">{l.cause_of_action}</Text>
            )}
            {l.court && (
              <Text size="1" color="gray">Court: {l.court}</Text>
            )}
          </Flex>
        </Card>
      ))}

      {hasSearched && results.length > 0 && (
        <Flex gap="3" justify="center">
          <Button
            variant="outline"
            disabled={page <= 1 || isPending}
            onClick={() => doSearch(page - 1)}
          >
            Previous
          </Button>
          <Text size="2" color="gray" style={{ alignSelf: "center" }}>
            Page {page}
          </Text>
          <Button
            variant="outline"
            disabled={results.length < 25 || isPending}
            onClick={() => doSearch(page + 1)}
          >
            Next
          </Button>
        </Flex>
      )}
    </Flex>
  );
}
