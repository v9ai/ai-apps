"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Callout,
  Card,
  Flex,
  Heading,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useGetCompanyQuery,
  useGetContactsQuery,
  useGetEmailCampaignQuery,
} from "@/__generated__/hooks";
import { EditCampaignDialog } from "@/components/admin/EditCampaignDialog";

const statusColors: Record<string, "green" | "yellow" | "blue" | "red" | "gray"> = {
  draft: "gray",
  pending: "yellow",
  running: "blue",
  completed: "green",
  failed: "red",
  stopped: "red",
};

function seniorityColor(
  seniority: string | null | undefined,
): "red" | "orange" | "yellow" | "blue" | "gray" {
  switch (seniority) {
    case "C-level":
    case "Founder":
      return "red";
    case "Partner":
    case "VP":
      return "orange";
    case "Director":
      return "yellow";
    case "Manager":
      return "blue";
    default:
      return "gray";
  }
}

type PersonaBlock = {
  persona_title: string;
  subject: string;
  html?: string;
  text?: string;
  recipient_emails: string[];
};

type EmailStep = { subject: string; body: string };

function isPersonaBlock(v: unknown): v is PersonaBlock {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as PersonaBlock).persona_title === "string" &&
    Array.isArray((v as PersonaBlock).recipient_emails)
  );
}

function parseSequence(
  raw: unknown,
): { kind: "persona"; blocks: PersonaBlock[] } | { kind: "steps"; steps: EmailStep[] } | null {
  if (!raw) return null;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;
  if (parsed.every(isPersonaBlock)) {
    return { kind: "persona", blocks: parsed as PersonaBlock[] };
  }
  return { kind: "steps", steps: parsed as EmailStep[] };
}

export function CampaignDetailClient({
  companyKey,
  campaignId,
}: {
  companyKey: string;
  campaignId: string;
}) {
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: companyData,
    loading: companyLoading,
    error: companyError,
  } = useGetCompanyQuery({ variables: { key: companyKey } });

  const {
    data: campaignData,
    loading: campaignLoading,
    error: campaignError,
    refetch,
  } = useGetEmailCampaignQuery({ variables: { id: campaignId } });

  const companyIdForContacts = companyData?.company?.id ?? 0;
  const { data: contactsData } = useGetContactsQuery({
    variables: { companyId: companyIdForContacts, limit: 200 },
    skip: !companyIdForContacts,
    fetchPolicy: "cache-first",
  });

  if (companyLoading || campaignLoading) {
    return (
      <Flex justify="center" align="center" className={css({ minHeight: "400px" })}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (companyError || campaignError) {
    const message =
      companyError?.message ?? campaignError?.message ?? "Unknown error";
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>Failed to load campaign: {message}</Callout.Text>
      </Callout.Root>
    );
  }

  const company = companyData?.company;
  const campaign = campaignData?.emailCampaign;

  if (!company) {
    return <Text color="red">Company not found</Text>;
  }

  if (!campaign) {
    return (
      <Flex direction="column" gap="3">
        <BackLink companyKey={companyKey} />
        <Text color="red">Campaign not found</Text>
      </Flex>
    );
  }

  if (campaign.companyId !== company.id) {
    return (
      <Flex direction="column" gap="3">
        <BackLink companyKey={companyKey} />
        <Text color="red">This campaign does not belong to {company.name}.</Text>
      </Flex>
    );
  }

  const sequence = parseSequence(campaign.sequence);
  const recipients = campaign.recipientEmails ?? [];

  const recipientEmailSet = new Set(
    recipients.map((e) => e.toLowerCase()).filter(Boolean),
  );
  const allContacts = contactsData?.contacts?.contacts ?? [];
  const decisionMakers = [...allContacts]
    .filter(
      (c) =>
        c.isDecisionMaker &&
        c.email &&
        recipientEmailSet.has(c.email.toLowerCase()),
    )
    .sort((a, b) => (b.authorityScore ?? 0) - (a.authorityScore ?? 0));

  return (
    <Flex direction="column" gap="4">
      <BackLink companyKey={companyKey} />

      <Flex justify="between" align="start" gap="3" wrap="wrap">
        <Box>
          <Heading size="6">{campaign.name}</Heading>
          <Flex gap="2" align="center" mt="2">
            <Badge color={statusColors[campaign.status] ?? "gray"}>
              {campaign.status}
            </Badge>
            {campaign.mode && (
              <Badge variant="soft" color="gray">
                {campaign.mode}
              </Badge>
            )}
            <Text size="2" color="gray">
              Created {new Date(campaign.createdAt).toLocaleString()}
            </Text>
          </Flex>
        </Box>
        <button
          type="button"
          className={button({ variant: "ghost" })}
          onClick={() => setEditOpen(true)}
        >
          <Pencil1Icon /> Edit
        </button>
      </Flex>

      <Flex
        gap="3"
        wrap="wrap"
        className={css({
          "& > *": { flex: "1 1 160px" },
        })}
      >
        <Stat label="Recipients" value={campaign.totalRecipients} />
        <Stat label="Sent" value={campaign.emailsSent} />
        <Stat label="Scheduled" value={campaign.emailsScheduled} />
        <Stat label="Failed" value={campaign.emailsFailed} />
      </Flex>

      <Card>
        <Flex direction="column" gap="2">
          <Heading size="3">Configuration</Heading>
          <Detail label="From email" value={campaign.fromEmail} />
          <Detail label="Reply-to" value={campaign.replyTo} />
          <Detail
            label="Delay days"
            value={
              campaign.delayDays
                ? Array.isArray(campaign.delayDays)
                  ? campaign.delayDays.join(", ")
                  : String(campaign.delayDays)
                : null
            }
          />
          <Detail
            label="Persona threshold"
            value={
              campaign.personaMatchThreshold != null
                ? String(campaign.personaMatchThreshold)
                : null
            }
          />
          <Detail
            label="Product-aware"
            value={campaign.productAwareMode ? "yes" : "no"}
          />
          <Detail
            label="Updated"
            value={new Date(campaign.updatedAt).toLocaleString()}
          />
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="2">
          <Heading size="3">Decision makers ({decisionMakers.length})</Heading>
          {decisionMakers.length === 0 ? (
            <Text color="gray" size="2">
              No decision makers among the recipients of this campaign.
            </Text>
          ) : (
            <Flex direction="column" gap="3">
              {decisionMakers.map((c) => (
                <Flex
                  key={c.id}
                  justify="between"
                  align="start"
                  gap="3"
                  wrap="wrap"
                >
                  <Box className={css({ minWidth: 0, flexGrow: 1 })}>
                    <Flex align="center" gap="2" wrap="wrap">
                      <Text size="2" weight="medium">
                        <Link
                          href={`/contacts/${c.slug ?? c.id}`}
                          className={css({
                            color: "inherit",
                            _hover: { textDecoration: "underline" },
                          })}
                        >
                          {c.firstName} {c.lastName}
                        </Link>
                      </Text>
                      {c.seniority && (
                        <Badge color={seniorityColor(c.seniority)} variant="soft">
                          {c.seniority}
                        </Badge>
                      )}
                      {c.department && c.department !== "Other" && (
                        <Badge color="gray" variant="outline">
                          {c.department}
                        </Badge>
                      )}
                    </Flex>
                    {c.position && (
                      <Text size="1" color="gray" as="div">
                        {c.position}
                      </Text>
                    )}
                    {c.email && (
                      <Text
                        size="1"
                        color="gray"
                        as="div"
                        className={css({ fontFamily: "mono" })}
                      >
                        {c.email}
                      </Text>
                    )}
                  </Box>
                  <Text size="1" color="gray">
                    {((c.authorityScore ?? 0) * 100).toFixed(0)}%
                  </Text>
                </Flex>
              ))}
            </Flex>
          )}
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="3">
          <Heading size="3">Sequence</Heading>
          {!sequence ? (
            <Text color="gray" size="2">
              No sequence generated yet.
            </Text>
          ) : sequence.kind === "persona" ? (
            sequence.blocks.map((block, i) => (
              <Box
                key={`${block.persona_title}-${i}`}
                className={css({
                  borderTop: i === 0 ? "none" : "1px solid",
                  borderColor: "gray.5",
                  pt: i === 0 ? 0 : "3",
                })}
              >
                <Flex gap="2" align="center" mb="1">
                  <Badge color="indigo">{block.persona_title}</Badge>
                  <Text size="1" color="gray">
                    {block.recipient_emails.length} recipient(s)
                  </Text>
                </Flex>
                <Text size="2" weight="medium" as="div">
                  {block.subject}
                </Text>
                {block.text && (
                  <Text
                    size="2"
                    color="gray"
                    as="div"
                    className={css({ whiteSpace: "pre-wrap", mt: "1" })}
                  >
                    {block.text}
                  </Text>
                )}
              </Box>
            ))
          ) : (
            sequence.steps.map((step, i) => (
              <Box
                key={i}
                className={css({
                  borderTop: i === 0 ? "none" : "1px solid",
                  borderColor: "gray.5",
                  pt: i === 0 ? 0 : "3",
                })}
              >
                <Text size="1" color="gray">
                  Step {i + 1}
                </Text>
                <Text size="2" weight="medium" as="div">
                  {step.subject}
                </Text>
                <Text
                  size="2"
                  color="gray"
                  as="div"
                  className={css({ whiteSpace: "pre-wrap", mt: "1" })}
                >
                  {step.body}
                </Text>
              </Box>
            ))
          )}
        </Flex>
      </Card>

      {editOpen && (
        <EditCampaignDialog
          campaignId={campaign.id}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </Flex>
  );
}

function BackLink({ companyKey }: { companyKey: string }) {
  return (
    <Link
      href={`/companies/${companyKey}/campaigns`}
      className={css({
        display: "inline-flex",
        alignItems: "center",
        gap: "1",
        color: "gray.11",
        textDecoration: "none",
        fontSize: "sm",
        _hover: { color: "gray.12", textDecoration: "underline" },
      })}
    >
      <ArrowLeftIcon /> All campaigns
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <Text size="1" color="gray">
        {label}
      </Text>
      <Heading size="5">{value}</Heading>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Flex gap="3" align="baseline">
      <Text size="2" color="gray" className={css({ minWidth: "140px" })}>
        {label}
      </Text>
      <Text size="2">{value ?? "—"}</Text>
    </Flex>
  );
}
