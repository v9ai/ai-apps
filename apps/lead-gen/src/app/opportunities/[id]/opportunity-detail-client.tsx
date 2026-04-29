"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Card,
  Container,
  Flex,
  Heading,
  IconButton,
  Separator,
  Text,
  Table,
  TextField,
} from "@radix-ui/themes";
import Link from "next/link";
import {
  ArrowLeftIcon,
  Cross2Icon,
  ExternalLinkIcon,
  LinkedInLogoIcon,
  EnvelopeClosedIcon,
  GitHubLogoIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { updateOpportunityTags, deleteOpportunity } from "../actions";
import { FollowUpEmailDialog } from "@/components/emails/follow-up-email-dialog";
import { OpportunityEditDialog } from "./opportunity-edit-dialog";

type OpportunityDetail = {
  id: string;
  title: string;
  url: string | null;
  source: string | null;
  status: string;
  reward_usd: number | null;
  reward_text: string | null;
  start_date: string | null;
  end_date: string | null;
  deadline: string | null;
  first_seen: string | null;
  last_seen: string | null;
  score: number | null;
  raw_context: string | null;
  metadata: string | null;
  applied: boolean;
  applied_at: string | null;
  application_status: string | null;
  application_notes: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
  company_name: string | null;
  company_key: string | null;
  company_website: string | null;
  company_category: string | null;
  contact_first: string | null;
  contact_last: string | null;
  contact_slug: string | null;
  contact_position: string | null;
  contact_linkedin: string | null;
  contact_email: string | null;
  contact_id: number | null;
};

type MatchBreakdown = {
  score: number;
  skillMatch: number;
  skillsMatched: number;
  skillsRequired: number;
  githubDepth: number;
  experienceFit: number;
  profileDepth: number;
};

type SourcedCandidate = {
  id: number;
  first_name: string;
  last_name: string;
  slug: string | null;
  email: string | null;
  company: string | null;
  position: string | null;
  github_handle: string | null;
  tags: string | null;
  authority_score: number | null;
  match_score: number;
  match_breakdown: MatchBreakdown;
  github_activity_score: number | null;
  github_public_repos: number | null;
  github_followers: number | null;
  github_recent_push_count: number | null;
  experience_level: string | null;
  specialization: string | null;
};

type SentEmail = {
  id: number;
  resend_id: string;
  from_email: string;
  to_emails: string;
  subject: string;
  text_content: string | null;
  status: string;
  sent_at: string | null;
  reply_received: boolean | null;
  created_at: string;
};

type InboundEmail = {
  id: number;
  from_email: string | null;
  subject: string | null;
  text_content: string | null;
  classification: string | null;
  classification_confidence: number | null;
  received_at: string;
  created_at: string;
};

function stripQuotedReply(text: string): string {
  return text.replace(/\n*On .+wrote:\n*(>.*\n?)*/gs, "").trim();
}

const classificationColors: Record<string, "green" | "red" | "gray"> = {
  interested: "green",
  not_interested: "red",
};

const statusColors: Record<string, "green" | "blue" | "orange" | "red" | "gray" | "yellow"> = {
  open: "blue",
  applied: "orange",
  interviewing: "yellow",
  offer: "green",
  rejected: "red",
  closed: "gray",
};

const specialTagColors: Record<string, "red" | "orange" | "green" | "blue" | "purple"> = {
  excluded: "red",
  priority: "green",
  applied: "orange",
  referral: "purple",
  remote: "blue",
};

function tagColor(tag: string): "red" | "orange" | "green" | "blue" | "purple" | "gray" {
  return specialTagColors[tag] ?? "gray";
}

function InfoItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Flex direction="column" gap="1">
      <Text size="1" color="gray" weight="medium">{label}</Text>
      <Text size="2">{value}</Text>
    </Flex>
  );
}

function formatDate(d: string | null | undefined): string | null {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

export function OpportunityDetailClient({
  opportunity: opp,
  sourcedCandidates = [],
  sentEmails = [],
  inboundEmails = [],
}: {
  opportunity: OpportunityDetail;
  sourcedCandidates?: SourcedCandidate[];
  sentEmails?: SentEmail[];
  inboundEmails?: InboundEmail[];
}) {
  const router = useRouter();
  const initialTags: string[] = opp.tags ? JSON.parse(opp.tags) : [];
  const meta: Record<string, string> = opp.metadata ? JSON.parse(opp.metadata) : {};
  const [tags, setTags] = useState(initialTags);
  const [newTag, setNewTag] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Delete this opportunity?")) return;
    startDeleteTransition(async () => {
      const result = await deleteOpportunity(opp.id);
      if (!result.error) router.push("/opportunities");
    });
  }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    const next = [...tags, t];
    setTags(next);
    setNewTag("");
    startTransition(async () => {
      await updateOpportunityTags(opp.id, next);
    });
  }

  function removeTag(tag: string) {
    const next = tags.filter((t) => t !== tag);
    setTags(next);
    startTransition(async () => {
      await updateOpportunityTags(opp.id, next);
    });
  }

  return (
    <Container size="3" p="6">
      {/* Back link */}
      <Link href="/opportunities" style={{ textDecoration: "none" }}>
        <Flex align="center" gap="1" mb="4">
          <ArrowLeftIcon width={14} height={14} />
          <Text size="2" color="gray">opportunities</Text>
        </Flex>
      </Link>

      {/* Header */}
      <Flex direction="column" gap="2" mb="5">
        <Flex align="center" gap="2" wrap="wrap">
          <Heading size="6">{opp.title}</Heading>
          {opp.url && (
            <a href={opp.url} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon width={16} height={16} style={{ color: "var(--accent-11)" }} />
            </a>
          )}
        </Flex>
        <Flex align="center" gap="2">
          <Badge color={statusColors[opp.status] ?? "gray"} size="2">{opp.status}</Badge>
          {opp.score != null && (
            <Badge color={opp.score >= 80 ? "green" : opp.score >= 50 ? "yellow" : "gray"} size="2">
              score: {opp.score}
            </Badge>
          )}
          {opp.source && <Badge variant="surface" color="gray" size="1">{opp.source}</Badge>}
          {opp.applied && <Badge color="orange" size="1">applied</Badge>}
          <Flex gap="2" align="center" style={{ marginLeft: "auto" }}>
            <OpportunityEditDialog opportunity={opp} />
            <IconButton
              size="2"
              variant="soft"
              color="red"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <TrashIcon width={14} height={14} />
            </IconButton>
          </Flex>
        </Flex>
      </Flex>

      <Flex direction="column" gap="4">
        {/* Key details */}
        <Card>
          <Flex gap="6" wrap="wrap" p="1">
            <InfoItem label="Compensation" value={opp.reward_text} />
            <InfoItem label="First seen" value={formatDate(opp.first_seen)} />
            <InfoItem label="Last seen" value={formatDate(opp.last_seen)} />
            <InfoItem label="Deadline" value={formatDate(opp.deadline)} />
            <InfoItem label="Start date" value={formatDate(opp.start_date)} />
          </Flex>
        </Card>

        {/* Company + Contact row */}
        <Flex gap="4" wrap="wrap">
          {opp.company_name && (
            <Card style={{ flex: 1, minWidth: 200 }}>
              <Flex direction="column" gap="1" p="1">
                <Text size="1" color="gray" weight="medium">Company</Text>
                <Link href={`/companies/${opp.company_key}`} style={{ textDecoration: "none" }}>
                  <Text size="3" weight="bold" color="blue">{opp.company_name}</Text>
                </Link>
                {opp.company_category && (
                  <Badge variant="surface" color="gray" size="1" style={{ width: "fit-content" }}>
                    {opp.company_category}
                  </Badge>
                )}
                {opp.company_website && (
                  <a href={opp.company_website} target="_blank" rel="noopener noreferrer">
                    <Text size="1" color="gray">{opp.company_website}</Text>
                  </a>
                )}
              </Flex>
            </Card>
          )}

          {opp.contact_first && (
            <Card style={{ flex: 1, minWidth: 200 }}>
              <Flex direction="column" gap="1" p="1">
                <Text size="1" color="gray" weight="medium">Contact</Text>
                <Link href={`/contacts/${opp.contact_slug}`} style={{ textDecoration: "none" }}>
                  <Text size="3" weight="bold" color="blue">
                    {opp.contact_first} {opp.contact_last}
                  </Text>
                </Link>
                {opp.contact_position && (
                  <Text size="1" color="gray">{opp.contact_position}</Text>
                )}
                <Flex gap="2" mt="1">
                  {opp.contact_linkedin && (
                    <a href={opp.contact_linkedin} target="_blank" rel="noopener noreferrer">
                      <LinkedInLogoIcon width={14} height={14} style={{ color: "var(--gray-9)" }} />
                    </a>
                  )}
                  {opp.contact_email && (
                    <a href={`mailto:${opp.contact_email}`}>
                      <EnvelopeClosedIcon width={14} height={14} style={{ color: "var(--gray-9)" }} />
                    </a>
                  )}
                </Flex>
                {opp.contact_id && (
                  <FollowUpEmailDialog
                    contact={{
                      id: opp.contact_id,
                      firstName: opp.contact_first ?? "",
                      lastName: opp.contact_last ?? "",
                      email: opp.contact_email,
                      position: opp.contact_position,
                      company: opp.company_name,
                    }}
                    opportunities={[{
                      id: opp.id,
                      title: opp.title,
                      status: opp.status,
                      appliedAt: opp.applied_at,
                      applicationStatus: opp.application_status,
                      companyName: opp.company_name,
                    }]}
                  />
                )}
              </Flex>
            </Card>
          )}
        </Flex>

        {/* Metadata */}
        {Object.keys(meta).length > 0 && (
          <Card>
            <Flex direction="column" gap="2" p="1">
              <Text size="1" color="gray" weight="medium">Details</Text>
              <Flex gap="4" wrap="wrap">
                {Object.entries(meta).map(([key, val]) => (
                  <InfoItem key={key} label={key.replace(/_/g, " ")} value={String(val)} />
                ))}
              </Flex>
            </Flex>
          </Card>
        )}

        {/* Tags */}
        <Card>
          <Flex direction="column" gap="2" p="1">
            <Text size="1" color="gray" weight="medium">Tags</Text>
            <Flex gap="2" wrap="wrap" align="center">
              {tags.map((tag) => (
                <Badge key={tag} size="2" variant="surface" color={tagColor(tag)}>
                  <Flex align="center" gap="1">
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        opacity: 0.6,
                      }}
                    >
                      <Cross2Icon width={12} height={12} />
                    </button>
                  </Flex>
                </Badge>
              ))}
              <Flex align="center" gap="1">
                <TextField.Root
                  size="2"
                  placeholder="Add tag…"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(newTag);
                    }
                  }}
                  disabled={isPending}
                  style={{ width: 140 }}
                />
                <IconButton
                  size="2"
                  variant="soft"
                  onClick={() => addTag(newTag)}
                  disabled={isPending || !newTag.trim()}
                >
                  <PlusIcon width={14} height={14} />
                </IconButton>
              </Flex>
            </Flex>
          </Flex>
        </Card>

        {/* Application status */}
        {(opp.applied || opp.application_status || opp.application_notes) && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="2">
              <Heading size="4">Application</Heading>
              <Flex gap="4" wrap="wrap">
                {opp.application_status && <InfoItem label="Status" value={opp.application_status} />}
                {opp.applied_at && <InfoItem label="Applied" value={formatDate(opp.applied_at)} />}
              </Flex>
              {opp.application_notes && (
                <Text size="2" color="gray" style={{ whiteSpace: "pre-wrap" }}>{opp.application_notes}</Text>
              )}
            </Flex>
          </>
        )}

        {/* Email History */}
        {(sentEmails.length > 0 || inboundEmails.length > 0) && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <Heading size="4">Email History</Heading>
                <Badge color="blue" variant="soft" size="1">
                  {sentEmails.length + inboundEmails.length}
                </Badge>
              </Flex>
              <Flex direction="column" gap="2">
                {[
                  ...sentEmails.map((e) => ({
                    type: "sent" as const,
                    date: e.sent_at ?? e.created_at,
                    sent: e,
                  })),
                  ...inboundEmails.map((e) => ({
                    type: "received" as const,
                    date: e.received_at,
                    received: e,
                  })),
                ]
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((item) =>
                    item.type === "sent" ? (
                      <Card key={`sent-${item.sent.id}`}>
                        <Flex direction="column" gap="2" p="3">
                          <Flex justify="between" align="start" gap="2" wrap="wrap">
                            <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                              <Text size="2" weight="medium" style={{ wordBreak: "break-word" }}>
                                {item.sent.subject}
                              </Text>
                              <Text size="1" color="gray">
                                {item.sent.from_email} → {JSON.parse(item.sent.to_emails).join(", ")} · {item.sent.sent_at
                                  ? new Date(item.sent.sent_at).toLocaleString()
                                  : new Date(item.sent.created_at).toLocaleString()}
                              </Text>
                            </Flex>
                            <Flex gap="1">
                              {item.sent.reply_received && (
                                <Badge color="purple" variant="soft" size="1">replied</Badge>
                              )}
                              <Badge
                                color={item.sent.status === "delivered" ? "green" : item.sent.status === "bounced" ? "red" : "blue"}
                                variant="soft"
                                size="1"
                              >
                                {item.sent.status}
                              </Badge>
                            </Flex>
                          </Flex>
                          {item.sent.text_content && (
                            <Text
                              size="2"
                              style={{
                                background: "var(--gray-2)",
                                borderRadius: 6,
                                padding: "var(--space-3)",
                                whiteSpace: "pre-wrap",
                                lineHeight: "1.6",
                                maxHeight: 200,
                                overflow: "auto",
                                display: "block",
                              }}
                            >
                              {item.sent.text_content}
                            </Text>
                          )}
                        </Flex>
                      </Card>
                    ) : (
                      <Card key={`recv-${item.received.id}`} style={{ borderLeft: "3px solid var(--purple-9)" }}>
                        <Flex direction="column" gap="2" p="3">
                          <Flex justify="between" align="start" gap="2" wrap="wrap">
                            <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
                              <Flex align="center" gap="2">
                                <Badge color="purple" variant="soft" size="1">reply</Badge>
                                {item.received.classification && (
                                  <Badge
                                    color={classificationColors[item.received.classification] ?? "gray"}
                                    variant="soft"
                                    size="1"
                                  >
                                    {item.received.classification}
                                  </Badge>
                                )}
                              </Flex>
                              <Text size="2" weight="medium" style={{ wordBreak: "break-word" }}>
                                {item.received.subject ?? "(no subject)"}
                              </Text>
                              <Text size="1" color="gray">
                                From {item.received.from_email} · {new Date(item.received.received_at).toLocaleString()}
                              </Text>
                            </Flex>
                          </Flex>
                          {item.received.text_content && (
                            <Text
                              size="2"
                              style={{
                                background: "var(--purple-2)",
                                borderRadius: 6,
                                padding: "var(--space-3)",
                                whiteSpace: "pre-wrap",
                                lineHeight: "1.6",
                                maxHeight: 200,
                                overflow: "auto",
                                display: "block",
                              }}
                            >
                              {stripQuotedReply(item.received.text_content)}
                            </Text>
                          )}
                        </Flex>
                      </Card>
                    ),
                  )}
              </Flex>
            </Flex>
          </>
        )}

        {/* Sourced Candidates */}
        {sourcedCandidates.length > 0 && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="3">
              <Flex align="center" gap="2">
                <Heading size="4">Sourced Candidates</Heading>
                <Badge color="blue" size="1">{sourcedCandidates.length}</Badge>
              </Flex>
              <Table.Root variant="surface" size="1">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>#</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Position</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Company</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Match</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>GitHub</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Skills</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Location</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Links</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sourcedCandidates.map((c, i) => {
                    const cTags: string[] = c.tags ? JSON.parse(c.tags) : [];
                    const skills = cTags
                      .filter((t) => t.startsWith("skill:"))
                      .map((t) => t.replace("skill:", ""));
                    const isLondon = cTags.includes("location:london-verified");
                    const scoreTier = cTags.find((t) => t.startsWith("github:score:"))?.replace("github:score:", "") ?? "-";

                    // Match score color thresholds
                    const matchPct = Math.round(c.match_score * 100);
                    const matchColor: "green" | "yellow" | "orange" | "red" | "gray" =
                      matchPct >= 70 ? "green" :
                      matchPct >= 50 ? "yellow" :
                      matchPct >= 30 ? "orange" : "red";

                    // GitHub tier color
                    const ghColor: "green" | "yellow" | "gray" =
                      scoreTier === "A" ? "green" : scoreTier === "B" ? "yellow" : "gray";

                    const mb = c.match_breakdown;

                    return (
                      <Table.Row key={c.id}>
                        <Table.Cell>
                          <Text size="1" color="gray">{i + 1}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex direction="column" gap="1">
                            <Text size="2" weight="bold">
                              {c.first_name} {c.last_name}
                            </Text>
                            {c.experience_level && c.experience_level !== "unknown" && (
                              <Badge
                                variant="soft"
                                size="1"
                                color={c.experience_level === "principal" ? "purple" :
                                  c.experience_level === "senior" ? "blue" : "gray"}
                              >
                                {c.experience_level}
                              </Badge>
                            )}
                            {c.specialization && (
                              <Text size="1" color="gray">{c.specialization}</Text>
                            )}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="1">{c.position ?? "-"}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="1">{c.company ?? "-"}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex direction="column" gap="1" align="start">
                            <Badge color={matchColor} size="2">
                              {matchPct}%
                            </Badge>
                            <Text size="1" color="gray" title={`Skills: ${mb.skillsMatched}/${mb.skillsRequired} | GH: ${(mb.githubDepth * 100).toFixed(0)}% | Exp: ${(mb.experienceFit * 100).toFixed(0)}%`}>
                              {mb.skillsMatched}/{mb.skillsRequired} skills
                            </Text>
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex direction="column" gap="1" align="start">
                            <Badge color={ghColor} size="1">{scoreTier}</Badge>
                            {c.github_recent_push_count != null && c.github_recent_push_count > 0 && (
                              <Text size="1" color="gray">{c.github_recent_push_count} pushes/90d</Text>
                            )}
                            {c.github_followers != null && c.github_followers > 0 && (
                              <Text size="1" color="gray">{c.github_followers} followers</Text>
                            )}
                            {c.github_public_repos != null && c.github_public_repos > 0 && (
                              <Text size="1" color="gray">{c.github_public_repos} repos</Text>
                            )}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex gap="1" wrap="wrap">
                            {skills.map((s) => (
                              <Badge key={s} variant="surface" color="gray" size="1">{s}</Badge>
                            ))}
                          </Flex>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge
                            color={isLondon ? "green" : "blue"}
                            variant="soft"
                            size="1"
                          >
                            {isLondon ? "London" : "UK"}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Flex gap="2" align="center">
                            {c.github_handle && (
                              <a
                                href={`https://github.com/${c.github_handle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <GitHubLogoIcon width={14} height={14} style={{ color: "var(--gray-9)" }} />
                              </a>
                            )}
                            {c.email && (
                              <a href={`mailto:${c.email}`}>
                                <EnvelopeClosedIcon width={14} height={14} style={{ color: "var(--gray-9)" }} />
                              </a>
                            )}
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                </Table.Body>
              </Table.Root>
            </Flex>
          </>
        )}

        {/* Job description */}
        {opp.raw_context && (
          <>
            <Separator size="4" />
            <Flex direction="column" gap="2">
              <Heading size="4">Job Description</Heading>
              <Text
                size="2"
                className={css({ whiteSpace: "pre-wrap", lineHeight: "1.6" })}
              >
                {opp.raw_context}
              </Text>
            </Flex>
          </>
        )}
      </Flex>
    </Container>
  );
}
