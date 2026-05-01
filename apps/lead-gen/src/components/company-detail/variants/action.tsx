"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import {
  useGetCompanyQuery,
  useGetCompanyScrapedPostsQuery,
} from "@/__generated__/hooks";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { CompanyContactsClient } from "@/app/companies/[key]/contacts/contacts-client";
import { css } from "styled-system/css";
import {
  stepperRoot,
  stepperStep,
  stepperIndicator,
  stepperLabel,
  stepperConnector,
} from "@/recipes/stepper";
import { glassCard } from "@/recipes/cards";
import { accordionRoot, accordionItem, accordionTrigger, accordionContent, accordionIcon } from "@/recipes/accordion";
import {
  CompanyAvatar,
  CollapsibleChips,
} from "@/components/company-detail/shared/components";
import {
  coerceExternalUrl,
  prettyUrl,
  extractCompetitors,
  CATEGORY_COLORS,
  scoreColor,
  cleanCompanyTags,
} from "@/components/company-detail/shared/utils";
import {
  Avatar,
  Badge,
  Blockquote,
  Box,
  Callout,
  Card,
  Code,
  DropdownMenu,
  Em,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Skeleton,
  Strong,
  Text,
} from "@radix-ui/themes";
import { Button } from "@/components/ui";
import {
  CheckIcon,
  ChevronDownIcon,
  DotsHorizontalIcon,
  ExternalLinkIcon,
  GlobeIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  PersonIcon,
} from "@radix-ui/react-icons";

type Props = {
  companyKey?: string;
  companyId?: number;
};

// ─── Pipeline stepper ────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "completed";

interface PipelineStep {
  label: string;
  status: StepStatus;
}

function PipelineStepper({ steps }: { steps: PipelineStep[] }) {
  return (
    <Box py="4">
      <div className={stepperRoot()}>
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className={stepperStep()}>
              <div className={stepperIndicator({ status: step.status })}>
                {step.status === "completed" ? (
                  <CheckIcon width={14} height={14} />
                ) : (
                  <Text size="1">{i + 1}</Text>
                )}
              </div>
              <span className={stepperLabel({ status: step.status })}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={stepperConnector({
                  completed: step.status === "completed",
                })}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </Box>
  );
}

// ─── Deep analysis accordion ─────────────────────────────────────────────────

function DeepAnalysisAccordion({ markdown }: { markdown: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={accordionRoot()}>
      <div className={accordionItem()}>
        <button
          type="button"
          className={accordionTrigger()}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span>Deep analysis</span>
          <ChevronDownIcon className={accordionIcon({ open })} />
        </button>
        {open && (
          <div className={accordionContent()}>
            <Text size="2" as="div">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <Heading as="h1" size="5" weight="bold" mt="4" mb="2">
                      {children}
                    </Heading>
                  ),
                  h2: ({ children }) => (
                    <Heading as="h2" size="4" weight="bold" mt="3" mb="2">
                      {children}
                    </Heading>
                  ),
                  h3: ({ children }) => (
                    <Heading as="h3" size="3" weight="bold" mt="3" mb="1">
                      {children}
                    </Heading>
                  ),
                  p: ({ children }) => (
                    <Text as="p" size="2" color="gray" mb="3">
                      {children}
                    </Text>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ paddingLeft: "1.5em", marginBottom: "0.5em" }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ paddingLeft: "1.5em", marginBottom: "0.5em" }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: "0.25em" }}>{children}</li>
                  ),
                  strong: ({ children }) => <Strong>{children}</Strong>,
                  em: ({ children }) => <Em>{children}</Em>,
                  code: ({ children, className }) => {
                    const isBlock = className?.includes("language-");
                    return isBlock ? (
                      <Code
                        size="2"
                        style={{
                          display: "block",
                          overflowX: "auto",
                          padding: "0.5em 0.75em",
                        }}
                      >
                        {children}
                      </Code>
                    ) : (
                      <Code size="2">{children}</Code>
                    );
                  },
                  blockquote: ({ children }) => (
                    <Blockquote>{children}</Blockquote>
                  ),
                  hr: () => <Separator size="4" my="4" />,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity feed ────────────────────────────────────────────────────────────

interface FeedItem {
  key: string;
  timestamp: Date | null;
  source: string;
  summary: string;
  url?: string | null;
}

function ActivityFeed({ items }: { items: FeedItem[] }) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE = 10;
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return b.timestamp.getTime() - a.timestamp.getTime();
      }),
    [items],
  );
  const shown = expanded ? sorted : sorted.slice(0, VISIBLE);
  const hasMore = sorted.length > VISIBLE;

  if (items.length === 0) return null;

  return (
    <Card>
      <Box p="4">
        <Text
          size="2"
          color="gray"
          weight="medium"
          className={css({ letterSpacing: "0.1em" })}
        >
          ACTIVITY
        </Text>
        <Flex direction="column" gap="1" mt="3">
          {shown.map((item) => {
            const ago = item.timestamp
              ? formatDistanceToNow(item.timestamp, { addSuffix: true })
              : "";
            return (
              <Flex
                key={item.key}
                align="start"
                gap="2"
                py="1"
                className={css({
                  borderBottom: "1px solid",
                  borderColor: "gray.3",
                  _last: { borderBottom: "none" },
                })}
              >
                <Badge color="gray" variant="surface" size="1" style={{ flexShrink: 0, marginTop: "2px" }}>
                  {item.source}
                </Badge>
                <Text size="1" color="gray" style={{ flex: "1 1 0%", minWidth: 0 }}>
                  {item.url ? (
                    <RadixLink href={item.url} target="_blank" rel="noopener noreferrer" size="1">
                      {item.summary}
                    </RadixLink>
                  ) : (
                    item.summary
                  )}
                </Text>
                {ago && (
                  <Text size="1" color="gray" style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                    {ago}
                  </Text>
                )}
              </Flex>
            );
          })}
        </Flex>
        {hasMore && (
          <Box mt="3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
            >
              <ChevronDownIcon />
              {expanded
                ? "Show less"
                : `Show all (${sorted.length - VISIBLE} more)`}
            </Button>
          </Box>
        )}
      </Box>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CompanyDetailAction({ companyKey, companyId }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { loading, error, data } = useGetCompanyQuery({
    variables: companyId ? { id: companyId } : { key: companyKey },
    skip: !companyKey && !companyId,
    fetchPolicy: "cache-and-network",
  });

  const company = data?.company ?? null;
  const effectiveKey = companyKey ?? company?.key ?? "";

  const { data: scrapedPostsData } = useGetCompanyScrapedPostsQuery({
    variables: { companySlug: effectiveKey },
    skip: !isAdmin || !effectiveKey,
  });

  // ── Derived values ──────────────────────────────────────────────────────────

  const websiteHref = useMemo(
    () => coerceExternalUrl(company?.website),
    [company?.website],
  );

  const competitors = useMemo(
    () => extractCompetitors(company?.deep_analysis),
    [company?.deep_analysis],
  );

  const industries = company?.industries ?? [];
  const cleanTags = useMemo(
    () => cleanCompanyTags(company?.tags, industries),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [company?.tags, industries.join(",")],
  );

  const adminUrl = effectiveKey ? `/companies/${effectiveKey}` : "/companies";

  // ── Pipeline steps ──────────────────────────────────────────────────────────

  const pipelineSteps = useMemo((): PipelineStep[] => {
    const researched = Boolean(company?.description || company?.website);
    const enriched = Boolean(company?.deep_analysis);
    // contacts are not in the GetCompany fragment — hardcode false
    const contactFound = false;
    const outreachDrafted = false;
    const replied = false;

    const flags = [researched, enriched, contactFound, outreachDrafted, replied];
    const labels = ["Researched", "Enriched", "Contact found", "Outreach drafted", "Replied"];

    return labels.map((label, i) => {
      const done = flags[i];
      const prevDone = i === 0 || flags[i - 1];
      const status: StepStatus = done
        ? "completed"
        : prevDone
          ? "active"
          : "pending";
      return { label, status };
    });
  }, [company?.description, company?.website, company?.deep_analysis]);

  // ── Activity feed items ─────────────────────────────────────────────────────

  const feedItems = useMemo((): FeedItem[] => {
    if (!isAdmin) return [];
    const rawPosts = scrapedPostsData?.companyScrapedPosts?.posts ?? [];
    return rawPosts.slice(0, 50).map((p, idx) => {
      const ts = p.postedDate
        ? (() => {
            const parsed = parseISO(p.postedDate);
            return isValid(parsed) ? parsed : null;
          })()
        : null;
      const name = p.personName || "Unknown";
      const text = p.postText
        ? p.postText.length > 120
          ? p.postText.slice(0, 120) + "…"
          : p.postText
        : "(no text)";
      return {
        key: p.postUrl ?? `post-${idx}`,
        timestamp: ts,
        source: "Post",
        summary: `${name} — ${text}`,
        url: p.postUrl,
      };
    });
  }, [scrapedPostsData, isAdmin]);

  // ── Loading state ───────────────────────────────────────────────────────────

  if (loading && !company) {
    return (
      <Flex direction="column" gap="4" p="4">
        <Skeleton width="100%" height="40px" />
        <Skeleton width="100%" height="120px" />
        <Skeleton width="100%" height="80px" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box p="4">
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Failed to load company: {error.message}</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  if (!company) {
    return (
      <Box p="4">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  // ── Decision maker (not in fragment — no contacts array on company) ──────────
  // The GetCompany fragment does not include contacts; hardcode to null.
  const decisionMaker: null = null;

  const linkedinHref = coerceExternalUrl(company.linkedin_url);

  const categoryColor =
    (CATEGORY_COLORS[company.category] as
      | "blue"
      | "violet"
      | "amber"
      | "green"
      | "cyan"
      | "gray"
      | undefined) ?? "gray";

  return (
    <Flex direction="column" gap="4" p={{ initial: "3", sm: "5" }}>
      {/* 1. Pipeline status stepper */}
      <PipelineStepper steps={pipelineSteps} />

      {/* 2. Hero card */}
      <Card variant="surface">
        <Box className={glassCard()} style={{ borderRadius: "inherit" }}>
          <Flex
            direction={{ initial: "column", sm: "row" }}
            gap="4"
            align={{ initial: "start", sm: "center" }}
            justify="between"
          >
            {/* Left: identity */}
            <Flex gap="4" align="start" flexGrow="1" minWidth="0">
              <CompanyAvatar
                name={company.name}
                logoUrl={company.logo_url}
                size="6"
              />
              <Box flexGrow="1" minWidth="0">
                <Heading
                  size="6"
                  style={{ lineHeight: 1.2, overflowWrap: "break-word" }}
                >
                  {company.name}
                </Heading>
                <Flex align="center" gap="2" mt="2" wrap="wrap">
                  {company.category && (
                    <Badge color={categoryColor} variant="soft" radius="full">
                      {company.category}
                    </Badge>
                  )}
                  {company.size && (
                    <Badge color="blue" variant="surface" size="1">
                      {company.size}
                    </Badge>
                  )}
                  {company.location && (
                    <Badge color="gray" variant="surface" size="1">
                      {company.location}
                    </Badge>
                  )}
                  {company.score != null && (
                    <Badge
                      color={scoreColor(company.score)}
                      variant="soft"
                      radius="full"
                    >
                      ★ {company.score.toFixed(2)}
                    </Badge>
                  )}
                </Flex>
              </Box>
            </Flex>

            {/* Right: CTA + admin kebab */}
            <Flex direction="column" gap="2" align={{ initial: "start", sm: "end" }}>
              <Flex align="center" gap="2">
                {/* Primary CTA */}
                <Button
                  variant="gradient"
                  size="lg"
                  style={{
                    width: "auto",
                  }}
                >
                  Find decision maker
                </Button>

                {/* Admin kebab */}
                {isAdmin && (
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      <button
                        type="button"
                        className={css({
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          w: "8",
                          h: "8",
                          borderRadius: "md",
                          border: "1px solid",
                          borderColor: "ui.border",
                          bg: "transparent",
                          cursor: "pointer",
                          color: "ui.secondary",
                          _hover: { bg: "ui.surfaceHover" },
                        })}
                        aria-label="Admin tools"
                      >
                        <DotsHorizontalIcon />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      <DropdownMenu.Item asChild>
                        <Link href={adminUrl}>Full admin view</Link>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                )}
              </Flex>

              {/* Secondary links */}
              <Flex align="center" gap="3" wrap="wrap">
                {websiteHref && (
                  <Flex display="inline-flex" align="center" gap="1" asChild>
                    <RadixLink
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="2"
                      color="gray"
                    >
                      <GlobeIcon />
                      {prettyUrl(company.website) || "Website"}
                      <ExternalLinkIcon />
                    </RadixLink>
                  </Flex>
                )}
                {linkedinHref && (
                  <Flex display="inline-flex" align="center" gap="1" asChild>
                    <RadixLink
                      href={linkedinHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="2"
                      color="gray"
                    >
                      <LinkedInLogoIcon />
                      LinkedIn
                      <ExternalLinkIcon />
                    </RadixLink>
                  </Flex>
                )}
              </Flex>
            </Flex>
          </Flex>
        </Box>
      </Card>

      {/* 3. Decision-maker card */}
      {decisionMaker !== null ? (
        (() => {
          // This block is unreachable given hardcoded null above,
          // but typed to satisfy the shape if wired in future.
          const dm = decisionMaker as {
            firstName: string;
            lastName: string;
            email?: string | null;
            linkedinUrl?: string | null;
            position?: string | null;
          };
          const name = `${dm.firstName} ${dm.lastName}`.trim();
          const initials = name
            .split(/\s+/)
            .slice(0, 2)
            .map((w) => w[0] ?? "")
            .join("")
            .toUpperCase();
          const emailHref = dm.email ? `mailto:${dm.email}` : null;
          const liHref = coerceExternalUrl(dm.linkedinUrl);
          return (
            <Card>
              <Box p="4">
                <Flex align="center" gap="3">
                  <Avatar
                    size="4"
                    fallback={initials}
                    radius="full"
                    color="indigo"
                  />
                  <Box flexGrow="1" minWidth="0">
                    <Text size="2" weight="bold">
                      {name}
                    </Text>
                    {dm.position && (
                      <Text size="1" color="gray">
                        {dm.position}
                      </Text>
                    )}
                    <Flex align="center" gap="2" mt="1">
                      {emailHref && (
                        <RadixLink href={emailHref} size="1">
                          {dm.email}
                        </RadixLink>
                      )}
                      {liHref && (
                        <RadixLink
                          href={liHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="1"
                        >
                          <LinkedInLogoIcon />
                        </RadixLink>
                      )}
                    </Flex>
                  </Box>
                  {effectiveKey && (
                    <Button size="sm" variant="solid">
                      <Link
                        href={`/companies/${effectiveKey}/campaigns/new`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        Draft email
                      </Link>
                    </Button>
                  )}
                </Flex>
              </Box>
            </Card>
          );
        })()
      ) : (
        <Callout.Root color="gray">
          <Callout.Icon>
            <PersonIcon />
          </Callout.Icon>
          <Callout.Text>
            No decision maker identified yet — run discovery from the{" "}
            <RadixLink href={adminUrl} size="2">
              admin view
            </RadixLink>
            .
          </Callout.Text>
        </Callout.Root>
      )}

      {/* 4. Activity feed */}
      {isAdmin && <ActivityFeed items={feedItems} />}

      {/* 5. Deep analysis (collapsed by default) */}
      {company.deep_analysis && (
        <DeepAnalysisAccordion markdown={company.deep_analysis} />
      )}

      {/* 6. Tags + industries + competitors */}
      {(industries.length > 0 ||
        cleanTags.length > 0 ||
        competitors.length > 0) && (
        <Card>
          <Box p="4">
            <Flex direction="column" gap="3">
              {(industries.length > 0 || cleanTags.length > 0) && (
                <Flex gap="2" wrap="wrap" align="center">
                  {industries.map((ind) => (
                    <Link
                      key={`ind-${ind}`}
                      href={`/companies?tag=${encodeURIComponent(ind)}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Badge
                        color="blue"
                        variant="soft"
                        size="1"
                        style={{ cursor: "pointer" }}
                      >
                        {ind}
                      </Badge>
                    </Link>
                  ))}
                  {cleanTags.length > 0 && (
                    <CollapsibleChips items={cleanTags} visibleCount={8} />
                  )}
                </Flex>
              )}
              {competitors.length > 0 && (
                <Flex gap="2" wrap="wrap">
                  <Text size="1" color="gray" weight="medium">
                    Competitors:
                  </Text>
                  {competitors.map((c) => (
                    <Badge
                      key={c}
                      asChild
                      color="violet"
                      variant="soft"
                      radius="full"
                    >
                      <Link href={`/companies?q=${encodeURIComponent(c)}`}>
                        {c}
                      </Link>
                    </Badge>
                  ))}
                </Flex>
              )}
            </Flex>
          </Box>
        </Card>
      )}

      {/* 7. Embedded contacts (admin only) */}
      {isAdmin && company.id && effectiveKey && (
        <CompanyContactsClient companyKey={effectiveKey} embedded />
      )}
    </Flex>
  );
}
