"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useGetContactQuery,
  useGetContactEmailsQuery,
  useGetContactOpportunitiesQuery,
  useFindContactEmailMutation,
} from "@/__generated__/hooks";
import {
  Badge,
  Box,
  Callout,
  Card,
  Code,
  Container,
  Flex,
  Heading,
  Link as RadixLink,
  Spinner,
  Text,
} from "@radix-ui/themes";
import { Button } from "@/components/ui";
import {
  CheckIcon,
  ChevronDownIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagicWandIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import {
  ContactAvatar,
  Chip,
  SectionCard,
} from "@/components/contact-detail/shared/components";
import {
  fullName,
  coerceExternalUrl,
  formatExperienceRange,
  cleanContactTags,
} from "@/components/contact-detail/shared/utils";
import { FollowUpEmailDialog } from "@/components/emails/follow-up-email-dialog";

type Props = {
  contactId?: number;
  contactSlug?: string;
};

// ─── Pipeline stepper ────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "completed";

interface PipelineStep {
  label: string;
  status: StepStatus;
}

const stepperWrap = css({
  display: "flex",
  alignItems: { base: "stretch", sm: "center" },
  flexDirection: { base: "column", sm: "row" },
  gap: { base: "2", sm: "0" },
  width: "100%",
});

const stepperConnector = css({
  flex: { base: "none", sm: 1 },
  height: { base: "12px", sm: "1px" },
  width: { base: "1px", sm: "auto" },
  minWidth: { base: 0, sm: "16px" },
  mx: { base: "0", sm: "2" },
  ml: { base: "16px", sm: "2" },
});

const rowDivider = css({
  py: "2",
  borderBottom: "1px solid",
  borderColor: "ui.border",
  _last: { borderBottom: "none" },
});

const truncateText: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const heroBtnStyle: React.CSSProperties = {
  minWidth: "240px",
  height: "52px",
  fontSize: "16px",
};

function PipelineStepper({ steps }: { steps: PipelineStep[] }) {
  return (
    <Box py="3" width="100%">
      <div className={stepperWrap}>
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <Badge
              color={
                step.status === "completed"
                  ? "green"
                  : step.status === "active"
                    ? "indigo"
                    : "gray"
              }
              variant={step.status === "pending" ? "surface" : "solid"}
              radius="full"
              size="2"
              style={{ whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {step.status === "completed" ? (
                <CheckIcon width={12} height={12} />
              ) : (
                <span>{i + 1}</span>
              )}{" "}
              {step.label}
            </Badge>
            {i < steps.length - 1 && (
              <div
                className={stepperConnector}
                style={{
                  background:
                    step.status === "completed"
                      ? "var(--accent-9)"
                      : "var(--gray-a6)",
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </Box>
  );
}

// ─── Accordion (HTML <details>) ──────────────────────────────────────────────

function Accordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "lg",
        overflow: "hidden",
        bg: "ui.surface",
      })}
    >
      <summary
        className={css({
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4",
          fontSize: "sm",
          fontWeight: 500,
          cursor: "pointer",
          listStyle: "none",
          color: "ui.heading",
          _hover: { bg: "ui.surfaceHover" },
          "&::-webkit-details-marker": { display: "none" },
        })}
      >
        <span>{title}</span>
        <ChevronDownIcon
          className={css({
            width: "16px",
            height: "16px",
            color: "ui.tertiary",
            transition: "transform 200ms ease",
            "details[open] &": { transform: "rotate(180deg)" },
          })}
        />
      </summary>
      <Box px="4" pb="4">
        {children}
      </Box>
    </details>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ContactDetailAction({ contactId, contactSlug }: Props) {
  const { data, loading, refetch } = useGetContactQuery({
    variables: contactId ? { id: contactId } : { slug: contactSlug },
    skip: !contactId && !contactSlug,
    fetchPolicy: "cache-and-network",
  });

  const contact = data?.contact ?? null;
  const resolvedId = contact?.id;

  const { data: emailsData } = useGetContactEmailsQuery({
    variables: { contactId: resolvedId! },
    skip: !resolvedId,
  });

  const { data: opportunitiesData } = useGetContactOpportunitiesQuery({
    variables: { contactId: resolvedId! },
    skip: !resolvedId,
  });

  const [findEmail, { loading: finding }] = useFindContactEmailMutation();

  const [findStatus, setFindStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [scrapeStatus, setScrapeStatus] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [scraping, setScraping] = useState(false);

  const outboundEmails = emailsData?.contactEmails ?? [];
  const inboundEmails = emailsData?.contactReceivedEmails ?? [];
  const hasOutbound = outboundEmails.length > 0;
  const hasInbound = inboundEmails.length > 0;

  const pipelineSteps = useMemo((): PipelineStep[] => {
    if (!contact) return [];
    const flags = [
      true,
      Boolean(contact.profile && contact.profile.enrichedAt),
      !!contact.email,
      contact.emailVerified === true,
      hasOutbound,
      hasInbound,
    ];
    const labels = [
      "Discovered",
      "Enriched",
      "Email found",
      "Verified",
      "Outreach sent",
      "Replied",
    ];
    return labels.map((label, i) => ({
      label,
      status: (flags[i]
        ? "completed"
        : i === 0 || flags[i - 1]
          ? "active"
          : "pending") as StepStatus,
    }));
  }, [contact, hasOutbound, hasInbound]);

  const handleFindEmail = useCallback(async () => {
    if (!contact) return;
    setFindStatus(null);
    try {
      const { data: result } = await findEmail({
        variables: { contactId: contact.id },
      });
      const res = result?.findContactEmail;
      if (res?.success && res.emailFound && res.email) {
        setFindStatus({
          type: "success",
          message: `Found: ${res.email}${res.verified ? " (verified)" : ""}`,
        });
        refetch();
      } else {
        setFindStatus({
          type: "error",
          message:
            res?.message ??
            `No email found (tried ${res?.candidatesTried ?? 0} candidates)`,
        });
      }
    } catch (err: unknown) {
      setFindStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to find email",
      });
    }
  }, [contact, findEmail, refetch]);

  const handleScrapePosts = useCallback(async () => {
    if (!contact) return;
    setScraping(true);
    setScrapeStatus({ type: "info", message: "Scraping posts…" });
    try {
      const res = await fetch(
        `/api/contacts/${contact.id}/scrape-linkedin-posts`,
        { method: "POST" },
      );
      if (res.ok) {
        setScrapeStatus({ type: "success", message: "Scrape requested." });
      } else {
        const text = await res.text();
        setScrapeStatus({
          type: "error",
          message: `Scrape failed: ${text.slice(0, 120)}`,
        });
      }
    } catch (err: unknown) {
      setScrapeStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Scrape failed",
      });
    } finally {
      setScraping(false);
    }
  }, [contact]);

  const cleanTags = useMemo(
    () => cleanContactTags(contact?.tags),
    [contact?.tags],
  );

  const profile = contact?.profile ?? null;

  const analysisMd = useMemo(() => {
    const parts: string[] = [];
    if (profile?.linkedinBio) parts.push(`### Bio\n\n${profile.linkedinBio}`);
    if (profile?.synthesisRationale)
      parts.push(`### Why this lead\n\n${profile.synthesisRationale}`);
    return parts.join("\n\n");
  }, [profile?.linkedinBio, profile?.synthesisRationale]);

  const allEmails = useMemo(() => {
    const out = outboundEmails.map((e) => ({
      key: `out-${e.id}`,
      direction: "outbound" as const,
      subject: e.subject,
      sentAt: e.sentAt,
      status: e.status,
    }));
    const inb = inboundEmails.map((e) => ({
      key: `in-${e.id}`,
      direction: "inbound" as const,
      subject: e.subject ?? "(no subject)",
      sentAt: e.receivedAt,
      status: e.classification ?? "received",
    }));
    return [...out, ...inb].sort((a, b) => {
      const aT = a.sentAt ? new Date(a.sentAt).getTime() : 0;
      const bT = b.sentAt ? new Date(b.sentAt).getTime() : 0;
      return bT - aT;
    });
  }, [outboundEmails, inboundEmails]);

  const [showAllOpps, setShowAllOpps] = useState(false);

  // ── Loading / not-found states ───────────────────────────────────────────

  if (loading && !contact) {
    return (
      <Container size="3" p="6">
        <Flex justify="center" align="center" gap="2">
          <Spinner size="2" />
          <Text size="2" color="gray">
            Loading…
          </Text>
        </Flex>
      </Container>
    );
  }

  if (!contact) {
    return (
      <Container size="3" p="6">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Contact not found.{" "}
            <RadixLink asChild>
              <Link href="/contacts">Back to contacts</Link>
            </RadixLink>
          </Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const name = fullName(contact.firstName, contact.lastName);
  const linkedinHref = coerceExternalUrl(contact.linkedinUrl);
  const slug = contact.slug ?? "";
  const fullDetailHref = slug ? `/contacts/${slug}` : "/contacts";

  type CtaBranch =
    | "find-email"
    | "verify-pending"
    | "compose-first"
    | "send-followup"
    | "view-thread"
    | "do-not-contact";

  const ctaBranch: CtaBranch = contact.doNotContact
    ? "do-not-contact"
    : !contact.email
      ? "find-email"
      : !contact.emailVerified
        ? "verify-pending"
        : !hasOutbound
          ? "compose-first"
          : !hasInbound
            ? "send-followup"
            : "view-thread";

  const experienceLevel = profile?.experienceLevel ?? "—";
  const topLanguage = profile?.githubTopLanguages?.[0] ?? "—";
  const totalStars = profile?.githubTotalStars ?? 0;
  const opportunitiesCount =
    opportunitiesData?.contactOpportunities?.length ?? 0;
  const workExp = profile?.workExperience ?? [];
  const opportunities = opportunitiesData?.contactOpportunities ?? [];
  const visibleOppCount = 3;
  const oppsClosedDefault = opportunities.length > visibleOppCount;
  const shownOpps = showAllOpps
    ? opportunities
    : opportunities.slice(0, visibleOppCount);

  const followUpContact = {
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    company: contact.company,
    position: contact.position,
    email: contact.email,
  };

  const followUpOpps = opportunities.map((o) => ({
    id: o.id,
    title: o.title,
    status: o.status,
    appliedAt: o.appliedAt,
    applicationStatus: o.applicationStatus,
    companyName: o.companyName,
    tags: o.tags,
  }));

  return (
    <Container size="3" p={{ initial: "3", sm: "5" }}>
      <Flex direction="column" gap="4">
        {/* 1. Pipeline stepper */}
        <PipelineStepper steps={pipelineSteps} />

        {/* 2. Hero CTA card — dominant element */}
        <Card variant="surface">
          <Box
            p={{ initial: "5", sm: "7" }}
            style={{ minHeight: "200px" }}
            className={css({
              background:
                "linear-gradient(135deg, var(--accent-3) 0%, var(--accent-2) 100%)",
              borderRadius: "inherit",
            })}
          >
            <Flex
              direction="column"
              align="center"
              justify="center"
              gap="4"
              style={{ minHeight: "168px" }}
            >
              <Heading
                size="7"
                align="center"
                style={{
                  lineHeight: 1.15,
                  wordBreak:
                    ctaBranch === "verify-pending" ? "break-all" : "normal",
                }}
              >
                {ctaBranch === "find-email" &&
                  `Find email for ${contact.firstName}`}
                {ctaBranch === "verify-pending" && `Verify ${contact.email}`}
                {ctaBranch === "compose-first" && "Compose first email"}
                {ctaBranch === "send-followup" && "Send follow-up"}
                {ctaBranch === "view-thread" && "View email thread"}
                {ctaBranch === "do-not-contact" && "Do not contact"}
              </Heading>

              <Text size="3" color="gray" align="center">
                {ctaBranch === "find-email" &&
                  "We'll search Hunter / NeverBounce candidates."}
                {ctaBranch === "verify-pending" && (
                  <>
                    Verification runs in batch. nbResult:{" "}
                    <Code>{contact.nbResult ?? "n/a"}</Code>
                  </>
                )}
                {ctaBranch === "compose-first" && (
                  <>
                    Verified email at <Code>{contact.email}</Code>. Open the
                    full editor to draft outreach.
                  </>
                )}
                {ctaBranch === "send-followup" &&
                  `${outboundEmails.length} outbound email${outboundEmails.length === 1 ? "" : "s"}, no reply yet.`}
                {ctaBranch === "view-thread" &&
                  (hasInbound
                    ? `${inboundEmails.length} reply${inboundEmails.length === 1 ? "" : "ies"} received.`
                    : "Conversation in progress.")}
                {ctaBranch === "do-not-contact" &&
                  "This contact is opted out. No outreach actions available."}
              </Text>

              {ctaBranch === "find-email" && (
                <Button
                  variant="gradient"
                  size="lg"
                  onClick={handleFindEmail}
                  disabled={finding}
                  style={heroBtnStyle}
                >
                  {finding ? (
                    <>
                      <Spinner size="2" /> Searching…
                    </>
                  ) : (
                    <>
                      <MagicWandIcon /> Find email
                    </>
                  )}
                </Button>
              )}
              {ctaBranch === "verify-pending" && (
                <Button
                  variant="gradient"
                  size="lg"
                  disabled
                  title={`Verification runs in batch; nbResult: ${contact.nbResult ?? "n/a"}`}
                  style={heroBtnStyle}
                >
                  <CheckIcon /> Verify pending
                </Button>
              )}
              {(ctaBranch === "compose-first" ||
                ctaBranch === "send-followup") && (
                <FollowUpEmailDialog
                  contact={followUpContact}
                  opportunities={followUpOpps}
                />
              )}
              {ctaBranch === "compose-first" && (
                <RadixLink asChild size="2" color="gray">
                  <Link href={fullDetailHref}>Open full editor →</Link>
                </RadixLink>
              )}
              {ctaBranch === "view-thread" && (
                <a
                  href="#emails"
                  className={css({ textDecoration: "none" })}
                >
                  <Button variant="gradient" size="lg" style={heroBtnStyle}>
                    <PaperPlaneIcon /> Open thread
                  </Button>
                </a>
              )}
            </Flex>

            {/* Inline status callouts */}
            {findStatus && (
              <Box mt="3">
                <Callout.Root
                  color={findStatus.type === "success" ? "green" : "red"}
                  size="1"
                >
                  <Callout.Icon>
                    {findStatus.type === "success" ? (
                      <CheckIcon />
                    ) : (
                      <ExclamationTriangleIcon />
                    )}
                  </Callout.Icon>
                  <Callout.Text>{findStatus.message}</Callout.Text>
                </Callout.Root>
              </Box>
            )}

            {/* Secondary muted actions */}
            <Flex justify="center" gap="3" mt="4" wrap="wrap">
              {linkedinHref ? (
                <a
                  href={linkedinHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({ textDecoration: "none" })}
                >
                  <Button variant="ghost" size="sm">
                    <LinkedInLogoIcon /> Import LinkedIn profile
                  </Button>
                </a>
              ) : (
                <Button variant="ghost" size="sm" disabled>
                  <LinkedInLogoIcon /> Import LinkedIn profile
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleScrapePosts}
                disabled={scraping}
              >
                {scraping ? <Spinner size="1" /> : <MagicWandIcon />} Scrape posts
              </Button>
            </Flex>

            {scrapeStatus && (
              <Box mt="3">
                <Callout.Root
                  color={
                    scrapeStatus.type === "success"
                      ? "green"
                      : scrapeStatus.type === "error"
                        ? "red"
                        : "gray"
                  }
                  size="1"
                >
                  <Callout.Icon>
                    <InfoCircledIcon />
                  </Callout.Icon>
                  <Callout.Text>{scrapeStatus.message}</Callout.Text>
                </Callout.Root>
              </Box>
            )}
          </Box>
        </Card>

        {/* 3. Decision-maker identity card */}
        <Card>
          <Box p="4">
            <Flex align="center" gap="3" wrap="wrap">
              <ContactAvatar
                firstName={contact.firstName}
                lastName={contact.lastName}
                size="5"
              />
              <Box flexGrow="1" minWidth="0">
                <Text size="3" weight="bold" as="div">
                  {name}
                </Text>
                {contact.position && (
                  <Text size="2" color="gray" as="div">
                    {contact.position}
                  </Text>
                )}
                {contact.company && (
                  <Text size="1" color="gray" as="div">
                    {contact.companyKey ? (
                      <RadixLink asChild>
                        <Link href={`/companies/${contact.companyKey}`}>
                          {contact.company}
                        </Link>
                      </RadixLink>
                    ) : (
                      contact.company
                    )}
                  </Text>
                )}
                {contact.email && (
                  <Text size="1" color="gray" as="div" mt="1">
                    <EnvelopeClosedIcon
                      style={{ display: "inline", verticalAlign: "middle" }}
                    />{" "}
                    <RadixLink href={`mailto:${contact.email}`} size="1">
                      {contact.email}
                    </RadixLink>
                  </Text>
                )}
              </Box>
              {linkedinHref && (
                <RadixLink
                  href={linkedinHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="2"
                  color="gray"
                >
                  <LinkedInLogoIcon /> LinkedIn{" "}
                  <ExternalLinkIcon style={{ verticalAlign: "middle" }} />
                </RadixLink>
              )}
            </Flex>
            <Flex gap="2" wrap="wrap" mt="3">
              <Chip color="indigo" variant="soft">
                Experience: {experienceLevel}
              </Chip>
              <Chip color="blue" variant="soft">
                Top lang: {topLanguage}
              </Chip>
              <Chip color="amber" variant="soft">
                ★ {totalStars}
              </Chip>
              <Chip color="green" variant="soft">
                Opps: {opportunitiesCount}
              </Chip>
            </Flex>
            {cleanTags.length > 0 && (
              <Flex gap="1" wrap="wrap" mt="3">
                {cleanTags.slice(0, 8).map((tag) => (
                  <Badge key={tag} color="gray" variant="surface" size="1">
                    {tag}
                  </Badge>
                ))}
              </Flex>
            )}
          </Box>
        </Card>

        {/* 4. Accordion: AI profile */}
        {analysisMd && (
          <Accordion title="AI profile">
            <Box
              className={css({
                fontSize: "sm",
                color: "ui.secondary",
                "& h3": {
                  fontSize: "md",
                  fontWeight: "bold",
                  color: "ui.heading",
                  mt: "3",
                  mb: "1",
                },
                "& p": { mb: "2" },
                "& ul, & ol": { pl: "5", mb: "2" },
              })}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {analysisMd}
              </ReactMarkdown>
            </Box>
          </Accordion>
        )}

        {/* 5. Accordion: Work experience */}
        {workExp.length > 0 && (
          <Accordion title={`Work experience (${workExp.length})`}>
            <Flex direction="column" gap="3">
              {workExp.map((exp, i) => (
                <Box key={`${exp.company}-${i}`} className={rowDivider}>
                  <Text size="2" weight="bold" as="div">
                    {exp.title}
                  </Text>
                  <Text size="2" color="gray" as="div">
                    {exp.company}
                    {exp.location ? ` · ${exp.location}` : ""}
                  </Text>
                  <Text size="1" color="gray" as="div">
                    {formatExperienceRange(exp.startDate, exp.endDate)}
                    {exp.duration ? ` · ${exp.duration}` : ""}
                  </Text>
                </Box>
              ))}
            </Flex>
          </Accordion>
        )}

        {/* 6. Accordion: Email history */}
        {allEmails.length > 0 && (
          <Accordion title={`Email history (${allEmails.length})`}>
            <Flex direction="column" gap="2">
              {allEmails.map((e) => (
                <Flex key={e.key} align="center" gap="3" className={rowDivider}>
                  <Badge
                    color={e.direction === "inbound" ? "green" : "indigo"}
                    variant="soft"
                    size="1"
                    style={{ flexShrink: 0 }}
                  >
                    {e.direction}
                  </Badge>
                  <Text size="2" style={truncateText}>
                    {e.subject}
                  </Text>
                  <Badge color="gray" variant="surface" size="1">
                    {e.status}
                  </Badge>
                  {e.sentAt && (
                    <Text
                      size="1"
                      color="gray"
                      style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                    >
                      {new Date(e.sentAt).toLocaleDateString()}
                    </Text>
                  )}
                </Flex>
              ))}
            </Flex>
          </Accordion>
        )}

        {/* 7. Tertiary: opportunities */}
        {opportunities.length > 0 && (
          <SectionCard
            title={`Opportunities (${opportunities.length})`}
            right={
              <RadixLink asChild size="1">
                <Link href={`${fullDetailHref}#opportunities`}>View all</Link>
              </RadixLink>
            }
          >
            <Flex direction="column" gap="2">
              {shownOpps.map((opp) => (
                <Flex key={opp.id} align="center" gap="3" className={rowDivider}>
                  <Text size="2" style={truncateText}>
                    {opp.url ? (
                      <RadixLink
                        href={opp.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {opp.title}
                      </RadixLink>
                    ) : (
                      opp.title
                    )}
                  </Text>
                  {opp.companyName && (
                    <Text
                      size="1"
                      color="gray"
                      style={{ flexShrink: 0, whiteSpace: "nowrap" }}
                    >
                      {opp.companyName}
                    </Text>
                  )}
                  <Badge
                    color={opp.applied ? "green" : "gray"}
                    variant="soft"
                    size="1"
                  >
                    {opp.applicationStatus ?? opp.status}
                  </Badge>
                </Flex>
              ))}
            </Flex>
            {oppsClosedDefault && (
              <Box mt="3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllOpps((v) => !v)}
                >
                  <ChevronDownIcon />
                  {showAllOpps
                    ? "Show less"
                    : `Show all (${opportunities.length - visibleOppCount} more)`}
                </Button>
              </Box>
            )}
          </SectionCard>
        )}
      </Flex>
    </Container>
  );
}
