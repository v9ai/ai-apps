"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Spinner,
  SegmentedControl,
  Separator,
} from "@radix-ui/themes";
import { useGetAllRecommendedBooksQuery } from "@/app/__generated__/hooks";

type Tag = "research-backed" | "practitioner" | "popular" | null;

function parseTag(whyRecommended: string): Tag {
  if (whyRecommended.startsWith("RESEARCH-BACKED —")) return "research-backed";
  if (whyRecommended.startsWith("PRACTITIONER —")) return "practitioner";
  if (whyRecommended.startsWith("POPULAR —")) return "popular";
  return null;
}

function stripTagPrefix(whyRecommended: string): string {
  return whyRecommended.replace(/^(RESEARCH-BACKED|PRACTITIONER|POPULAR) —\s*/, "");
}

function tagBadge(tag: Tag): { label: string; color: "amber" | "blue" | "gray" } | null {
  switch (tag) {
    case "research-backed":
      return { label: "Research-backed", color: "amber" };
    case "practitioner":
      return { label: "Practitioner synthesis", color: "blue" };
    case "popular":
      return { label: "Popular", color: "gray" };
    default:
      return null;
  }
}

function categoryLabel(category: string): string {
  switch (category) {
    case "parenting-discipline":
      return "Discipline — As a Parent";
    case "self-discipline":
      return "Discipline — As an Individual";
    default:
      return category;
  }
}

function categoryColor(category: string): "indigo" | "violet" | "gray" {
  switch (category) {
    case "parenting-discipline":
      return "indigo";
    case "self-discipline":
      return "violet";
    default:
      return "gray";
  }
}

const TAG_ORDER: Record<string, number> = {
  "research-backed": 0,
  practitioner: 1,
  popular: 2,
  unranked: 3,
};

export default function BooksPage() {
  const [filter, setFilter] = useState<"all" | "parenting-discipline" | "self-discipline">("all");

  const { data, loading, error } = useGetAllRecommendedBooksQuery({
    variables: { category: filter === "all" ? null : filter },
  });

  const books = data?.allRecommendedBooks ?? [];

  const grouped = new Map<string, typeof books>();
  for (const book of books) {
    const list = grouped.get(book.category) ?? [];
    list.push(book);
    grouped.set(book.category, list);
  }

  for (const [, list] of grouped) {
    list.sort((a, b) => {
      const ta = parseTag(a.whyRecommended) ?? "unranked";
      const tb = parseTag(b.whyRecommended) ?? "unranked";
      return (TAG_ORDER[ta] ?? 99) - (TAG_ORDER[tb] ?? 99);
    });
  }

  const orderedCategories = Array.from(grouped.keys()).sort((a, b) => {
    const order = ["parenting-discipline", "self-discipline"];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Heading size={{ initial: "6", md: "8" }} weight="bold">
          Books
        </Heading>
        <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
          Curated book recommendations. Each entry has a verified ISBN and a one-line evidence
          basis; the amber badges mark titles whose claims are grounded in the author's own
          peer-reviewed research.
        </Text>
      </Box>

      <Flex align="center" gap="3" wrap="wrap">
        <SegmentedControl.Root
          value={filter}
          onValueChange={(v) => setFilter(v as typeof filter)}
          size="2"
        >
          <SegmentedControl.Item value="all">All</SegmentedControl.Item>
          <SegmentedControl.Item value="parenting-discipline">As a Parent</SegmentedControl.Item>
          <SegmentedControl.Item value="self-discipline">As an Individual</SegmentedControl.Item>
        </SegmentedControl.Root>
        {!loading && (
          <Text size="2" color="gray">
            {books.length} {books.length === 1 ? "book" : "books"}
          </Text>
        )}
      </Flex>

      {loading && (
        <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
          <Spinner size="3" />
        </Flex>
      )}

      {error && (
        <Card>
          <Text color="red">Failed to load books: {error.message}</Text>
        </Card>
      )}

      {!loading && !error && books.length === 0 && (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text size="2" color="gray">
              No book recommendations yet.
            </Text>
          </Flex>
        </Card>
      )}

      {orderedCategories.map((category) => {
        const categoryBooks = grouped.get(category) ?? [];
        return (
          <Flex direction="column" gap="3" key={category}>
            <Flex align="center" gap="2">
              <Badge variant="solid" color={categoryColor(category)} size="2">
                {categoryLabel(category)}
              </Badge>
              <Text size="2" color="gray">
                {categoryBooks.length} {categoryBooks.length === 1 ? "book" : "books"}
              </Text>
            </Flex>

            {categoryBooks.map((book, idx) => {
              const tag = parseTag(book.whyRecommended);
              const tagInfo = tagBadge(tag);
              const whyClean = stripTagPrefix(book.whyRecommended);

              return (
                <Card key={book.id} variant="surface">
                  <Flex direction="column" gap="3" p="4">
                    <Flex justify="between" align="start" gap="3">
                      <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                        <Flex align="center" gap="2">
                          <Text
                            size="1"
                            weight="bold"
                            color="gray"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                          >
                            {idx + 1}
                          </Text>
                          <Heading size="3">{book.title}</Heading>
                        </Flex>
                        <Text size="2" color="gray">
                          {book.authors.join(", ")}
                          {book.year ? ` (${book.year})` : ""}
                        </Text>
                      </Flex>
                      {tagInfo && (
                        <Badge
                          variant="soft"
                          color={tagInfo.color}
                          size="1"
                          style={{ flexShrink: 0 }}
                        >
                          {tagInfo.label}
                        </Badge>
                      )}
                    </Flex>

                    <Text size="2" style={{ lineHeight: "1.7" }}>
                      {book.description}
                    </Text>

                    <Card
                      variant="classic"
                      style={{
                        backgroundColor: "var(--indigo-a2)",
                        border: "1px solid var(--indigo-a5)",
                      }}
                    >
                      <Flex direction="column" gap="1" p="3">
                        <Text size="1" weight="bold" color="indigo">
                          Why This Book
                        </Text>
                        <Text size="2" color="indigo" style={{ lineHeight: "1.6" }}>
                          {whyClean}
                        </Text>
                      </Flex>
                    </Card>

                    {book.isbn && (
                      <Flex gap="3" align="center">
                        <Text size="1" color="gray">
                          ISBN: {book.isbn}
                        </Text>
                        {book.amazonUrl && (
                          <>
                            <Separator orientation="vertical" style={{ height: 12 }} />
                            <a
                              href={book.amazonUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "var(--indigo-11)" }}
                            >
                              Amazon ↗
                            </a>
                          </>
                        )}
                      </Flex>
                    )}
                  </Flex>
                </Card>
              );
            })}
          </Flex>
        );
      })}
    </Flex>
  );
}
