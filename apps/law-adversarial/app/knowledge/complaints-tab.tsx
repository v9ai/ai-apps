"use client";

import { Badge, Button, Card, Flex, Select, Text, TextField } from "@radix-ui/themes";
import { useState, useTransition } from "react";
import { searchComplaints } from "./actions";
import type { NypdComplaint } from "@/lib/socrata";

const boroughs = [
  { value: "", label: "All Boroughs" },
  { value: "BRONX", label: "Bronx" },
  { value: "BROOKLYN", label: "Brooklyn" },
  { value: "MANHATTAN", label: "Manhattan" },
  { value: "QUEENS", label: "Queens" },
  { value: "STATEN ISLAND", label: "Staten Island" },
];

const lawCategories = [
  { value: "", label: "All Categories" },
  { value: "FELONY", label: "Felony" },
  { value: "MISDEMEANOR", label: "Misdemeanor" },
  { value: "VIOLATION", label: "Violation" },
];

const lawCatColor: Record<string, "red" | "orange" | "gray"> = {
  FELONY: "red",
  MISDEMEANOR: "orange",
  VIOLATION: "gray",
};

export function ComplaintsTab() {
  const [results, setResults] = useState<NypdComplaint[]>([]);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  const doSearch = (newPage: number) => {
    const form = document.getElementById("complaints-form") as HTMLFormElement;
    const fd = new FormData(form);

    startTransition(async () => {
      const data = await searchComplaints({
        offense: fd.get("offense") as string,
        borough: fd.get("borough") as string,
        lawCategory: fd.get("lawCategory") as string,
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
        id="complaints-form"
        onSubmit={(e) => {
          e.preventDefault();
          doSearch(1);
        }}
      >
        <Flex gap="3" wrap="wrap" align="end">
          <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 150 }}>
            <Text as="label" size="2" weight="medium">Offense</Text>
            <TextField.Root name="offense" placeholder="e.g. ASSAULT" />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">Borough</Text>
            <Select.Root name="borough" defaultValue="">
              <Select.Trigger />
              <Select.Content>
                {boroughs.map((b) => (
                  <Select.Item key={b.value} value={b.value}>
                    {b.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">Category</Text>
            <Select.Root name="lawCategory" defaultValue="">
              <Select.Trigger />
              <Select.Content>
                {lawCategories.map((c) => (
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
        <Text size="2" color="gray">No complaints found matching your criteria.</Text>
      )}

      {results.map((c) => (
        <Card key={c.cmplnt_num} size="1">
          <Flex direction="column" gap="1">
            <Flex gap="2" align="center" wrap="wrap">
              <Badge color={lawCatColor[c.law_cat_cd] ?? "gray"} size="1">
                {c.law_cat_cd}
              </Badge>
              {c.boro_nm && (
                <Badge variant="outline" size="1">{c.boro_nm}</Badge>
              )}
              {c.cmplnt_fr_dt && (
                <Text size="1" color="gray">
                  {new Date(c.cmplnt_fr_dt).toLocaleDateString()}
                </Text>
              )}
            </Flex>
            <Text size="2" weight="medium">{c.ofns_desc}</Text>
            {c.pd_desc && <Text size="1" color="gray">{c.pd_desc}</Text>}
            {c.prem_typ_desc && (
              <Text size="1" color="gray">Premises: {c.prem_typ_desc}</Text>
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
