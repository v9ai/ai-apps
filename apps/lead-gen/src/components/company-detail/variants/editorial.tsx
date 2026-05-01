"use client";

import * as React from "react";
import { useMemo } from "react";
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
import { glassCard, pipelineCard } from "@/recipes/cards";
import {
  CompanyAvatar,
  CollapsibleChips,
  SectionCard,
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
  Badge,
  Box,
  Callout,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Skeleton,
  Strong,
  Text,
  DropdownMenu,
} from "@radix-ui/themes";
import { Button } from "@/components/ui";
import {
  GlobeIcon,
  LinkedInLogoIcon,
  ExternalLinkIcon,
  BookmarkIcon,
  DotsHorizontalIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";

type Props = {
  companyKey?: string;
  companyId?: number;
};

const dropCapClass = css({
  "& > p:first-child::first-letter": {
    float: "left",
    fontSize: "5xl",
    lineHeight: 1,
    marginRight: "2",
    marginTop: "1",
    color: "accent.primary",
    fontFamily: "var(--font-instrument)",
    fontWeight: "400",
  },
});

const analysisColumnClass = css({
  maxWidth: "68ch",
  mx: "auto",
});

function oppStatusColor(
  status: string,
): "green" | "blue" | "orange" | "yellow" | "red" | "gray" {
  if (status === "offer") return "green";
  if (status === "open") return "blue";
  if (status === "applied") return "orange";
  if (status === "interviewing") return "yellow";
  if (status === "rejected") return "red";
  return "gray";
}

export function CompanyDetailEditorial({ companyKey, companyId }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { loading, error, data } = useGetCompanyQuery({
    variables: companyId ? { id: companyId } : { key: companyKey },
    skip: !companyKey && !companyId,
    fetchPolicy: "cache-and-network",
  });

  const company = data?.company ?? null;
  const effectiveKey = companyKey ?? company?.key ?? company?.id?.toString() ?? "";

  const { data: scrapedPostsData } = useGetCompanyScrapedPostsQuery({
    variables: { companySlug: effectiveKey },
    skip: !isAdmin || !effectiveKey,
  });
  const posts = scrapedPostsData?.companyScrapedPosts?.posts ?? [];

  const websiteHref = useMemo(
    () => coerceExternalUrl(company?.website),
    [company?.website],
  );
  const websiteLabel = useMemo(
    () => prettyUrl(company?.website),
    [company?.website],
  );
  const linkedinHref = useMemo(
    () => coerceExternalUrl(company?.linkedin_url),
    [company?.linkedin_url],
  );
  const competitors = useMemo(
    () => extractCompetitors(company?.deep_analysis),
    [company?.deep_analysis],
  );
  const industries = useMemo(
    () => company?.industries ?? [],
    [company?.industries],
  );
  const cleanTags = useMemo(
    () => cleanCompanyTags(company?.tags, industries),
    [company?.tags, industries],
  );
  const scrapedEmails = (company?.emailsList ?? []).filter(Boolean);

  // Admin overflow menu links back to the original view for full admin actions
  const adminViewHref = effectiveKey ? `/companies/${effectiveKey}` : "/companies";

  if (loading) {
    return (
      <Flex direction="column" gap="5">
        <Skeleton height="140px" width="100%" />
        <Skeleton height="48px" width="100%" />
        <Skeleton height="200px" width="100%" />
      </Flex>
    );
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

  return (
    <Flex direction="column" gap="6">
      {/* 1. Hero band */}
      <Box className={glassCard({ variant: "accent" })}>
        <Flex
          direction={{ initial: "column", sm: "row" }}
          gap="5"
          align={{ initial: "start", sm: "center" }}
          justify="between"
        >
          {/* Left: avatar + name + meta strip */}
          <Flex gap="4" align="start" flexGrow="1" minWidth="0">
            <CompanyAvatar
              name={company.name}
              logoUrl={company.logo_url}
              size="7"
            />
            <Box flexGrow="1" minWidth="0">
              <Heading
                size="8"
                style={{
                  fontFamily: "var(--font-instrument)",
                  fontWeight: 400,
                  lineHeight: 1.15,
                  overflowWrap: "break-word",
                }}
              >
                {company.name}
              </Heading>

              {/* Meta strip */}
              <Flex align="center" gap="3" mt="2" wrap="wrap">
                {websiteHref && (
                  <Flex align="center" gap="1">
                    <GlobeIcon />
                    <RadixLink
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="gray"
                      size="2"
                      truncate
                    >
                      {websiteLabel || websiteHref}
                    </RadixLink>
                  </Flex>
                )}

                {linkedinHref && (
                  <Flex align="center" gap="1">
                    <LinkedInLogoIcon />
                    <RadixLink
                      href={linkedinHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="gray"
                      size="2"
                    >
                      LinkedIn
                    </RadixLink>
                  </Flex>
                )}

                {company.category && (
                  <Badge
                    color={
                      (CATEGORY_COLORS[company.category] ?? "gray") as
                        | "blue"
                        | "violet"
                        | "amber"
                        | "green"
                        | "cyan"
                        | "gray"
                    }
                    variant="soft"
                    radius="full"
                    size="1"
                  >
                    {company.category}
                  </Badge>
                )}

                {company.size && (
                  <Text size="2" color="gray">
                    {company.size}
                  </Text>
                )}

                {company.location && (
                  <Text size="2" color="gray">
                    {company.location}
                  </Text>
                )}

                {company.score != null && (
                  <Badge
                    color={scoreColor(company.score)}
                    variant="soft"
                    radius="full"
                    size="1"
                  >
                    ★ {company.score.toFixed(2)}
                  </Badge>
                )}
              </Flex>
            </Box>
          </Flex>

          {/* Right: CTAs + admin overflow */}
          <Flex
            gap="2"
            align="center"
            flexShrink="0"
            wrap="wrap"
            justify={{ initial: "start", sm: "end" }}
          >
            {websiteHref && (
              <Button variant="solid" size="sm" asChild>
                <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLinkIcon />
                  Visit website
                </a>
              </Button>
            )}

            {linkedinHref && (
              <Button variant="outline" size="sm" asChild>
                <a href={linkedinHref} target="_blank" rel="noopener noreferrer">
                  <LinkedInLogoIcon />
                  View on LinkedIn
                </a>
              </Button>
            )}

            {isAdmin && (
              <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                  <Button variant="ghost" size="sm">
                    <DotsHorizontalIcon />
                  </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="end" size="2">
                  <DropdownMenu.Item asChild>
                    <Link href={adminViewHref}>Switch to admin view</Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Root>
            )}
          </Flex>
        </Flex>
      </Box>

      {/* 2. Industries strip */}
      {industries.length > 0 && (
        <Flex gap="2" wrap="wrap">
          {industries.map((ind) => (
            <Link
              key={`ind-${ind}`}
              href={`/companies?tag=${encodeURIComponent(ind)}`}
              style={{ textDecoration: "none" }}
            >
              <Box className={css({ display: "inline-flex" })}>
                <Badge
                  color="blue"
                  variant="soft"
                  size="2"
                  style={{ cursor: "pointer" }}
                >
                  <BookmarkIcon />
                  {ind}
                </Badge>
              </Box>
            </Link>
          ))}
        </Flex>
      )}

      {/* 3. Tags chip cloud */}
      {cleanTags.length > 0 && (
        <CollapsibleChips items={cleanTags} visibleCount={10} />
      )}

      {/* 4. Editorial deep-analysis column */}
      {company.deep_analysis && (
        <SectionCard title="Deep Analysis">
          <Box className={`${analysisColumnClass} ${dropCapClass}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <Heading as="h1" size="5" weight="bold" mt="4" mb="2">
                    {children}
                  </Heading>
                ),
                h2: ({ children }) => (
                  <>
                    <Heading as="h2" size="4" weight="bold" mt="4" mb="2">
                      {children}
                    </Heading>
                    <Separator size="2" mb="3" />
                  </>
                ),
                h3: ({ children }) => (
                  <Heading as="h3" size="3" weight="bold" mt="3" mb="1">
                    {children}
                  </Heading>
                ),
                p: ({ children }) => (
                  <Text as="p" size="3" color="gray" mb="3">
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
                  <li style={{ marginBottom: "0.25em" }}>
                    <Text size="3" color="gray">
                      {children}
                    </Text>
                  </li>
                ),
                strong: ({ children }) => <Strong>{children}</Strong>,
                hr: () => <Separator size="4" my="4" />,
              }}
            >
              {company.deep_analysis}
            </ReactMarkdown>
          </Box>
        </SectionCard>
      )}

      {/* 5. Opportunities */}
      {company.opportunities && company.opportunities.length > 0 && (
        <SectionCard title={`Opportunities (${company.opportunities.length})`}>
          <Flex direction="column" gap="3">
            {company.opportunities.map((opp) => (
              <Box key={opp.id} className={pipelineCard()}>
                <Flex align="center" gap="3" justify="between" wrap="wrap">
                  <Flex direction="column" gap="1" flexGrow="1" minWidth="0">
                    {opp.url ? (
                      <RadixLink
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="3"
                        weight="medium"
                        truncate
                      >
                        {opp.title}
                      </RadixLink>
                    ) : (
                      <Text size="3" weight="medium" truncate>
                        {opp.title}
                      </Text>
                    )}
                  </Flex>
                  <Flex align="center" gap="2" flexShrink="0">
                    {opp.score != null && (
                      <Text size="1" color="gray">
                        {opp.score}
                      </Text>
                    )}
                    <Badge
                      color={oppStatusColor(opp.status ?? "")}
                      variant="soft"
                      size="1"
                    >
                      {opp.status}
                    </Badge>
                    {opp.applied && (
                      <Badge color="green" variant="soft" size="1">
                        Applied
                      </Badge>
                    )}
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        </SectionCard>
      )}

      {/* 6. Competitors */}
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

      {/* 7. Scraped emails — admin only */}
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

      {/* 8. Posts — admin only */}
      {isAdmin && posts.length > 0 && (
        <SectionCard title={`Posts (${posts.length})`}>
          <Flex direction="column" gap="1">
            {posts.map((p, idx) => {
              const name = p.personName ?? "Unknown";
              const text = p.postText
                ? p.postText.length > 150
                  ? `${p.postText.slice(0, 150)}…`
                  : p.postText
                : "(no text)";
              let ago = "";
              if (p.postedDate) {
                const parsed = parseISO(p.postedDate);
                if (isValid(parsed)) {
                  ago = formatDistanceToNow(parsed, { addSuffix: false });
                } else {
                  ago = p.postedDate;
                }
              }
              return (
                <Flex
                  key={p.postUrl ?? idx}
                  align="start"
                  gap="2"
                  py="1"
                  className={css({
                    borderBottom: "1px solid",
                    borderColor: "gray.3",
                  })}
                >
                  <Text
                    size="1"
                    weight="medium"
                    style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    {name}
                  </Text>
                  <Text
                    size="1"
                    color="gray"
                    style={{ flex: "1 1 0%", minWidth: 0 }}
                  >
                    {text}
                  </Text>
                  <Flex align="center" gap="2" flexShrink="0">
                    {ago && (
                      <Text size="1" color="gray">
                        {ago}
                      </Text>
                    )}
                    {p.postUrl && (
                      <RadixLink
                        href={p.postUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="1"
                      >
                        <ExternalLinkIcon />
                      </RadixLink>
                    )}
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        </SectionCard>
      )}

      {/* 9. Embedded contacts — admin only */}
      {isAdmin && company.id && effectiveKey && (
        <CompanyContactsClient companyKey={effectiveKey} embedded />
      )}
    </Flex>
  );
}
