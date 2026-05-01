"use client";

import * as React from "react";
import { useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  useGetCompanyQuery,
  useGetCompanyScrapedPostsQuery,
  useEnhanceCompanyMutation,
  useFindDecisionMakerMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { CompanyContactsClient } from "@/app/companies/[key]/contacts/contacts-client";
import {
  CompanyAvatar,
  CollapsibleChips,
  SectionCard,
} from "@/components/company-detail/shared/components";
import {
  coerceExternalUrl,
  prettyUrl,
  extractCompetitors,
  extractCrawlMeta,
  CATEGORY_COLORS,
  scoreColor,
  cleanCompanyTags,
} from "@/components/company-detail/shared/utils";
import { metricCard } from "@/recipes/cards";
import { css } from "styled-system/css";
import { Button } from "@/components/ui";
import {
  Badge,
  Blockquote,
  Box,
  Callout,
  Card,
  Code,
  DropdownMenu,
  Em,
  Flex,
  Grid,
  Heading,
  Link as RadixLink,
  Separator,
  Skeleton,
  Strong,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import {
  DotsHorizontalIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagicWandIcon,
  PersonIcon,
} from "@radix-ui/react-icons";

type Props = {
  companyKey?: string;
  companyId?: number;
};

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------

function KpiStrip({
  score,
  contactsCount,
  opportunitiesCount,
  updatedAt,
}: {
  score: number | null | undefined;
  contactsCount: number;
  opportunitiesCount: number;
  updatedAt: string | null | undefined;
}) {
  const scoreVariant =
    score === 1.0
      ? ("positive" as const)
      : score != null && score >= 0.7
        ? ("highlighted" as const)
        : ("default" as const);

  const lastEnriched = useMemo(() => {
    if (!updatedAt) return "—";
    const d = parseISO(updatedAt);
    if (!isValid(d)) return updatedAt;
    return formatDistanceToNow(d, { addSuffix: true });
  }, [updatedAt]);

  return (
    <Grid columns={{ initial: "2", md: "4" }} gap="3">
      <div className={metricCard({ size: "md", variant: scoreVariant })}>
        <Text size="6" weight="bold" color={scoreColor(score)}>
          {score != null ? score.toFixed(2) : "—"}
        </Text>
        <Text size="1" color="gray">
          Score
        </Text>
      </div>

      <div className={metricCard({ size: "md", variant: "default" })}>
        <Text size="6" weight="bold">
          {contactsCount > 0 ? contactsCount : "—"}
        </Text>
        <Text size="1" color="gray">
          Contacts
        </Text>
      </div>

      <div className={metricCard({ size: "md", variant: "default" })}>
        <Text size="6" weight="bold">
          {opportunitiesCount}
        </Text>
        <Text size="1" color="gray">
          Opportunities
        </Text>
      </div>

      <div className={metricCard({ size: "md", variant: "default" })}>
        <Text size="6" weight="bold" className={css({ fontSize: "var(--font-size-3) !important" })}>
          {lastEnriched}
        </Text>
        <Text size="1" color="gray">
          Last enriched
        </Text>
      </div>
    </Grid>
  );
}

// ---------------------------------------------------------------------------
// Key facts sidebar card content
// ---------------------------------------------------------------------------

function KeyFactsContent({
  linkedinUrl,
  jobBoardUrl,
  updatedAt,
  aiConfidence,
  crawlMeta,
  isAdmin,
}: {
  linkedinUrl?: string | null;
  jobBoardUrl?: string | null;
  updatedAt?: string | null;
  aiConfidence?: number | null;
  crawlMeta?: { pages: number; date: string } | null;
  isAdmin: boolean;
}) {
  const linkedinHref = coerceExternalUrl(linkedinUrl);
  const jobBoardHref = coerceExternalUrl(jobBoardUrl);

  return (
    <Flex direction="column" gap="2">
      {linkedinHref && (
        <Flex align="center" gap="2">
          <LinkedInLogoIcon />
          <RadixLink href={linkedinHref} target="_blank" rel="noopener noreferrer" size="2" truncate>
            {prettyUrl(linkedinUrl) || "LinkedIn"}
          </RadixLink>
          <ExternalLinkIcon />
        </Flex>
      )}
      {jobBoardHref && (
        <Flex align="center" gap="2">
          <Text size="2" color="gray">Careers:</Text>
          <RadixLink href={jobBoardHref} target="_blank" rel="noopener noreferrer" size="2" truncate>
            {prettyUrl(jobBoardUrl) || "Job board"}
          </RadixLink>
          <ExternalLinkIcon />
        </Flex>
      )}
      {crawlMeta && (
        <Text size="2" color="gray">
          Crawled <Strong>{crawlMeta.pages}</Strong>{" "}
          {crawlMeta.pages === 1 ? "page" : "pages"} ·{" "}
          {new Date(`${crawlMeta.date}T00:00:00Z`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      )}
      {updatedAt && (
        <Text size="2" color="gray">
          Updated{" "}
          {new Date(updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      )}
      {isAdmin && aiConfidence != null && (
        <Text size="2" color="gray">
          AI confidence: <Strong>{aiConfidence.toFixed(2)}</Strong>
        </Text>
      )}
    </Flex>
  );
}

// ---------------------------------------------------------------------------
// Post card (posts timeline)
// ---------------------------------------------------------------------------

function PostCard({
  personName,
  personHeadline,
  postText,
  postUrl,
  reactionsCount,
  commentsCount,
  postedDate,
}: {
  personName: string;
  personHeadline: string | null | undefined;
  postText: string | null | undefined;
  postUrl: string | null | undefined;
  reactionsCount: number;
  commentsCount: number;
  postedDate: string | null | undefined;
}) {
  const [hovered, setHovered] = React.useState(false);

  const ago = useMemo(() => {
    if (!postedDate) return "";
    const parsed = parseISO(postedDate);
    if (!isValid(parsed)) return postedDate;
    return formatDistanceToNow(parsed, { addSuffix: true });
  }, [postedDate]);

  return (
    <Card
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={css({ transition: "box-shadow 150ms ease" })}
    >
      <Box p="3">
        <Flex align="start" gap="3">
          <CompanyAvatar name={personName} logoUrl={null} size="2" />
          <Box flexGrow="1" minWidth="0">
            <Flex align="center" justify="between" gap="2" mb="1">
              <Flex align="center" gap="2" flexWrap="wrap">
                <Text size="2" weight="medium">
                  {personName}
                </Text>
                {personHeadline && (
                  <Text size="1" color="gray" truncate>
                    {personHeadline}
                  </Text>
                )}
              </Flex>
              <Flex align="center" gap="2" flexShrink="0">
                {ago && (
                  <Text size="1" color="gray">
                    {ago}
                  </Text>
                )}
                {hovered && postUrl && (
                  <Tooltip content="Open post">
                    <RadixLink href={postUrl} target="_blank" rel="noopener noreferrer" size="1">
                      <ExternalLinkIcon />
                    </RadixLink>
                  </Tooltip>
                )}
              </Flex>
            </Flex>
            {postText && (
              <Text
                as="p"
                size="2"
                color="gray"
                className={css({
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                })}
              >
                {postText}
              </Text>
            )}
            {(reactionsCount > 0 || commentsCount > 0) && (
              <Flex align="center" gap="3" mt="2">
                {reactionsCount > 0 && (
                  <Text size="1" color="gray">
                    {reactionsCount} reactions
                  </Text>
                )}
                {commentsCount > 0 && (
                  <Text size="1" color="gray">
                    {commentsCount} comments
                  </Text>
                )}
              </Flex>
            )}
          </Box>
        </Flex>
      </Box>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Markdown components map (mirrors company-detail.tsx)
// ---------------------------------------------------------------------------

const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
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
    <ul style={{ paddingLeft: "1.5em", marginBottom: "0.5em" }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{ paddingLeft: "1.5em", marginBottom: "0.5em" }}>{children}</ol>
  ),
  li: ({ children }) => <li style={{ marginBottom: "0.25em" }}>{children}</li>,
  strong: ({ children }) => <Strong>{children}</Strong>,
  em: ({ children }) => <Em>{children}</Em>,
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    return isBlock ? (
      <Code
        size="2"
        style={{ display: "block", overflowX: "auto", padding: "0.5em 0.75em" }}
      >
        {children}
      </Code>
    ) : (
      <Code size="2">{children}</Code>
    );
  },
  blockquote: ({ children }) => <Blockquote>{children}</Blockquote>,
  hr: () => <Separator size="4" my="4" />,
};

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <Flex direction="column" gap="4">
      {/* Header row */}
      <Flex align="center" justify="between" gap="4">
        <Flex align="center" gap="3" flexGrow="1">
          <Skeleton width="40px" height="40px" style={{ borderRadius: "50%" }} />
          <Skeleton height="28px" width="200px" />
          <Skeleton height="20px" width="80px" />
        </Flex>
        <Flex gap="2">
          <Skeleton height="32px" width="90px" />
          <Skeleton height="32px" width="140px" />
          <Skeleton height="32px" width="32px" />
        </Flex>
      </Flex>

      {/* KPI strip */}
      <Grid columns={{ initial: "2", md: "4" }} gap="3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height="100px" />
        ))}
      </Grid>

      {/* Body */}
      <Skeleton height="300px" />
    </Flex>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function CompanyDetailDashboard({ companyKey, companyId }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { loading, error, data, refetch } = useGetCompanyQuery({
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
  const posts = scrapedPostsData?.companyScrapedPosts?.posts ?? [];

  const [enhanceCompany, { loading: isEnhancing }] = useEnhanceCompanyMutation({
    onCompleted: () => refetch(),
  });

  const [findDecisionMaker, { loading: isFindingDm }] = useFindDecisionMakerMutation({
    onCompleted: () => refetch(),
  });

  const handleEnhance = useCallback(async () => {
    if (!company) return;
    await enhanceCompany({ variables: { id: company.id, key: company.key } });
  }, [company, enhanceCompany]);

  const handleFindDm = useCallback(async () => {
    if (!company) return;
    await findDecisionMaker({ variables: { id: company.id, key: company.key } });
  }, [company, findDecisionMaker]);

  const competitors = useMemo(
    () => extractCompetitors(company?.deep_analysis),
    [company?.deep_analysis],
  );
  const crawlMeta = useMemo(
    () => extractCrawlMeta(company?.deep_analysis),
    [company?.deep_analysis],
  );
  const industries = useMemo(() => company?.industries ?? [], [company?.industries]);
  const cleanTags = useMemo(
    () => cleanCompanyTags(company?.tags, industries),
    [company?.tags, industries],
  );
  const scrapedEmails = useMemo(
    () => (company?.emailsList ?? []).filter(Boolean),
    [company?.emailsList],
  );
  const websiteHref = useMemo(
    () => coerceExternalUrl(company?.website),
    [company?.website],
  );

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>
          <Strong>Error loading company:</Strong> {error.message}
        </Callout.Text>
      </Callout.Root>
    );
  }

  if (!company) {
    return (
      <Callout.Root>
        <Callout.Icon>
          <InfoCircledIcon />
        </Callout.Icon>
        <Callout.Text>Company not found.</Callout.Text>
      </Callout.Root>
    );
  }

  const categoryColor = (CATEGORY_COLORS[company.category] ?? "gray") as
    | "blue"
    | "violet"
    | "amber"
    | "green"
    | "cyan"
    | "gray";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Flex direction="column" gap="5">
      {/* 1. Compact header */}
      <Flex align="center" justify="between" gap="4" wrap="wrap">
        <Flex align="center" gap="3" flexGrow="1" minWidth="0">
          <CompanyAvatar name={company.name} logoUrl={company.logo_url} size="5" />
          <Flex align="baseline" gap="2" flexWrap="wrap" minWidth="0">
            <Heading size="5" style={{ lineHeight: 1.2 }} truncate>
              {company.name}
            </Heading>
            {company.category && (
              <Badge color={categoryColor} variant="soft" radius="full">
                {company.category}
              </Badge>
            )}
            {websiteHref && (
              <RadixLink
                href={websiteHref}
                target="_blank"
                rel="noopener noreferrer"
                size="1"
                color="gray"
                truncate
              >
                {prettyUrl(company.website)}
              </RadixLink>
            )}
          </Flex>
        </Flex>

        <Flex align="center" gap="2" flexShrink="0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleEnhance}
            loading={isEnhancing}
            loadingText="Enhancing…"
          >
            <MagicWandIcon />
            Enhance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFindDm}
            loading={isFindingDm}
            loadingText="Searching…"
          >
            <PersonIcon />
            Find decision maker
          </Button>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="outline" size="sm" aria-label="More actions">
                <DotsHorizontalIcon />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item asChild>
                <Link href={`/companies/${effectiveKey}?ux=`}>
                  Switch to admin view
                </Link>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Flex>

      {/* 2. KPI strip */}
      <KpiStrip
        score={company.score}
        contactsCount={company.contacts?.length ?? 0}
        opportunitiesCount={company.opportunities?.length ?? 0}
        updatedAt={company.updated_at}
      />

      {/* 3. Two-column body */}
      <Flex direction={{ initial: "column", lg: "row" }} gap="5" align="start">
        {/* Main column */}
        <Box style={{ flex: "1 1 0", minWidth: 0 }}>
          <Flex direction="column" gap="4">
            {/* Deep analysis */}
            {company.deep_analysis && (
              <SectionCard title="Deep Analysis">
                <Text size="2" as="div">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {company.deep_analysis}
                  </ReactMarkdown>
                </Text>
              </SectionCard>
            )}

            {/* Posts timeline — admin only */}
            {isAdmin && posts.length > 0 && (
              <SectionCard title={`Posts (${posts.length})`}>
                <Flex direction="column" gap="3">
                  {posts.map((post, idx) => (
                    <PostCard
                      key={post.postUrl ?? idx}
                      personName={post.personName || "Unknown"}
                      personHeadline={post.personHeadline}
                      postText={post.postText}
                      postUrl={post.postUrl}
                      reactionsCount={post.reactionsCount}
                      commentsCount={post.commentsCount}
                      postedDate={post.postedDate}
                    />
                  ))}
                </Flex>
              </SectionCard>
            )}
          </Flex>
        </Box>

        {/* Sidebar */}
        <Box
          style={{ width: "320px", flexShrink: 0 }}
          className={css({
            lg: {
              position: "sticky",
              top: "16",
            },
          })}
        >
          <Flex direction="column" gap="4">
            {/* Key facts */}
            <SectionCard title="Key facts">
              <KeyFactsContent
                linkedinUrl={company.linkedin_url}
                jobBoardUrl={company.job_board_url}
                updatedAt={company.updated_at}
                aiConfidence={company.ai_classification_confidence}
                crawlMeta={crawlMeta}
                isAdmin={isAdmin}
              />
            </SectionCard>

            {/* Industries */}
            {industries.length > 0 && (
              <SectionCard title="Industries">
                <Flex gap="2" wrap="wrap">
                  {industries.map((ind) => (
                    <Badge key={ind} asChild color="blue" variant="soft" size="1">
                      <Link href={`/companies?tag=${encodeURIComponent(ind)}`}>{ind}</Link>
                    </Badge>
                  ))}
                </Flex>
              </SectionCard>
            )}

            {/* Tags */}
            {cleanTags.length > 0 && (
              <SectionCard title="Tags">
                <CollapsibleChips items={cleanTags} visibleCount={8} />
              </SectionCard>
            )}

            {/* Competitors */}
            {competitors.length > 0 && (
              <SectionCard title={`Competitors (${competitors.length})`}>
                <Flex gap="2" wrap="wrap">
                  {competitors.map((c) => (
                    <Badge key={c} asChild color="violet" variant="soft" radius="full">
                      <Link href={`/companies?q=${encodeURIComponent(c)}`}>{c}</Link>
                    </Badge>
                  ))}
                </Flex>
              </SectionCard>
            )}

            {/* Scraped emails — admin only */}
            {isAdmin && scrapedEmails.length > 0 && (
              <SectionCard title={`Scraped emails (${scrapedEmails.length})`}>
                <Flex direction="column" gap="1">
                  {scrapedEmails.map((email) => (
                    <RadixLink key={email} href={`mailto:${email}`} size="2">
                      {email}
                    </RadixLink>
                  ))}
                </Flex>
              </SectionCard>
            )}
          </Flex>
        </Box>
      </Flex>

      {/* 4. Embedded contacts — full width, admin only */}
      {isAdmin && company.id && effectiveKey && (
        <CompanyContactsClient companyKey={effectiveKey} embedded />
      )}
    </Flex>
  );
}
