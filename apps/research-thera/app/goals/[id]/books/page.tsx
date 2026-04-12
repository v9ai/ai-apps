"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Button,
  Separator,
  Spinner,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useParams } from "next/navigation";
import NextLink from "next/link";
import { Breadcrumbs } from "@/app/components/Breadcrumbs";
import {
  useGetGoalQuery,
  useGetRecommendedBooksQuery,
} from "@/app/__generated__/hooks";

function getCategoryColor(category: string) {
  switch (category) {
    case "parenting": return "blue" as const;
    case "therapy": return "purple" as const;
    case "self-help": return "green" as const;
    case "child development": return "orange" as const;
    case "education": return "cyan" as const;
    case "psychology": return "violet" as const;
    case "neuroscience": return "crimson" as const;
    default: return "gray" as const;
  }
}

function getTier(whyRecommended: string): { label: string; color: "amber" | "blue" | "gray" } | null {
  if (whyRecommended.startsWith("TIER 1")) return { label: "Tier 1 — Essential", color: "amber" };
  if (whyRecommended.startsWith("TIER 2")) return { label: "Tier 2 — Deep Dive", color: "blue" };
  if (whyRecommended.startsWith("TIER 3")) return { label: "Tier 3 — Foundational", color: "gray" };
  return null;
}

function stripTierPrefix(text: string): string {
  return text.replace(/^TIER \d —\s*\S+\.\s*/, "");
}

export default function BooksPage() {
  const params = useParams();
  const paramValue = params.id as string;
  const isNumericId = /^\d+$/.test(paramValue);
  const goalId = isNumericId ? parseInt(paramValue) : undefined;
  const goalSlug = !isNumericId ? paramValue : undefined;

  const { data: goalData, loading: goalLoading } = useGetGoalQuery({
    variables: { id: goalId, slug: goalSlug },
    skip: !goalId && !goalSlug,
  });

  const goal = goalData?.goal;

  const { data: booksData, loading: booksLoading } = useGetRecommendedBooksQuery({
    variables: { goalId: goal?.id ?? 0 },
    skip: !goal?.id,
  });

  const books = booksData?.recommendedBooks ?? [];

  const loading = goalLoading || booksLoading;

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!goal) {
    return (
      <Card>
        <Text color="red">Goal not found</Text>
      </Card>
    );
  }

  const goalHref = goal.slug ? `/goals/${goal.slug}` : `/goals/${goal.id}`;

  // Group books by tier
  const tier1 = books.filter((b) => b.whyRecommended.startsWith("TIER 1"));
  const tier2 = books.filter((b) => b.whyRecommended.startsWith("TIER 2"));
  const tier3 = books.filter((b) => b.whyRecommended.startsWith("TIER 3"));
  const ungrouped = books.filter(
    (b) =>
      !b.whyRecommended.startsWith("TIER 1") &&
      !b.whyRecommended.startsWith("TIER 2") &&
      !b.whyRecommended.startsWith("TIER 3"),
  );

  const tiers = [
    { label: "Essential", sublabel: "Directly synthesize the core research", color: "amber" as const, books: tier1 },
    { label: "Deep Dives", sublabel: "Specific domains in depth", color: "blue" as const, books: tier2 },
    { label: "Foundational", sublabel: "Classic works for deeper understanding", color: "gray" as const, books: tier3 },
  ].filter((t) => t.books.length > 0);

  return (
    <Flex direction="column" gap="5">
      {/* Sticky Header */}
      <Box
        position="sticky"
        top="0"
        style={{
          zIndex: 20,
          background: "var(--color-panel)",
          borderBottom: "1px solid var(--gray-a6)",
          backdropFilter: "blur(10px)",
          marginLeft: "calc(-1 * var(--space-3))",
          marginRight: "calc(-1 * var(--space-3))",
          paddingLeft: "var(--space-3)",
          paddingRight: "var(--space-3)",
        }}
      >
        <Flex
          py="3"
          align="center"
          gap={{ initial: "2", md: "4" }}
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href={goalHref}>
              <ArrowLeftIcon />
              <Box display={{ initial: "none", sm: "inline" }} asChild>
                <span>{goal.title}</span>
              </Box>
            </NextLink>
          </Button>

          <Box display={{ initial: "none", sm: "block" }}>
            <Separator orientation="vertical" style={{ height: 20 }} />
          </Box>

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size={{ initial: "5", md: "8" }} weight="bold" truncate>
              Recommended Books
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Breadcrumbs
        crumbs={[
          { label: "Goals", href: "/goals" },
          { label: goal.title, href: goalHref },
          { label: "Recommended Books" },
        ]}
      />

      {/* Summary */}
      <Card>
        <Flex direction="column" gap="2" p="4">
          <Flex align="center" gap="2">
            <Heading size="4">{books.length} Recommended Books</Heading>
          </Flex>
          <Text size="2" color="gray" style={{ lineHeight: 1.6 }}>
            Curated reading list for <Text weight="bold">{goal.title}</Text>, ranked by relevance to the {goal.research?.length ?? 0} research papers.
          </Text>
        </Flex>
      </Card>

      {/* Tiered book lists */}
      {tiers.map((tier) => (
        <Flex direction="column" gap="3" key={tier.label}>
          <Flex align="center" gap="2">
            <Badge variant="solid" color={tier.color} size="2">
              {tier.label}
            </Badge>
            <Text size="2" color="gray">{tier.sublabel}</Text>
          </Flex>

          {tier.books.map((book, idx) => (
            <Card key={book.id} variant="surface">
              <Flex direction="column" gap="3" p="4">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    <Flex align="center" gap="2">
                      <Text
                        size="1"
                        weight="bold"
                        color="gray"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {tier.label === "Essential"
                          ? idx + 1
                          : tier.label === "Deep Dives"
                            ? tier1.length + idx + 1
                            : tier1.length + tier2.length + idx + 1}
                      </Text>
                      <Heading size="3">{book.title}</Heading>
                    </Flex>
                    <Text size="2" color="gray">
                      {book.authors.join(", ")}
                      {book.year ? ` (${book.year})` : ""}
                    </Text>
                  </Flex>
                  <Badge variant="soft" color={getCategoryColor(book.category)} size="1" style={{ flexShrink: 0 }}>
                    {book.category}
                  </Badge>
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
                      {stripTierPrefix(book.whyRecommended)}
                    </Text>
                  </Flex>
                </Card>

                {book.isbn && (
                  <Text size="1" color="gray">ISBN: {book.isbn}</Text>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      ))}

      {/* Ungrouped books (from AI generation without tier prefixes) */}
      {ungrouped.length > 0 && (
        <Flex direction="column" gap="3">
          {tiers.length > 0 && (
            <Flex align="center" gap="2">
              <Badge variant="solid" color="indigo" size="2">
                Recommendations
              </Badge>
            </Flex>
          )}
          {ungrouped.map((book) => (
            <Card key={book.id} variant="surface">
              <Flex direction="column" gap="3" p="4">
                <Flex justify="between" align="start" gap="3">
                  <Flex direction="column" gap="1" style={{ flex: 1 }}>
                    <Heading size="3">{book.title}</Heading>
                    <Text size="2" color="gray">
                      {book.authors.join(", ")}
                      {book.year ? ` (${book.year})` : ""}
                    </Text>
                  </Flex>
                  <Badge variant="soft" color={getCategoryColor(book.category)} size="1" style={{ flexShrink: 0 }}>
                    {book.category}
                  </Badge>
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
                      {book.whyRecommended}
                    </Text>
                  </Flex>
                </Card>

                {book.isbn && (
                  <Text size="1" color="gray">ISBN: {book.isbn}</Text>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      {books.length === 0 && (
        <Card>
          <Flex direction="column" gap="2" p="4" align="center">
            <Text size="2" color="gray">
              No book recommendations yet. Generate them from the goal page.
            </Text>
            <Button variant="soft" asChild>
              <NextLink href={goalHref}>Go to Goal</NextLink>
            </Button>
          </Flex>
        </Card>
      )}
    </Flex>
  );
}
