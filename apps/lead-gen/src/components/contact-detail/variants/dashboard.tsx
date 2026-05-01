"use client";

import * as React from "react";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow, isValid, parseISO } from "date-fns";
import {
  useGetContactQuery,
  useGetContactEmailsQuery,
  useGetContactOpportunitiesQuery,
  useFindContactEmailMutation,
  useImportResendEmailsMutation,
} from "@/__generated__/hooks";
import {
  ContactAvatar,
  StatTile,
  SectionCard,
  Chip,
} from "@/components/contact-detail/shared/components";
import {
  fullName as fmtFullName,
  prettyUrl,
  coerceExternalUrl,
  emailVerificationTone,
  cleanContactTags,
} from "@/components/contact-detail/shared/utils";
import { Button } from "@/components/ui";
import { button } from "@/recipes/button";
import {
  Badge,
  Box,
  Callout,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Link as RadixLink,
  Table,
  Text,
} from "@radix-ui/themes";
import {
  EnvelopeClosedIcon,
  ExternalLinkIcon,
  GitHubLogoIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  PaperPlaneIcon,
  PersonIcon,
  ChatBubbleIcon,
  DownloadIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";

type Props = {
  contactId?: number;
  contactSlug?: string;
};

// Helpers

function relTime(raw?: string | null): string {
  if (!raw) return "—";
  const d = parseISO(raw);
  if (!isValid(d)) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

function statusBadgeColor(
  status: string,
): "green" | "amber" | "red" | "gray" | "blue" {
  const lower = status.toLowerCase();
  if (lower.includes("delivered") || lower.includes("sent")) return "green";
  if (lower.includes("opened") || lower.includes("clicked")) return "blue";
  if (lower.includes("bounce") || lower.includes("fail")) return "red";
  if (lower.includes("queued") || lower.includes("scheduled")) return "amber";
  return "gray";
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

// Email row (compact)

type EmailRowProps = {
  fromEmail: string;
  toEmail?: string | null;
  subject: string;
  sentAt?: string | null;
  status: string;
};

function IdentityLink({
  icon,
  href,
  label,
  external,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <Flex align="center" gap="2">
      {icon}
      <RadixLink
        href={href}
        size="2"
        truncate
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {label}
      </RadixLink>
      {external && <ExternalLinkIcon />}
    </Flex>
  );
}

function EmailRow({ fromEmail, toEmail, subject, sentAt, status }: EmailRowProps) {
  return (
    <Flex
      align="center"
      gap="3"
      py="2"
      className={css({
        borderBottom: "1px solid var(--gray-a3)",
        "&:last-child": { borderBottom: "none" },
      })}
    >
      <Box flexGrow="1" minWidth="0">
        <Flex align="center" gap="2" mb="1">
          <Text size="1" color="gray" truncate>
            {fromEmail}
          </Text>
          <Text size="1" color="gray">
            →
          </Text>
          <Text size="1" color="gray" truncate>
            {toEmail ?? "—"}
          </Text>
        </Flex>
        <Text size="2" weight="medium" truncate as="div">
          {subject || "(no subject)"}
        </Text>
      </Box>
      <Flex align="center" gap="2" flexShrink="0">
        <Badge color={statusBadgeColor(status)} variant="soft" size="1">
          {status}
        </Badge>
        <Text size="1" color="gray" className={css({ minWidth: "80px", textAlign: "right" })}>
          {relTime(sentAt)}
        </Text>
      </Flex>
    </Flex>
  );
}

// Main export

export function ContactDetailDashboard({ contactId, contactSlug }: Props) {
  // Data
  const { loading, data, refetch } = useGetContactQuery({
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

  // Mutations / actions

  const [findEmail, { loading: findingEmail }] = useFindContactEmailMutation({
    onCompleted: () => {
      refetch();
    },
  });

  const [importResendEmails, { loading: importingEmails }] = useImportResendEmailsMutation({
    onCompleted: () => {
      refetch();
    },
  });

  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const linkedinBio = contact?.profile?.linkedinBio ?? "";
  const bioExcerpt = useMemo(() => {
    if (!linkedinBio) return "";
    const stripped = linkedinBio
      .replace(/[#>*_`~\[\]()]/g, "")
      .replace(/\n{2,}/g, "\n")
      .trim();
    const split = stripped.split("\n").slice(0, 3).join("\n");
    return split.length > 360 ? `${split.slice(0, 359)}…` : split;
  }, [linkedinBio]);

  const emailHistory = useMemo(() => {
    type Row = {
      id: string;
      fromEmail: string;
      toEmail: string | null;
      subject: string;
      sentAt: string | null;
      status: string;
    };
    const rows: Row[] = [];
    const sent = emailsData?.contactEmails ?? [];
    const received = emailsData?.contactReceivedEmails ?? [];
    for (const e of sent) {
      rows.push({
        id: `s-${e.id}`,
        fromEmail: e.fromEmail,
        toEmail: e.toEmails?.[0] ?? null,
        subject: e.subject,
        sentAt: e.sentAt,
        status: e.status,
      });
    }
    for (const e of received) {
      rows.push({
        id: `r-${e.id}`,
        fromEmail: e.fromEmail ?? "—",
        toEmail: contact?.email ?? null,
        subject: e.subject ?? "",
        sentAt: e.receivedAt,
        status: e.classification ?? "received",
      });
    }
    rows.sort((a, b) => {
      const da = a.sentAt ? Date.parse(a.sentAt) : 0;
      const db = b.sentAt ? Date.parse(b.sentAt) : 0;
      return db - da;
    });
    return rows.slice(0, 10);
  }, [emailsData, contact?.email]);

  const ok = useCallback((text: string) => setActionMessage({ type: "success", text }), []);
  const fail = useCallback((text: string) => setActionMessage({ type: "error", text }), []);

  const handleFindEmail = useCallback(async () => {
    if (!contact) return;
    setActionMessage(null);
    try {
      const { data: result } = await findEmail({ variables: { contactId: contact.id } });
      const res = result?.findContactEmail;
      if (res?.success && res.emailFound && res.email) {
        ok(`Found: ${res.email}${res.verified ? " (verified)" : ""}`);
      } else {
        fail(res?.message ?? `No email found (tried ${res?.candidatesTried ?? 0} candidates)`);
      }
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : "Failed to find email");
    }
  }, [contact, findEmail, ok, fail]);

  const handleImportEmails = useCallback(async () => {
    setActionMessage(null);
    try {
      const { data: result } = await importResendEmails({ variables: { maxEmails: 50 } });
      const res = result?.importResendEmails;
      if (res?.success) ok(`Imported ${res.newCount} new, ${res.updatedCount} updated`);
      else fail(res?.error ?? "Import failed");
    } catch (err: unknown) {
      fail(err instanceof Error ? err.message : "Import failed");
    }
  }, [importResendEmails, ok, fail]);

  const handleScrapePosts = useCallback(async () => {
    if (!contact) return;
    setScraping(true);
    setScrapeStatus(null);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/scrape-linkedin-posts`, {
        method: "POST",
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        setScrapeStatus(`Error: ${errText || res.statusText}`);
        fail(`Scrape failed: ${errText || res.statusText}`);
      } else {
        const json = (await res.json().catch(() => ({}))) as { status?: string; totalPosts?: number };
        setScrapeStatus(json.status ?? "Started");
        ok(json.totalPosts != null ? `Scraped ${json.totalPosts} posts` : "Scrape started");
      }
    } catch (err: unknown) {
      setScrapeStatus("Error");
      fail(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScraping(false);
    }
  }, [contact, ok, fail]);

  // Loading / not-found

  if (loading && !contact) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!contact) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            Contact not found. <Link href="/contacts">Back to contacts</Link>
          </Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  // Derived

  const name = fmtFullName(contact.firstName, contact.lastName);
  const slug = contact.slug ?? String(contact.id);

  const opportunities = opportunitiesData?.contactOpportunities ?? [];

  const emailTone = emailVerificationTone(
    contact.emailVerified ?? false,
    contact.nbResult,
  );

  const emailValueLabel = contact.emailVerified
    ? "verified"
    : contact.nbResult
      ? contact.nbResult
      : "missing";

  const cleanTags = cleanContactTags(contact.tags);
  const tagsForKpi = cleanTags.length;

  const linkedinHref = coerceExternalUrl(contact.linkedinUrl);
  const githubHref = contact.githubHandle
    ? `https://github.com/${contact.githubHandle.replace(/^@/, "")}`
    : null;
  const telegramHref = contact.telegramHandle
    ? `https://t.me/${contact.telegramHandle.replace(/^@/, "")}`
    : null;

  const profile = contact.profile;

  // Render

  return (
    <Container size="4" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* 1. KPI strip */}
        <Grid columns={{ initial: "1", sm: "2", md: "4" }} gap="3">
          <StatTile
            label="Email"
            value={emailValueLabel}
            tone={emailTone}
            hint={contact.email ? truncate(contact.email, 28) : "no address on file"}
          />
          <StatTile
            label="Verification"
            value={contact.nbStatus ?? "—"}
            hint={
              contact.nbFlags && contact.nbFlags.length > 0
                ? `NeverBounce · ${contact.nbFlags.join(", ")}`
                : "NeverBounce"
            }
          />
          <StatTile
            label="Tags"
            value={tagsForKpi > 0 ? tagsForKpi : "—"}
            hint={tagsForKpi > 0 ? "labels applied" : "Use Scrape posts to populate"}
          />
          <StatTile
            label="Opportunities"
            value={opportunities.length}
            hint="Linked deals"
            tone={opportunities.length > 0 ? "indigo" : "gray"}
          />
        </Grid>

        {/* 2. Identity bar */}
        <Card>
          <Box p="4">
            <Flex align="center" gap="3" wrap="wrap">
              <ContactAvatar firstName={contact.firstName} lastName={contact.lastName} size="4" />
              <Flex direction="column" gap="1" flexGrow="1" minWidth="0">
                <Flex align="center" gap="2" wrap="wrap">
                  <Heading size="5" style={{ lineHeight: 1.2 }}>{name}</Heading>
                  {contact.doNotContact && <Badge color="red" variant="soft" radius="full">do not contact</Badge>}
                  {contact.emailVerified && <Badge color="green" variant="soft" radius="full">verified</Badge>}
                </Flex>
                <Flex align="center" gap="2" wrap="wrap">
                  {contact.position && <Text size="2" color="gray">{contact.position}</Text>}
                  {contact.company && (
                    <>
                      <Text size="2" color="gray">·</Text>
                      {contact.companyKey || contact.companyId ? (
                        <RadixLink asChild size="2">
                          <Link href={`/companies/${contact.companyKey ?? contact.companyId}`}>
                            {contact.company}
                          </Link>
                        </RadixLink>
                      ) : (
                        <Text size="2" color="gray">{contact.company}</Text>
                      )}
                    </>
                  )}
                </Flex>
              </Flex>
              <Flex gap="2" flexShrink="0">
                <Link href={`/contacts/${slug}?ux=A`} className={button({ variant: "ghost", size: "sm" })}>
                  Switch view
                </Link>
              </Flex>
            </Flex>
          </Box>
        </Card>

        {actionMessage && (
          <Callout.Root color={actionMessage.type === "success" ? "green" : "red"} size="1">
            <Callout.Icon><InfoCircledIcon /></Callout.Icon>
            <Callout.Text>{actionMessage.text}</Callout.Text>
          </Callout.Root>
        )}

        {/* 3. Two-column ops cockpit */}
        <Grid columns={{ initial: "1", lg: "3fr 2fr" }} gap="5">
          {/* Main column */}
          <Flex direction="column" gap="4">
            {/* Email history */}
            <SectionCard
              title={`Email history (${emailHistory.length})`}
              right={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleImportEmails}
                  loading={importingEmails}
                  loadingText="Syncing…"
                >
                  <DownloadIcon />
                  Sync Resend
                </Button>
              }
            >
              {emailHistory.length === 0 ? (
                <Text size="2" color="gray">No emails yet.</Text>
              ) : (
                <Box>
                  {emailHistory.map((row) => (
                    <EmailRow
                      key={row.id}
                      fromEmail={row.fromEmail}
                      toEmail={row.toEmail}
                      subject={row.subject}
                      sentAt={row.sentAt}
                      status={row.status}
                    />
                  ))}
                </Box>
              )}
            </SectionCard>

            {/* Opportunities */}
            <SectionCard title={`Opportunities (${opportunities.length})`}>
              {opportunities.length === 0 ? (
                <Text size="2" color="gray">
                  No linked opportunities.
                </Text>
              ) : (
                <Table.Root variant="ghost" size="1">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Stage</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Owner</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Last touched</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {opportunities.map((opp) => (
                      <Table.Row key={opp.id}>
                        <Table.Cell>
                          <Badge color={statusBadgeColor(opp.status)} variant="soft" size="1">
                            {opp.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell><Text size="2">{opp.companyName ?? "—"}</Text></Table.Cell>
                        <Table.Cell><Text size="2" color="gray">{opp.source ?? "—"}</Text></Table.Cell>
                        <Table.Cell><Text size="1" color="gray">{relTime(opp.appliedAt ?? opp.createdAt)}</Text></Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
            </SectionCard>
          </Flex>

          {/* Sidebar */}
          <Flex direction="column" gap="4">
            {/* Identity card */}
            <SectionCard title="Identity">
              <Flex direction="column" gap="2">
                {contact.email && (
                  <IdentityLink
                    icon={<EnvelopeClosedIcon />}
                    href={`mailto:${contact.email}`}
                    label={contact.email}
                  />
                )}
                {contact.forwardingAlias && (
                  <IdentityLink
                    icon={<EnvelopeClosedIcon />}
                    href={`mailto:${contact.forwardingAlias}@vadim.blog`}
                    label={`${contact.forwardingAlias}@vadim.blog`}
                  />
                )}
                {linkedinHref && (
                  <IdentityLink
                    icon={<LinkedInLogoIcon />}
                    href={linkedinHref}
                    label={prettyUrl(contact.linkedinUrl)}
                    external
                  />
                )}
                {githubHref && contact.githubHandle && (
                  <IdentityLink
                    icon={<GitHubLogoIcon />}
                    href={githubHref}
                    label={contact.githubHandle}
                    external
                  />
                )}
                {telegramHref && contact.telegramHandle && (
                  <IdentityLink
                    icon={<ChatBubbleIcon />}
                    href={telegramHref}
                    label={contact.telegramHandle}
                    external
                  />
                )}
                {!contact.email &&
                  !contact.forwardingAlias &&
                  !linkedinHref &&
                  !githubHref &&
                  !telegramHref && (
                    <Text size="2" color="gray">
                      No identity links yet.
                    </Text>
                  )}
              </Flex>
            </SectionCard>

            {/* Actions */}
            <SectionCard title="Actions">
              <Flex direction="column" gap="2">
                <Link
                  href={`/contacts/${slug}#compose`}
                  className={button({ variant: "outline", size: "md" })}
                  title="Compose using the default contact page"
                >
                  <PaperPlaneIcon />
                  Compose
                </Link>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleFindEmail}
                  loading={findingEmail}
                  loadingText="Searching…"
                  disabled={!contact}
                >
                  <MagnifyingGlassIcon />
                  Find email
                </Button>
                {contact.linkedinUrl ? (
                  <Link
                    href={`/contacts/${slug}#import`}
                    className={button({ variant: "outline", size: "md" })}
                    title="LinkedIn import requires the Chrome extension on the default page"
                  >
                    <PersonIcon />
                    Import profile
                  </Link>
                ) : (
                  <Button
                    variant="outline"
                    size="md"
                    disabled
                    title="No LinkedIn URL on file"
                  >
                    <PersonIcon />
                    Import profile
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleScrapePosts}
                  loading={scraping}
                  loadingText="Scraping…"
                  disabled={!contact.linkedinUrl}
                >
                  <LinkedInLogoIcon />
                  Scrape posts
                </Button>
                {scrapeStatus && (
                  <Text size="1" color="gray">
                    {scrapeStatus}
                  </Text>
                )}
              </Flex>
            </SectionCard>

            {/* Tags */}
            {cleanTags.length > 0 && (
              <SectionCard title={`Tags (${cleanTags.length})`}>
                <Flex gap="2" wrap="wrap">
                  {cleanTags.slice(0, 12).map((t) => (
                    <Chip key={t} title={t}>
                      {t}
                    </Chip>
                  ))}
                </Flex>
              </SectionCard>
            )}
          </Flex>
        </Grid>

        {/* 4. AI profile excerpt */}
        {profile && (linkedinBio || profile.specialization || profile.experienceLevel) && (
          <SectionCard
            title="AI profile"
            right={
              <RadixLink asChild size="1" color="gray">
                <Link href={`/contacts/${slug}?ux=A`}>Read full profile →</Link>
              </RadixLink>
            }
          >
            <Flex direction="column" gap="3">
              <Flex gap="2" wrap="wrap">
                {profile.experienceLevel && (
                  <Badge color="indigo" variant="soft" radius="full">{profile.experienceLevel}</Badge>
                )}
                {profile.specialization && (
                  <Badge color="violet" variant="soft" radius="full">{profile.specialization}</Badge>
                )}
                {profile.synthesisConfidence != null && (
                  <Badge color="gray" variant="soft" radius="full">
                    confidence {profile.synthesisConfidence.toFixed(2)}
                  </Badge>
                )}
              </Flex>
              {bioExcerpt && (
                <Text
                  as="p"
                  size="2"
                  color="gray"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {bioExcerpt}
                </Text>
              )}
            </Flex>
          </SectionCard>
        )}

      </Flex>
    </Container>
  );
}

