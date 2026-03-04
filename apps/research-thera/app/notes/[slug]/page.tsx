"use client";

import { useMemo, useState } from "react";
import * as Accordion from "@radix-ui/react-accordion";
import * as Tooltip from "@radix-ui/react-tooltip";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  MagnifyingGlassIcon,
} from "@radix-ui/react-icons";
import {
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Spinner,
  Link,
  Grid,
  ScrollArea,
  TextField,
  Tabs,
  Box,
  Separator,
} from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { useRouter, useParams } from "next/navigation";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import {
  useGetNoteQuery,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
} from "@/app/__generated__/hooks";
import { useUser } from "@clerk/nextjs";
import "./accordion.css";

// Utility to format relative time
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function NotePageContent() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();

  const [showFullDescription, setShowFullDescription] = useState(false);

  // List UX state
  const [researchQuery, setResearchQuery] = useState("");
  const [claimsQuery, setClaimsQuery] = useState("");
  const [openResearch, setOpenResearch] = useState<string[]>([]);
  const [openClaims, setOpenClaims] = useState<string[]>([]);

  const { data, loading, error } = useGetNoteQuery({
    variables: { slug },
    skip: !slug,
  });

  // Keep your mutations (even if not shown in UI here)
  const [updateNote] = useUpdateNoteMutation({ refetchQueries: ["GetNote"] });
  const [deleteNote] = useDeleteNoteMutation();

  const note = data?.note;

  // Move all derived state and memos BEFORE conditional returns to avoid hook order violations
  const linkedResearch = note?.linkedResearch ?? [];
  const claimCards = note?.claimCards ?? [];

  const filteredResearch = useMemo(() => {
    const q = researchQuery.trim().toLowerCase();
    if (!q) return linkedResearch;
    return linkedResearch.filter((r) => {
      const title = (r.title ?? "").toLowerCase();
      const journal = (r.journal ?? "").toLowerCase();
      const authors = (r.authors ?? []).join(", ").toLowerCase();
      return title.includes(q) || journal.includes(q) || authors.includes(q);
    });
  }, [linkedResearch, researchQuery]);

  const filteredClaims = useMemo(() => {
    const q = claimsQuery.trim().toLowerCase();
    if (!q) return claimCards;
    return claimCards.filter((c) => {
      const claim = (c.claim ?? "").toLowerCase();
      return claim.includes(q);
    });
  }, [claimCards, claimsQuery]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "green";
      case "completed":
        return "blue";
      case "paused":
        return "orange";
      case "archived":
        return "gray";
      default:
        return "gray";
    }
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error || !note) {
    return (
      <Card>
        <Text color="red">
          {error ? `Error: ${error.message}` : "Note not found"}
        </Text>
      </Card>
    );
  }

  const shouldTruncateDescription =
    note.goal?.description && note.goal.description.length > 180;
  const displayDescription =
    shouldTruncateDescription && !showFullDescription
      ? note.goal?.description?.slice(0, 180) + "..."
      : note.goal?.description;

  const researchMaxHeight = "calc(100vh - 320px)";
  const claimsMaxHeight = "calc(100vh - 320px)";

  return (
    <>
    <Grid columns={{ initial: "1", md: "3fr 1.25fr" }} gap="5">
      {/* MAIN COLUMN */}
      <Flex direction="column" gap="4" style={{ minWidth: 0 }}>
        {/* LINKED RESEARCH */}
        {linkedResearch.length > 0 && (
          <Card>
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center" gap="3" wrap="wrap">
                <Heading size="4">
                  Linked Research ({linkedResearch.length})
                </Heading>

                <Flex gap="2" align="center" wrap="wrap" justify="end">
                  <TextField.Root
                    size="2"
                    placeholder="Search title, authors, journal…"
                    value={researchQuery}
                    onChange={(e) => setResearchQuery(e.target.value)}
                    style={{ width: 320, maxWidth: "100%" }}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon />
                    </TextField.Slot>
                  </TextField.Root>

                  <Button
                    size="1"
                    variant="soft"
                    onClick={() =>
                      setOpenResearch(
                        filteredResearch.map((r) => `research-${r.id}`),
                      )
                    }
                  >
                    Expand all
                  </Button>
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => setOpenResearch([])}
                  >
                    Collapse
                  </Button>
                </Flex>
              </Flex>

              <SeparatorPrimitive.Root className="SectionDivider" />

              <ScrollArea
                type="auto"
                scrollbars="vertical"
                style={{ maxHeight: researchMaxHeight }}
              >
                <Accordion.Root
                  type="multiple"
                  value={openResearch}
                  onValueChange={setOpenResearch}
                  className="AccordionRoot"
                >
                  {filteredResearch.map((research) => (
                    <Accordion.Item
                      key={research.id}
                      value={`research-${research.id}`}
                      className="AccordionItem"
                    >
                      <Accordion.Header className="AccordionHeader">
                        <Accordion.Trigger className="AccordionTrigger">
                          <Flex
                            direction="column"
                            gap="1"
                            style={{ minWidth: 0, flex: 1 }}
                          >
                            <Text
                              size="3"
                              weight="medium"
                              className="LineClamp2"
                            >
                              {research.title}
                            </Text>

                            <Flex gap="2" align="center" wrap="wrap">
                              {research.year && (
                                <Badge size="1" variant="soft">
                                  {research.year}
                                </Badge>
                              )}
                              {research.journal && (
                                <Text
                                  size="1"
                                  color="gray"
                                  className="LineClamp1"
                                >
                                  {research.journal}
                                </Text>
                              )}
                              {research.authors?.length ? (
                                <Text
                                  size="1"
                                  color="gray"
                                  className="LineClamp1"
                                >
                                  {research.authors.slice(0, 3).join(", ")}
                                  {research.authors.length > 3 ? " et al." : ""}
                                </Text>
                              ) : null}
                            </Flex>
                          </Flex>

                          <Flex gap="2" align="center">
                            {research.url && (
                              <Link
                                href={research.url}
                                target="_blank"
                                onClick={(e) => e.stopPropagation()}
                                className="RowIconLink"
                                title="Open paper"
                              >
                                <ExternalLinkIcon />
                              </Link>
                            )}
                            <ChevronDownIcon
                              className="AccordionChevron"
                              aria-hidden
                            />
                          </Flex>
                        </Accordion.Trigger>
                      </Accordion.Header>

                      <Accordion.Content className="AccordionContent">
                        <Box className="AccordionContentBox">
                          <Flex direction="column" gap="2">
                            {research.url ? (
                              <Link
                                href={research.url}
                                target="_blank"
                                size="2"
                              >
                                View paper →
                              </Link>
                            ) : (
                              <Text size="2" color="gray">
                                No link available.
                              </Text>
                            )}
                          </Flex>
                        </Box>
                      </Accordion.Content>
                    </Accordion.Item>
                  ))}

                  {filteredResearch.length === 0 && (
                    <Box p="3">
                      <Text size="2" color="gray">
                        No results for "{researchQuery}".
                      </Text>
                    </Box>
                  )}
                </Accordion.Root>
              </ScrollArea>
            </Flex>
          </Card>
        )}

        {/* CLAIM CARDS */}
        {claimCards.length > 0 && (
          <Card>
            <Flex direction="column" gap="3">
              <Flex justify="between" align="center" gap="3" wrap="wrap">
                <Heading size="4">Claim Cards ({claimCards.length})</Heading>

                <Flex gap="2" align="center" wrap="wrap" justify="end">
                  <TextField.Root
                    size="2"
                    placeholder="Search claims…"
                    value={claimsQuery}
                    onChange={(e) => setClaimsQuery(e.target.value)}
                    style={{ width: 320, maxWidth: "100%" }}
                  >
                    <TextField.Slot>
                      <MagnifyingGlassIcon />
                    </TextField.Slot>
                  </TextField.Root>

                  <Button
                    size="1"
                    variant="soft"
                    onClick={() =>
                      setOpenClaims(filteredClaims.map((c) => `claim-${c.id}`))
                    }
                  >
                    Expand all
                  </Button>
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={() => setOpenClaims([])}
                  >
                    Collapse
                  </Button>
                </Flex>
              </Flex>

              <SeparatorPrimitive.Root className="SectionDivider" />

              <ScrollArea
                type="auto"
                scrollbars="vertical"
                style={{ maxHeight: claimsMaxHeight }}
              >
                <Accordion.Root
                  type="multiple"
                  value={openClaims}
                  onValueChange={setOpenClaims}
                  className="AccordionRoot"
                >
                  {filteredClaims.map((card) => {
                    const verdictColor =
                      (
                        {
                          SUPPORTED: "green",
                          CONTRADICTED: "red",
                          MIXED: "orange",
                          INSUFFICIENT: "gray",
                          UNVERIFIED: "gray",
                        } as const
                      )[card.verdict] ?? "gray";

                    const supportingEvidence = card.evidence.filter(
                      (e) => e.polarity === "SUPPORTS",
                    );
                    const contradictingEvidence = card.evidence.filter(
                      (e) => e.polarity === "CONTRADICTS",
                    );
                    const otherEvidence = card.evidence.filter(
                      (e) =>
                        e.polarity === "MIXED" || e.polarity === "IRRELEVANT",
                    );

                    const defaultTab =
                      supportingEvidence.length > 0
                        ? "support"
                        : contradictingEvidence.length > 0
                          ? "contradict"
                          : "other";

                    return (
                      <Accordion.Item
                        key={card.id}
                        value={`claim-${card.id}`}
                        className="AccordionItem"
                      >
                        <Accordion.Header className="AccordionHeader">
                          <Accordion.Trigger className="AccordionTrigger">
                            <Flex
                              direction="column"
                              gap="2"
                              style={{ minWidth: 0, flex: 1 }}
                            >
                              <Text
                                size="3"
                                weight="medium"
                                className="LineClamp3"
                              >
                                {card.claim}
                              </Text>

                              <Flex gap="2" align="center" wrap="wrap">
                                <Badge color={verdictColor} variant="soft">
                                  {card.verdict}
                                </Badge>

                                <Tooltip.Provider>
                                  <Tooltip.Root>
                                    <Tooltip.Trigger asChild>
                                      <Badge variant="outline">
                                        {Math.round(card.confidence * 100)}%
                                      </Badge>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal>
                                      <Tooltip.Content
                                        sideOffset={6}
                                        className="TooltipContent"
                                      >
                                        Confidence score
                                        <Tooltip.Arrow className="TooltipArrow" />
                                      </Tooltip.Content>
                                    </Tooltip.Portal>
                                  </Tooltip.Root>
                                </Tooltip.Provider>

                                <Badge variant="surface" size="1">
                                  {card.evidence.length}{" "}
                                  {card.evidence.length === 1
                                    ? "source"
                                    : "sources"}
                                </Badge>

                                {/* Quick polarity breakdown for scanning */}
                                {supportingEvidence.length > 0 && (
                                  <Badge color="green" variant="soft" size="1">
                                    ✓ {supportingEvidence.length}
                                  </Badge>
                                )}
                                {contradictingEvidence.length > 0 && (
                                  <Badge color="red" variant="soft" size="1">
                                    ✗ {contradictingEvidence.length}
                                  </Badge>
                                )}
                                {otherEvidence.length > 0 && (
                                  <Badge color="gray" variant="soft" size="1">
                                    ~ {otherEvidence.length}
                                  </Badge>
                                )}
                              </Flex>
                            </Flex>

                            <ChevronDownIcon
                              className="AccordionChevron"
                              aria-hidden
                            />
                          </Accordion.Trigger>
                        </Accordion.Header>

                        <Accordion.Content className="AccordionContent">
                          <Box className="AccordionContentBox">
                            <Flex direction="column" gap="3">
                              {/* Scope */}
                              {card.scope && (
                                <Box className="ScopeBox">
                                  <Text size="2" weight="bold" color="gray">
                                    Scope
                                  </Text>
                                  <Flex direction="column" gap="1" mt="2">
                                    {card.scope.population && (
                                      <Text size="1">
                                        <strong>Population:</strong>{" "}
                                        {card.scope.population}
                                      </Text>
                                    )}
                                    {card.scope.intervention && (
                                      <Text size="1">
                                        <strong>Intervention:</strong>{" "}
                                        {card.scope.intervention}
                                      </Text>
                                    )}
                                    {card.scope.outcome && (
                                      <Text size="1">
                                        <strong>Outcome:</strong>{" "}
                                        {card.scope.outcome}
                                      </Text>
                                    )}
                                  </Flex>
                                </Box>
                              )}

                              {/* Evidence Tabs */}
                              <Tabs.Root defaultValue={defaultTab}>
                                <Tabs.List>
                                  <Tabs.Trigger value="support">
                                    Support ({supportingEvidence.length})
                                  </Tabs.Trigger>
                                  <Tabs.Trigger value="contradict">
                                    Contradict ({contradictingEvidence.length})
                                  </Tabs.Trigger>
                                  <Tabs.Trigger value="other">
                                    Other ({otherEvidence.length})
                                  </Tabs.Trigger>
                                </Tabs.List>

                                <Tabs.Content value="support">
                                  <EvidenceList
                                    tone="support"
                                    evidence={supportingEvidence}
                                    emptyText="No supporting evidence."
                                  />
                                </Tabs.Content>

                                <Tabs.Content value="contradict">
                                  <EvidenceList
                                    tone="contradict"
                                    evidence={contradictingEvidence}
                                    emptyText="No contradicting evidence."
                                  />
                                </Tabs.Content>

                                <Tabs.Content value="other">
                                  <EvidenceList
                                    tone="other"
                                    evidence={otherEvidence}
                                    emptyText="No other evidence."
                                  />
                                </Tabs.Content>
                              </Tabs.Root>
                            </Flex>
                          </Box>
                        </Accordion.Content>
                      </Accordion.Item>
                    );
                  })}

                  {filteredClaims.length === 0 && (
                    <Box p="3">
                      <Text size="2" color="gray">
                        No results for "{claimsQuery}".
                      </Text>
                    </Box>
                  )}
                </Accordion.Root>
              </ScrollArea>
            </Flex>
          </Card>
        )}
      </Flex>

      {/* SIDEBAR */}
      <Flex
        direction="column"
        gap="4"
        style={{ position: "sticky", top: 24, alignSelf: "start" }}
      >
        {note.goal && (
          <Card className="GoalCard" asChild>
            <NextLink
              href={`/goals/${note.goal?.id}`}
              style={{ textDecoration: "none" }}
            >
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Badge color="indigo" size="1">
                  Related Goal
                </Badge>
                <ChevronRightIcon width="16" height="16" />
              </Flex>

              <Heading size="3" style={{ lineHeight: "1.3" }}>
                {note.goal.title}
              </Heading>

              {note.goal.description && (
                <>
                  <Text size="1" color="gray" style={{ lineHeight: "1.5" }}>
                    {displayDescription}
                  </Text>

                  {shouldTruncateDescription && (
                    <Button
                      variant="ghost"
                      size="1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFullDescription(!showFullDescription);
                      }}
                      style={{ alignSelf: "flex-start", padding: "0" }}
                    >
                      {showFullDescription ? "Show less" : "Show more"}
                    </Button>
                  )}
                </>
              )}

              <SeparatorPrimitive.Root className="GoalDivider" />

              <Flex gap="2" wrap="wrap" align="center">
                <Badge
                  color={getStatusColor(note.goal.status)}
                  variant="solid"
                  size="1"
                >
                  {note.goal.status}
                </Badge>
              </Flex>
            </Flex>
            </NextLink>
          </Card>
        )}
      </Flex>
    </Grid>
    </>
  );
}

function EvidenceList({
  tone,
  evidence,
  emptyText,
}: {
  tone: "support" | "contradict" | "other";
  evidence: any[];
  emptyText: string;
}) {
  if (!evidence.length) {
    return (
      <Box p="3">
        <Text size="2" color="gray">
          {emptyText}
        </Text>
      </Box>
    );
  }

  const rowClass =
    tone === "support"
      ? "EvidenceRow EvidenceSupport"
      : tone === "contradict"
        ? "EvidenceRow EvidenceContradict"
        : "EvidenceRow EvidenceOther";

  return (
    <Flex direction="column" gap="2" mt="3">
      {evidence.map((ev, idx) => (
        <Box key={idx} className={rowClass}>
          <Flex direction="column" gap="1">
            <Flex justify="between" align="start" gap="2">
              <Text size="2" weight="medium" className="LineClamp2">
                {ev.paper.title}
              </Text>

              {ev.score !== null && ev.score !== undefined && (
                <Badge size="1" variant="soft">
                  {(ev.score * 100).toFixed(0)}%
                </Badge>
              )}
            </Flex>

            {ev.paper.authors?.length ? (
              <Text size="1" color="gray" className="LineClamp1">
                {ev.paper.authors.slice(0, 2).join(", ")}
                {ev.paper.authors.length > 2 ? " et al." : ""}
                {ev.paper.year ? ` (${ev.paper.year})` : ""}
              </Text>
            ) : null}

            {ev.excerpt && (
              <Text size="1" className="EvidenceExcerpt">
                "{ev.excerpt}"
              </Text>
            )}

            {ev.locator?.url && (
              <Link href={ev.locator.url} target="_blank" size="1">
                View source →
              </Link>
            )}
          </Flex>
        </Box>
      ))}
    </Flex>
  );
}

const DynamicNotePageContent = dynamic(() => Promise.resolve(NotePageContent), {
  ssr: false,
});

export default function NotePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useUser();

  const { data } = useGetNoteQuery({
    variables: { slug },
    skip: !slug,
  });

  const note = data?.note;

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
          marginLeft: "calc(-1 * var(--space-5))",
          marginRight: "calc(-1 * var(--space-5))",
          paddingLeft: "var(--space-5)",
          paddingRight: "var(--space-5)",
        }}
      >
        <Flex
          py="4"
          align="center"
          gap="4"
          style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}
        >
          <Button variant="soft" size="2" radius="full" color="gray" asChild>
            <NextLink href="/notes">
              <ArrowLeftIcon />
              <Text as="span" size="2" weight="medium">
                Notes
              </Text>
            </NextLink>
          </Button>

          <Separator orientation="vertical" style={{ height: 20 }} />

          <Box minWidth="0" style={{ flex: 1 }}>
            <Heading size="8" weight="bold" truncate>
              {note?.title || "Loading note\u2026"}
            </Heading>
          </Box>
        </Flex>
      </Box>

      <Box style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
        <DynamicNotePageContent />
      </Box>
    </Flex>
  );
}
