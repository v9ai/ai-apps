"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useGetContactQuery,
  useGetContactEmailsQuery,
  useGetContactOpportunitiesQuery,
  useFindContactEmailMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useImportResendEmailsMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
import { useStreamingReply } from "@/hooks/useStreamingReply";
import { button } from "@/recipes/button";
import { FollowUpEmailDialog, SCHEDULE_DELAYS } from "@/components/emails/follow-up-email-dialog";
import { PaperAuthorEnrichmentCard } from "@/components/paper-author-enrichment-card";
import {
  Badge,
  Box,
  Callout,
  Card,
  Code,
  Container,
  Dialog,
  Flex,
  Heading,
  Link as RadixLink,
  Separator,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckCircledIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  GitHubLogoIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagnifyingGlassIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  Pencil1Icon,
  TrashIcon,
  ChatBubbleIcon,
  ClockIcon,
} from "@radix-ui/react-icons";

// SCHEDULE_DELAYS and FollowUpEmailDialog imported from @/components/emails/follow-up-email-dialog

// ─── Compose Email Dialog (manual, no AI) ────────────────────────────────────

function ComposeEmailDialog({
  contact,
  onSent,
  onToast,
}: {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    company?: string | null;
    position?: string | null;
    email?: string | null;
  };
  onSent?: () => void;
  onToast?: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTime, setCustomTime] = useState("");

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setSubject("");
      setBody("");
      setIncludeResume(false);
      setError(null);
      setCustomTime("");
    }
  };

  const handleSend = async (scheduledAt?: string) => {
    if (!contact.email) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          to: contact.email,
          name: recipientName,
          subject,
          body,
          includeResume,
          ...(scheduledAt && { scheduledAt }),
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; scheduled?: boolean };
      if (json.success) {
        const message = json.scheduled
          ? `Scheduled for ${new Date(scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : `Sent to ${contact.email}`;
        setOpen(false);
        onToast?.(message);
        onSent?.();
      } else {
        setError(json.error ?? "Send failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "md" })}>
          <EnvelopeClosedIcon />
          Send email
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>Send email — {recipientName}</Dialog.Title>
        {(contact.position || contact.company) && (
          <Dialog.Description size="2" color="gray" mb="4">
            {contact.position ?? ""}
            {contact.position && contact.company ? " · " : ""}
            {contact.company ?? ""}
          </Dialog.Description>
        )}

        <Flex direction="column" gap="3">
          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">To</Text>
            <TextField.Root value={contact.email ?? ""} disabled />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Subject</Text>
            <TextField.Root
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Body</Text>
            <TextArea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="Write your message…"
            />
          </Box>

          <Flex align="center" gap="2">
            <input
              type="checkbox"
              id="includeResumeCompose"
              checked={includeResume}
              onChange={(e) => setIncludeResume(e.target.checked)}
            />
            <Text size="2" as="label" htmlFor="includeResumeCompose">
              Include resume
            </Text>
          </Flex>

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="between" gap="2" wrap="wrap">
            <Dialog.Close>
              <button className={button({ variant: "ghost" })}>Close</button>
            </Dialog.Close>
            <button
              className={button({ variant: "solidGreen" })}
              onClick={() => handleSend()}
              disabled={sending || !subject || !body}
            >
              <PaperPlaneIcon />
              {sending ? "Sending…" : "Send now"}
            </button>
          </Flex>

          <Separator size="4" />
          <Flex gap="2" align="center" wrap="wrap">
            <ClockIcon />
            <Text size="2" color="gray">Schedule:</Text>
            {SCHEDULE_DELAYS.map((d) => (
              <button
                key={d.label}
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => handleSend(new Date(Date.now() + d.ms).toISOString())}
                disabled={sending || !subject || !body}
              >
                {d.label}
              </button>
            ))}
            <input
              type="datetime-local"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--gray-6)", background: "transparent", color: "inherit" }}
            />
            {customTime && (
              <button
                className={button({ variant: "outline", size: "sm" })}
                onClick={() => handleSend(new Date(customTime).toISOString())}
                disabled={sending || !subject || !body}
              >
                <ClockIcon />
                Schedule
              </button>
            )}
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Generate Email Dialog ────────────────────────────────────────────────────

type EmailStep = "generate" | "edit";

function GenerateEmailDialog({
  contact,
  onSent,
}: {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    company?: string | null;
    position?: string | null;
    email?: string | null;
  };
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<EmailStep>("generate");
  const [instructions, setInstructions] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [customTime, setCustomTime] = useState("");

  const { content, partialContent, isStreaming, error, generate, stop, reset } =
    useStreamingEmail();

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();
  const hasEmail = !!contact.email;

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      setInstructions("");
      setStep("generate");
      setEditSubject("");
      setEditBody("");
      setIncludeResume(false);
      setSendResult(null);
      setCopied(false);
      setCustomTime("");
    }
  };

  const handleGenerate = async () => {
    await generate({
      recipientName,
      companyName: contact.company ?? undefined,
      recipientContext: contact.position ?? undefined,
      instructions: instructions || undefined,
    });
  };

  // When generation completes, seed edit fields and advance to edit step
  const handleProceedToEdit = () => {
    if (!content) return;
    setEditSubject(content.subject);
    setEditBody(content.body);
    setSendResult(null);
    setStep("edit");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (scheduledAt?: string) => {
    if (!contact.email) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          to: contact.email,
          name: recipientName,
          subject: editSubject,
          body: editBody,
          includeResume,
          ...(scheduledAt && { scheduledAt }),
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; scheduled?: boolean };
      if (json.success) {
        if (json.scheduled) {
          const when = new Date(scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setSendResult({ type: "success", message: `Scheduled for ${when}` });
        } else {
          setSendResult({ type: "success", message: `Sent to ${contact.email}` });
        }
        onSent?.();
      } else {
        setSendResult({ type: "error", message: json.error ?? "Send failed" });
      }
    } catch (err: unknown) {
      setSendResult({ type: "error", message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "md" })}>
          <MagicWandIcon />
          Draft email
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>
          {step === "generate" ? "Draft email" : "Edit & send"} — {recipientName}
        </Dialog.Title>
        {(contact.position || contact.company) && (
          <Dialog.Description size="2" color="gray" mb="4">
            {contact.position ?? ""}
            {contact.position && contact.company ? " · " : ""}
            {contact.company ?? ""}
          </Dialog.Description>
        )}

        {/* ── Generate step ── */}
        {step === "generate" && (
          <Flex direction="column" gap="3">
            <TextArea
              placeholder="Special instructions (optional) — e.g. mention their recent open source work…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              disabled={isStreaming}
            />

            <Flex gap="2">
              <button className={button({ variant: "ghost" })} onClick={handleGenerate} disabled={isStreaming}>
                <MagicWandIcon />
                {isStreaming ? "Generating…" : "Generate"}
              </button>
              {isStreaming && (
                <button className={button({ variant: "ghost" })} onClick={stop}>
                  Stop
                </button>
              )}
              {content && !isStreaming && (
                <button className={button({ variant: "ghost" })} onClick={() => { reset(); setInstructions(""); }}>
                  Regenerate
                </button>
              )}
            </Flex>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            {isStreaming && partialContent && (
              <Box>
                <Text size="1" color="gray" mb="1" as="p">Streaming…</Text>
                <Code size="1" style={{ display: "block", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
                  {partialContent}
                </Code>
              </Box>
            )}

            {content && !isStreaming && (
              <Box style={{ background: "var(--green-2)", borderRadius: 8, padding: "var(--space-3)" }}>
                <Flex justify="between" align="center" mb="2">
                  <Badge color="green" size="1"><CheckIcon /> Generated</Badge>
                </Flex>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">SUBJECT</Text>
                <Text size="2" weight="medium" as="p" mb="3">{content.subject}</Text>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">BODY</Text>
                <Text size="2" as="p" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{content.body}</Text>
              </Box>
            )}

            <Flex align="center" gap="2">
              <input
                type="checkbox"
                id="includeResumeGenerate"
                checked={includeResume}
                onChange={(e) => setIncludeResume(e.target.checked)}
              />
              <Text size="2" as="label" htmlFor="includeResumeGenerate">
                Include resume
              </Text>
            </Flex>

            <Flex justify="between" mt="2">
              <Dialog.Close>
                <button className={button({ variant: "ghost" })}>Close</button>
              </Dialog.Close>
              {content && !isStreaming && (
                <button className={button({ variant: "ghost" })} onClick={handleProceedToEdit}>
                  Edit & Send →
                </button>
              )}
            </Flex>
          </Flex>
        )}

        {/* ── Edit & Send step ── */}
        {step === "edit" && (
          <Flex direction="column" gap="3">
            <Box>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Subject</Text>
              <TextField.Root
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </Box>

            <Box>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Body</Text>
              <TextArea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={12}
              />
            </Box>

            <Flex align="center" gap="2">
              <input
                type="checkbox"
                id="includeResume"
                checked={includeResume}
                onChange={(e) => setIncludeResume(e.target.checked)}
              />
              <Text size="2" as="label" htmlFor="includeResume">
                Include resume
              </Text>
            </Flex>

            {sendResult && (
              <Callout.Root color={sendResult.type === "success" ? "green" : "red"} size="1">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text>{sendResult.message}</Callout.Text>
              </Callout.Root>
            )}

            <Flex justify="between" gap="2" wrap="wrap">
              <button className={button({ variant: "ghost" })} onClick={() => setStep("generate")}>
                ← Back
              </button>
              <Flex gap="2" align="center">
                <button className={button({ variant: "ghost" })} onClick={handleCopy}>
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </button>
                {hasEmail ? (
                  <button
                    className={button({ variant: "solidGreen" })}
                    onClick={() => handleSend()}
                    disabled={sending || !editSubject || !editBody}
                  >
                    <PaperPlaneIcon />
                    {sending ? "Sending…" : "Send now"}
                  </button>
                ) : (
                  <button className={button({ variant: "ghost" })} disabled>
                    No email address
                  </button>
                )}
              </Flex>
            </Flex>

            {hasEmail && (
              <>
                <Separator size="4" />
                <Flex gap="2" align="center" wrap="wrap">
                  <ClockIcon />
                  <Text size="2" color="gray">Schedule:</Text>
                  {SCHEDULE_DELAYS.map((d) => (
                    <button
                      key={d.label}
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => handleSend(new Date(Date.now() + d.ms).toISOString())}
                      disabled={sending || !editSubject || !editBody}
                    >
                      {d.label}
                    </button>
                  ))}
                  <input
                    type="datetime-local"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--gray-6)", background: "transparent", color: "inherit" }}
                  />
                  {customTime && (
                    <button
                      className={button({ variant: "outline", size: "sm" })}
                      onClick={() => handleSend(new Date(customTime).toISOString())}
                      disabled={sending || !editSubject || !editBody}
                    >
                      <ClockIcon />
                      Schedule
                    </button>
                  )}
                </Flex>
              </>
            )}
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

// FollowUpEmailDialog imported from @/components/emails/follow-up-email-dialog

// ─── Show Interest Email Dialog ─────────────────────────────────────────────

function ShowInterestEmailDialog({
  contact,
  opportunity,
  onSent,
}: {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    company?: string | null;
    position?: string | null;
    email?: string | null;
  };
  opportunity: {
    id: string;
    title: string;
    companyName?: string | null;
  };
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editTo, setEditTo] = useState(contact.email ?? "");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [customTime, setCustomTime] = useState("");

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();
  const hasEmail = !!editTo.trim();

  const buildShowInterest = () => {
    const role = opportunity.title;
    const company = opportunity.companyName ?? contact.company ?? "your team";

    const subject = `Interest in ${role} opportunity`;
    const body = `Hi ${contact.firstName},

I came across the ${role} position at ${company} and wanted to express my interest.

My background in agentic AI systems, RAG pipelines, and multi-agent orchestration aligns well with what you're looking for. I've been shipping production ML pipelines and eval frameworks end-to-end using Python and TypeScript.

I'd love to learn more about the role and discuss how I could contribute. Would you be open to a quick call?

Best,
Vadim`;

    return { subject, body };
  };

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (val) {
      const { subject, body } = buildShowInterest();
      setEditTo(contact.email ?? "");
      setEditSubject(subject);
      setEditBody(body);
      setSendResult(null);
      setCopied(false);
      setCustomTime("");
      setIncludeResume(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (scheduledAt?: string) => {
    const to = editTo.trim();
    if (!to) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          to,
          name: recipientName,
          subject: editSubject,
          body: editBody,
          includeResume,
          ...(scheduledAt && { scheduledAt }),
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; scheduled?: boolean };
      if (json.success) {
        if (json.scheduled) {
          const when = new Date(scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setSendResult({ type: "success", message: `Scheduled for ${when}` });
        } else {
          setSendResult({ type: "success", message: `Sent to ${to}` });
        }
        onSent?.();
      } else {
        setSendResult({ type: "error", message: json.error ?? "Send failed" });
      }
    } catch (err: unknown) {
      setSendResult({ type: "error", message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "sm" })}>
          <EnvelopeClosedIcon />
          Send email
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>Show interest — {recipientName}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          {opportunity.title}
          {opportunity.companyName ? ` · ${opportunity.companyName}` : ""}
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">To</Text>
            <TextField.Root
              type="email"
              placeholder="recipient@example.com"
              value={editTo}
              onChange={(e) => setEditTo(e.target.value)}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Subject</Text>
            <TextField.Root
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Body</Text>
            <TextArea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={12}
            />
          </Box>

          <Flex align="center" gap="2">
            <input
              type="checkbox"
              id={`includeResumeInterest-${opportunity.id}`}
              checked={includeResume}
              onChange={(e) => setIncludeResume(e.target.checked)}
            />
            <Text size="2" as="label" htmlFor={`includeResumeInterest-${opportunity.id}`}>
              Include resume
            </Text>
          </Flex>

          {sendResult && (
            <Callout.Root color={sendResult.type === "success" ? "green" : "red"} size="1">
              <Callout.Icon><InfoCircledIcon /></Callout.Icon>
              <Callout.Text>{sendResult.message}</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="between" gap="2" wrap="wrap">
            <Dialog.Close>
              <button className={button({ variant: "ghost" })}>Cancel</button>
            </Dialog.Close>
            <Flex gap="2" align="center">
              <button className={button({ variant: "ghost" })} onClick={handleCopy}>
                <CopyIcon />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                className={button({ variant: "solidGreen" })}
                onClick={() => handleSend()}
                disabled={sending || !hasEmail || !editSubject || !editBody}
              >
                <PaperPlaneIcon />
                {sending ? "Sending…" : "Send now"}
              </button>
            </Flex>
          </Flex>

          <>
            <Separator size="4" />
            <Flex gap="2" align="center" wrap="wrap">
              <ClockIcon />
              <Text size="2" color="gray">Schedule:</Text>
              {SCHEDULE_DELAYS.map((d) => (
                <button
                  key={d.label}
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={() => handleSend(new Date(Date.now() + d.ms).toISOString())}
                  disabled={sending || !hasEmail || !editSubject || !editBody}
                >
                  {d.label}
                </button>
              ))}
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--gray-6)", background: "transparent", color: "inherit" }}
              />
              {customTime && (
                <button
                  className={button({ variant: "outline", size: "sm" })}
                  onClick={() => handleSend(new Date(customTime).toISOString())}
                  disabled={sending || !hasEmail || !editSubject || !editBody}
                >
                  <ClockIcon />
                  Schedule
                </button>
              )}
            </Flex>
          </>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Reply Email Dialog ─────────────────────────────────────────────────────

type ReplyStep = "compose" | "edit";

function ReplyEmailDialog({
  contact,
  receivedEmail,
  onSent,
}: {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string | null;
    position?: string | null;
    company?: string | null;
  };
  receivedEmail: {
    id: number;
    fromEmail: string;
    subject: string | null;
    textContent: string | null;
  };
  onSent?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<ReplyStep>("compose");
  const [instructions, setInstructions] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [customTime, setCustomTime] = useState("");

  const { content, partialContent, isStreaming, error, generate, stop, reset } =
    useStreamingReply();

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();
  const replySubject = receivedEmail.subject?.startsWith("Re:")
    ? receivedEmail.subject
    : `Re: ${receivedEmail.subject ?? ""}`;

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      setInstructions("");
      setStep("compose");
      setEditSubject("");
      setEditBody("");
      setSendResult(null);
      setCopied(false);
      setCustomTime("");
    }
  };

  const handleGenerate = async () => {
    await generate({
      contactId: contact.id,
      contactName: recipientName,
      receivedEmailId: receivedEmail.id,
      instructions: instructions || undefined,
    });
  };

  const handleProceedToEdit = () => {
    if (!content) return;
    setEditSubject(content.subject);
    setEditBody(content.body);
    setSendResult(null);
    setStep("edit");
  };

  const handleWriteManually = () => {
    setEditSubject(replySubject);
    setEditBody("");
    setSendResult(null);
    setStep("edit");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${editSubject}\n\n${editBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async (scheduledAt?: string) => {
    const to = receivedEmail.fromEmail;
    if (!to) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          to,
          name: recipientName,
          subject: editSubject,
          body: editBody,
          receivedEmailId: receivedEmail.id,
          ...(scheduledAt && { scheduledAt }),
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string; scheduled?: boolean };
      if (json.success) {
        if (json.scheduled) {
          const when = new Date(scheduledAt!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          setSendResult({ type: "success", message: `Scheduled for ${when}` });
        } else {
          setSendResult({ type: "success", message: `Reply sent to ${to}` });
        }
        onSent?.();
      } else {
        setSendResult({ type: "error", message: json.error ?? "Send failed" });
      }
    } catch (err: unknown) {
      setSendResult({ type: "error", message: err instanceof Error ? err.message : "Send failed" });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "sm" })} style={{ marginTop: 8 }}>
          <ChatBubbleIcon />
          Reply
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>Reply to {recipientName}</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Replying to: {receivedEmail.fromEmail}
        </Dialog.Description>

        {/* Their message */}
        {receivedEmail.textContent && (
          <Box mb="4" style={{ background: "var(--purple-2)", borderRadius: 6, padding: "var(--space-2)" }}>
            <Text size="1" color="gray" weight="medium" as="p" mb="1">Their message:</Text>
            <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
              {stripQuotedReply(receivedEmail.textContent)}
            </Text>
          </Box>
        )}

        {/* ── Compose step ── */}
        {step === "compose" && (
          <Flex direction="column" gap="3">
            <TextArea
              placeholder="Instructions for AI reply (optional) — e.g. wish them well, ask about their project…"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              disabled={isStreaming}
            />

            <Flex gap="2" wrap="wrap">
              <button className={button({ variant: "ghost" })} onClick={handleGenerate} disabled={isStreaming}>
                <MagicWandIcon />
                {isStreaming ? "Generating…" : "AI Generate"}
              </button>
              {isStreaming && (
                <button className={button({ variant: "ghost" })} onClick={stop}>
                  Stop
                </button>
              )}
              {content && !isStreaming && (
                <button className={button({ variant: "ghost" })} onClick={() => { reset(); setInstructions(""); }}>
                  Regenerate
                </button>
              )}
              <button className={button({ variant: "ghost" })} onClick={handleWriteManually}>
                <Pencil1Icon />
                Write manually
              </button>
            </Flex>

            {error && (
              <Callout.Root color="red" size="1">
                <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}

            {isStreaming && partialContent && (
              <Box>
                <Text size="1" color="gray" mb="1" as="p">Streaming…</Text>
                <Code size="1" style={{ display: "block", whiteSpace: "pre-wrap", maxHeight: 200, overflow: "auto" }}>
                  {partialContent}
                </Code>
              </Box>
            )}

            {content && !isStreaming && (
              <Box style={{ background: "var(--green-2)", borderRadius: 8, padding: "var(--space-3)" }}>
                <Flex justify="between" align="center" mb="2">
                  <Badge color="green" size="1"><CheckIcon /> Generated</Badge>
                </Flex>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">SUBJECT</Text>
                <Text size="2" weight="medium" as="p" mb="3">{content.subject}</Text>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">BODY</Text>
                <Text size="2" as="p" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{content.body}</Text>
              </Box>
            )}

            <Flex justify="between" mt="2">
              <Dialog.Close>
                <button className={button({ variant: "ghost" })}>Close</button>
              </Dialog.Close>
              {content && !isStreaming && (
                <button className={button({ variant: "ghost" })} onClick={handleProceedToEdit}>
                  Edit & Send →
                </button>
              )}
            </Flex>
          </Flex>
        )}

        {/* ── Edit & Send step ── */}
        {step === "edit" && (
          <Flex direction="column" gap="3">
            <Box>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Subject</Text>
              <TextField.Root
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
              />
            </Box>

            <Box>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">Body</Text>
              <TextArea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                rows={10}
              />
            </Box>

            {sendResult && (
              <Callout.Root color={sendResult.type === "success" ? "green" : "red"} size="1">
                <Callout.Icon><InfoCircledIcon /></Callout.Icon>
                <Callout.Text>{sendResult.message}</Callout.Text>
              </Callout.Root>
            )}

            <Flex justify="between" gap="2" wrap="wrap">
              <button className={button({ variant: "ghost" })} onClick={() => setStep("compose")}>
                ← Back
              </button>
              <Flex gap="2" align="center" wrap="wrap">
                <button className={button({ variant: "ghost" })} onClick={handleCopy}>
                  <CopyIcon />
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  className={button({ variant: "solidGreen" })}
                  onClick={() => handleSend()}
                  disabled={sending || !editSubject || !editBody}
                >
                  <PaperPlaneIcon />
                  {sending ? "Sending…" : "Send now"}
                </button>
              </Flex>
            </Flex>

            <Separator size="4" />

            <Flex gap="2" align="center" wrap="wrap">
              <ClockIcon />
              <Text size="2" color="gray">Schedule:</Text>
              {SCHEDULE_DELAYS.map((d) => (
                <button
                  key={d.label}
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={() => handleSend(new Date(Date.now() + d.ms).toISOString())}
                  disabled={sending || !editSubject || !editBody}
                >
                  {d.label}
                </button>
              ))}
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--gray-6)", background: "transparent", color: "inherit" }}
              />
              {customTime && (
                <button
                  className={button({ variant: "outline", size: "sm" })}
                  onClick={() => handleSend(new Date(customTime).toISOString())}
                  disabled={sending || !editSubject || !editBody}
                >
                  <ClockIcon />
                  Schedule
                </button>
              )}
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Edit Contact Dialog ──────────────────────────────────────────────────────

function EditContactDialog({
  contact,
  onUpdated,
}: {
  contact: {
    id: number;
    firstName: string;
    lastName: string;
    email?: string | null;
    linkedinUrl?: string | null;
    position?: string | null;
    githubHandle?: string | null;
    telegramHandle?: string | null;
    doNotContact: boolean;
    tags: string[];
  };
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    linkedinUrl: contact.linkedinUrl ?? "",
    position: contact.position ?? "",
    githubHandle: contact.githubHandle ?? "",
    telegramHandle: contact.telegramHandle ?? "",
    doNotContact: contact.doNotContact,
    tags: contact.tags.join(", "),
  });
  const [updateContact, { loading }] = useUpdateContactMutation();
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (val) {
      setForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? "",
        linkedinUrl: contact.linkedinUrl ?? "",
        position: contact.position ?? "",
        githubHandle: contact.githubHandle ?? "",
        telegramHandle: contact.telegramHandle ?? "",
        doNotContact: contact.doNotContact,
        tags: contact.tags.join(", "),
      });
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.firstName.trim()) {
      setError("First name is required.");
      return;
    }
    setError(null);
    try {
      await updateContact({
        variables: {
          id: contact.id,
          input: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim() || undefined,
            email: form.email.trim() || undefined,
            linkedinUrl: form.linkedinUrl.trim() || undefined,
            position: form.position.trim() || undefined,
            githubHandle: form.githubHandle.trim() || undefined,
            telegramHandle: form.telegramHandle.trim() || undefined,
            doNotContact: form.doNotContact,
            tags: form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
          },
        },
      });
      setOpen(false);
      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update contact.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "md" })}>
          <Pencil1Icon />
          Edit
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="480px">
        <Dialog.Title>Edit contact</Dialog.Title>

        <Flex direction="column" gap="3">
          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="2">
            <Box style={{ flex: 1 }}>
              <Text size="1" color="gray" mb="1" as="p">
                First name *
              </Text>
              <TextField.Root
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="1" color="gray" mb="1" as="p">
                Last name
              </Text>
              <TextField.Root
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Box>
          </Flex>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Position
            </Text>
            <TextField.Root
              placeholder="e.g. Engineering Manager"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Email
            </Text>
            <TextField.Root
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              LinkedIn URL
            </Text>
            <TextField.Root
              placeholder="https://linkedin.com/in/…"
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              GitHub handle
            </Text>
            <TextField.Root
              placeholder="username"
              value={form.githubHandle}
              onChange={(e) => setForm((f) => ({ ...f, githubHandle: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Telegram handle
            </Text>
            <TextField.Root
              placeholder="username"
              value={form.telegramHandle}
              onChange={(e) => setForm((f) => ({ ...f, telegramHandle: e.target.value }))}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" mb="1" as="p">
              Tags (comma-separated)
            </Text>
            <TextField.Root
              placeholder="recruiter, hiring-manager"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </Box>

          <Flex align="center" gap="2">
            <input
              type="checkbox"
              id="doNotContact"
              checked={form.doNotContact}
              onChange={(e) => setForm((f) => ({ ...f, doNotContact: e.target.checked }))}
            />
            <Text size="2" as="label" htmlFor="doNotContact">
              Do not contact
            </Text>
          </Flex>
        </Flex>

        <Flex gap="3" mt="4" justify="end">
          <Dialog.Close>
            <button className={button({ variant: "ghost" })}>
              Cancel
            </button>
          </Dialog.Close>
          <button className={button({ variant: "ghost" })} onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving…" : "Save changes"}
          </button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Delete Contact Dialog ────────────────────────────────────────────────────

function DeleteContactDialog({
  contactId,
  contactName,
  onDeleted,
}: {
  contactId: number;
  contactName: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleteContact, { loading }] = useDeleteContactMutation();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setError(null);
    try {
      const { data } = await deleteContact({ variables: { id: contactId } });
      if (data?.deleteContact.success) {
        onDeleted();
      } else {
        setError(data?.deleteContact.message ?? "Delete failed.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "md" })}>
          <TrashIcon />
          Delete
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Delete {contactName}?</Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          This action cannot be undone.
        </Dialog.Description>

        {error && (
          <Callout.Root color="red" size="1" mb="3">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="3" justify="end">
          <Dialog.Close>
            <button className={button({ variant: "ghost" })}>
              Cancel
            </button>
          </Dialog.Close>
          <button className={button({ variant: "solid" })} onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Forwarding Alias Dialog (@vadim.blog) ───────────────────────────────────

function ForwardingAliasDialog({
  contact,
  onCreated,
}: {
  contact: {
    id: number;
    firstName: string;
    email?: string | null;
    forwardingAlias?: string | null;
  };
  onCreated?: () => void;
}) {
  const initialAlias = (contact.forwardingAlias ?? contact.firstName ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
  const [open, setOpen] = useState(false);
  const [alias, setAlias] = useState(initialAlias);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ aliasAddress: string; forwardsTo: string } | null>(null);

  useEffect(() => {
    if (open) {
      setAlias(initialAlias);
      setError(null);
      setResult(null);
    }
  }, [open, initialAlias]);

  const alreadyExists = Boolean(contact.forwardingAlias);

  const handleSubmit = async () => {
    if (!alias || !contact.email) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/contacts/forwarding-alias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contact.id, alias }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
        aliasAddress?: string;
        forwardsTo?: string;
      };
      if (json.success && json.aliasAddress && json.forwardsTo) {
        setResult({ aliasAddress: json.aliasAddress, forwardsTo: json.forwardsTo });
        onCreated?.();
      } else {
        setError(json.error ?? "Failed to create alias");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alias");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "outline" })}>
          <EnvelopeClosedIcon />
          {alreadyExists ? `${contact.forwardingAlias}@vadim.blog` : "Set @vadim.blog alias"}
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="460px">
        <Dialog.Title>
          {alreadyExists ? "Update" : "Create"} @vadim.blog alias
        </Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          Incoming mail to <Code>{alias || "{alias}"}@vadim.blog</Code> will be forwarded to{" "}
          <Code>{contact.email ?? "(no email)"}</Code> via Resend.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">Alias</Text>
            <Flex align="center" gap="2">
              <TextField.Root
                value={alias}
                onChange={(e) => setAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                placeholder="firstname"
                disabled={submitting || Boolean(result)}
                style={{ flex: 1 }}
              />
              <Text size="2" color="gray">@vadim.blog</Text>
            </Flex>
          </Box>

          {!contact.email && (
            <Callout.Root color="amber" size="1">
              <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
              <Callout.Text>Contact has no email to forward to.</Callout.Text>
            </Callout.Root>
          )}

          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Icon><ExclamationTriangleIcon /></Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          {result && (
            <Callout.Root color="green" size="1">
              <Callout.Icon><CheckCircledIcon /></Callout.Icon>
              <Callout.Text>
                Created <Code>{result.aliasAddress}</Code> → <Code>{result.forwardsTo}</Code>
              </Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="end" gap="2">
            <Dialog.Close>
              <button className={button({ variant: "ghost" })}>
                {result ? "Close" : "Cancel"}
              </button>
            </Dialog.Close>
            {!result && (
              <button
                className={button({ variant: "solidGreen" })}
                onClick={handleSubmit}
                disabled={submitting || !alias || !contact.email}
              >
                {submitting ? "Saving…" : alreadyExists ? "Update alias" : "Save alias"}
              </button>
            )}
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Email Card (inline, expandable) ─────────────────────────────────────────

/** Strip quoted reply text (lines starting with > and the "On ... wrote:" preamble) */
function stripQuotedReply(text: string): string {
  return text.replace(/\n*On .+wrote:\n*(>.*\n?)*/gs, "").trim();
}

type ContactEmailRow = {
  id: number;
  resendId: string;
  subject: string;
  fromEmail: string;
  toEmails: string[];
  textContent?: string | null;
  status: string;
  sentAt?: string | null;
  replyReceived?: boolean;
  createdAt: string;
};

function EmailCard({ email }: { email: ContactEmailRow }) {
  return (
    <Card>
      <Box p="3">
        <Flex justify="between" align="start" gap="2" wrap="wrap" mb={email.textContent ? "2" : undefined}>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text size="2" weight="medium" as="p" style={{ wordBreak: "break-word" }}>
              {email.subject}
            </Text>
            <Text size="1" color="gray" as="p" mt="1">
              {email.fromEmail} → {email.toEmails.join(", ")} · {email.sentAt
                ? new Date(email.sentAt).toLocaleString()
                : new Date(email.createdAt).toLocaleString()}
            </Text>
          </Box>
          <Flex gap="1">
            {email.replyReceived && (
              <Badge color="purple" variant="soft" size="1">replied</Badge>
            )}
            <Badge
              color={
                email.status === "delivered"
                  ? "green"
                  : email.status === "bounced"
                    ? "red"
                    : "blue"
              }
              variant="soft"
              size="1"
            >
              {email.status}
            </Badge>
          </Flex>
        </Flex>

        {email.textContent && (
          <Box
            style={{
              background: "var(--gray-2)",
              borderRadius: 6,
              padding: "var(--space-3)",
              whiteSpace: "pre-wrap",
              lineHeight: "1.6",
              maxHeight: 300,
              overflow: "auto",
            }}
          >
            <Text size="2">{email.textContent}</Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContactDetailClient({ contactId, contactSlug }: { contactId?: number; contactSlug?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, refetch } = useGetContactQuery({
    variables: contactId ? { id: contactId } : { slug: contactSlug },
    skip: !contactId && !contactSlug,
  });

  const contact = data?.contact;
  const resolvedId = contact?.id;

  const {
    data: emailsData,
    loading: emailsLoading,
    refetch: refetchEmails,
  } = useGetContactEmailsQuery({
    variables: { contactId: resolvedId! },
    skip: !resolvedId,
  });

  const {
    data: opportunitiesData,
    loading: opportunitiesLoading,
  } = useGetContactOpportunitiesQuery({
    variables: { contactId: resolvedId! },
    skip: !resolvedId,
  });

  const [findEmail, { loading: finding }] = useFindContactEmailMutation();
  const [importResendEmails] = useImportResendEmailsMutation();
  const [findResult, setFindResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Toast notification for email sent/scheduled
  const [emailToast, setEmailToast] = useState<string | null>(null);
  useEffect(() => {
    if (!emailToast) return;
    const t = setTimeout(() => setEmailToast(null), 3000);
    return () => clearTimeout(t);
  }, [emailToast]);

  // Background Resend sync — fetch latest emails after initial load
  const [resendSynced, setResendSynced] = useState(false);
  useEffect(() => {
    if (!resolvedId || !isAdmin || resendSynced) return; // resend sync stays admin-only
    setResendSynced(true);
    importResendEmails({ variables: { maxEmails: 50 } }).then(() => {
      refetchEmails();
    }).catch(() => {});
  }, [resolvedId, isAdmin, resendSynced, importResendEmails, refetchEmails]);

  // Scrape posts via Chrome extension
  const [scraping, setScraping] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<string | null>(null);

  const handleScrapePosts = useCallback(() => {
    if (!contact?.linkedinUrl) return;
    setScraping(true);
    setScrapeStatus("Starting...");

    // Listen for progress updates from extension (relayed via webapp-bridge)
    const handler = (e: MessageEvent) => {
      if (e.data?.source !== "lead-gen-bg" || e.data?.action !== "postScrapingProgress") return;
      if (e.data.error) {
        setScrapeStatus(`Error: ${e.data.error}`);
        setScraping(false);
        return;
      }
      if (e.data.done) {
        setScrapeStatus(`Done: ${e.data.totalPosts ?? 0} posts, ${e.data.totalLikes ?? 0} likes`);
        setScraping(false);
        return;
      }
      if (e.data.status) {
        setScrapeStatus(e.data.status);
      }
    };
    window.addEventListener("message", handler);

    // Send message to extension
    window.postMessage({
      source: "lead-gen-ext",
      action: "scrapeContactPosts",
      contactId: contact.id,
      linkedinUrl: contact.linkedinUrl,
      contactName: `${contact.firstName} ${contact.lastName}`.trim(),
    }, "*");

    // Cleanup listener after 5 minutes
    setTimeout(() => {
      window.removeEventListener("message", handler);
      if (scraping) {
        setScraping(false);
        setScrapeStatus("Timed out");
      }
    }, 300000);

    return () => window.removeEventListener("message", handler);
  }, [contact, scraping]);

  // Import profile via Chrome extension
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleImportProfile = useCallback(() => {
    if (!contact?.linkedinUrl) return;
    setImporting(true);
    setImportStatus("Starting...");

    const handler = (e: MessageEvent) => {
      if (e.data?.source !== "lead-gen-bg" || e.data?.action !== "importProfileProgress") return;
      if (e.data.contactId !== contact.id) return;
      if (e.data.error) {
        setImportStatus(`Error: ${e.data.error}`);
        setImporting(false);
        return;
      }
      if (e.data.done) {
        setImportStatus(e.data.status || "Import complete");
        setImporting(false);
        refetch();
        return;
      }
      if (e.data.status) {
        setImportStatus(e.data.status);
      }
    };
    window.addEventListener("message", handler);

    window.postMessage({
      source: "lead-gen-ext",
      action: "importLinkedInProfile",
      contactId: contact.id,
      linkedinUrl: contact.linkedinUrl,
      contactName: `${contact.firstName} ${contact.lastName}`.trim(),
    }, "*");

    setTimeout(() => {
      window.removeEventListener("message", handler);
      if (importing) {
        setImporting(false);
        setImportStatus("Timed out");
      }
    }, 120000);

    return () => window.removeEventListener("message", handler);
  }, [contact, importing, refetch]);

  const handleFindEmail = useCallback(async () => {
    if (!contact) return;
    setFindResult(null);
    try {
      const { data: result } = await findEmail({ variables: { contactId: contact.id } });
      const res = result?.findContactEmail;
      if (res?.success && res.emailFound && res.email) {
        setFindResult({
          type: "success",
          message: `Found: ${res.email}${res.verified ? " (verified)" : ""}`,
        });
        refetch();
      } else {
        setFindResult({
          type: "error",
          message: res?.message ?? `No email found (tried ${res?.candidatesTried ?? 0} candidates)`,
        });
      }
    } catch (err: unknown) {
      setFindResult({ type: "error", message: err instanceof Error ? err.message : "Failed to find email" });
    }
  }, [contact, findEmail, refetch]);

  useEffect(() => {
    if (contact) {
      document.title = `${contact.firstName} ${contact.lastName}`;
    }
  }, [contact]);

  if (loading) {
    return (
      <Container size="3" p="8">
        <Flex justify="center">
          <Spinner size="3" />
        </Flex>
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
          <Callout.Text>Contact not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Back link */}
        <Box>
          <Link href="/contacts" style={{ textDecoration: "none" }}>
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                All contacts
              </Text>
            </Flex>
          </Link>

          <Flex align="center" justify="between" wrap="wrap" gap="3">
            <Flex align="center" gap="3" wrap="wrap">
              <Heading size="6">{fullName}</Heading>
              {contact.emailVerified && (
                <Badge color="green" variant="soft">
                  verified
                </Badge>
              )}
              {contact.doNotContact && (
                <Badge color="red" variant="soft">
                  do not contact
                </Badge>
              )}
            </Flex>

            {/* Header actions */}
            <Flex gap="2" wrap="wrap">
              {contact.linkedinUrl && (
                <button
                  className={button({ variant: "outline" })}
                  onClick={handleImportProfile}
                  disabled={importing}
                >
                  <LinkedInLogoIcon />
                  {importing ? "Importing…" : "Import profile"}
                </button>
              )}
              {contact.linkedinUrl && (
                <button
                  className={button({ variant: "outline" })}
                  onClick={handleScrapePosts}
                  disabled={scraping}
                >
                  <LinkedInLogoIcon />
                  {scraping ? "Scraping…" : "Scrape posts"}
                </button>
              )}
              {contact.tags?.includes("cpn-outreach") && (
                <ForwardingAliasDialog
                  contact={{
                    id: contact.id,
                    firstName: contact.firstName,
                    email: contact.email,
                    forwardingAlias: contact.forwardingAlias,
                  }}
                  onCreated={() => refetch()}
                />
              )}
              <EditContactDialog contact={contact} onUpdated={() => refetch()} />
              <DeleteContactDialog
                contactId={contact.id}
                contactName={fullName}
                onDeleted={() => router.push("/contacts")}
              />
            </Flex>
          </Flex>
        </Box>

        {/* Find email result */}
        {findResult && (
          <Callout.Root color={findResult.type === "success" ? "green" : "red"} size="1">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{findResult.message}</Callout.Text>
          </Callout.Root>
        )}

        {/* Scrape posts status */}
        {scrapeStatus && (
          <Callout.Root color={scrapeStatus.startsWith("Error") ? "red" : scrapeStatus.startsWith("Done") ? "green" : "blue"} size="1">
            <Callout.Icon>
              {scraping ? <LinkedInLogoIcon /> : <InfoCircledIcon />}
            </Callout.Icon>
            <Callout.Text>{scrapeStatus}</Callout.Text>
          </Callout.Root>
        )}

        {/* Import profile status */}
        {importStatus && (
          <Callout.Root color={importStatus.startsWith("Error") ? "red" : importStatus.startsWith("Imported") ? "green" : "blue"} size="1">
            <Callout.Icon>
              {importing ? <LinkedInLogoIcon /> : <InfoCircledIcon />}
            </Callout.Icon>
            <Callout.Text>{importStatus}</Callout.Text>
          </Callout.Root>
        )}

        {/* Main info card */}
        <Card>
          <Box p="4">
            <Flex direction="column" gap="4">
              {/* Position & Company */}
              {(contact.position || contact.company) && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    Role
                  </Text>
                  {contact.position && (
                    <Text size="3" as="p" mt="1">
                      {contact.position}
                    </Text>
                  )}
                  {contact.company && (
                    <Text size="2" as="p" mt="1" color="gray">
                      {contact.companyId ? (
                        <RadixLink asChild>
                          <Link href={`/companies/${contact.companyId}`}>
                            {contact.company}
                          </Link>
                        </RadixLink>
                      ) : (
                        contact.company
                      )}
                    </Text>
                  )}
                </Box>
              )}

              <Separator size="4" />

              {/* Primary email */}
              <Box>
                <Text size="2" color="gray" weight="medium">
                  Email
                </Text>
                {contact.email ? (
                  <Flex align="center" gap="2" mt="1">
                    <EnvelopeClosedIcon />
                    <RadixLink href={`mailto:${contact.email}`} size="3">
                      {contact.email}
                    </RadixLink>
                    {contact.emailVerified && (
                      <Badge color="green" variant="soft" size="1">
                        verified
                      </Badge>
                    )}
                    {!contact.emailVerified && contact.nbResult && (
                      <Badge color="orange" variant="soft" size="1">
                        {contact.nbResult}
                      </Badge>
                    )}
                  </Flex>
                ) : (
                  <Flex align="center" gap="3" mt="1">
                    <Text size="2" color="gray">
                      No email
                    </Text>
                    <button
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={handleFindEmail}
                      disabled={finding}
                    >
                      {finding ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
                      Find email
                    </button>
                  </Flex>
                )}
              </Box>

              {/* Forwarding alias (@vadim.blog) */}
              {contact.forwardingAlias && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    Forwarding alias
                  </Text>
                  <Flex align="center" gap="2" mt="1">
                    <EnvelopeClosedIcon />
                    <RadixLink href={`mailto:${contact.forwardingAlias}@vadim.blog`} size="3">
                      {contact.forwardingAlias}@vadim.blog
                    </RadixLink>
                    {contact.email && (
                      <Text size="1" color="gray">
                        → {contact.email}
                      </Text>
                    )}
                  </Flex>
                </Box>
              )}

              {/* Additional emails */}
              {contact.emails && contact.emails.length > 0 && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    Additional emails
                  </Text>
                  <Flex direction="column" gap="1" mt="1">
                    {contact.emails.map((email) => (
                      <RadixLink key={email} href={`mailto:${email}`} size="2">
                        {email}
                      </RadixLink>
                    ))}
                  </Flex>
                </Box>
              )}

              {/* Bounced emails */}
              {contact.bouncedEmails && contact.bouncedEmails.length > 0 && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    Bounced emails
                  </Text>
                  <Flex direction="column" gap="1" mt="1">
                    {contact.bouncedEmails.map((email) => (
                      <Text key={email} size="2" color="red">
                        {email}
                      </Text>
                    ))}
                  </Flex>
                </Box>
              )}

              {/* NeverBounce details */}
              {(contact.nbStatus || (contact.nbFlags && contact.nbFlags.length > 0) || contact.nbSuggestedCorrection) && (
                <Box>
                  <Text size="2" color="gray" weight="medium">
                    NeverBounce
                  </Text>
                  <Flex direction="column" gap="1" mt="1">
                    {contact.nbStatus && (
                      <Text size="2">
                        Status:{" "}
                        <Badge
                          color={
                            contact.nbStatus === "valid"
                              ? "green"
                              : contact.nbStatus === "invalid"
                                ? "red"
                                : "orange"
                          }
                          variant="soft"
                          size="1"
                        >
                          {contact.nbStatus}
                        </Badge>
                      </Text>
                    )}
                    {contact.nbFlags && contact.nbFlags.length > 0 && (
                      <Flex gap="1" wrap="wrap">
                        {contact.nbFlags.map((flag) => (
                          <Badge key={flag} color="gray" variant="soft" size="1">
                            {flag}
                          </Badge>
                        ))}
                      </Flex>
                    )}
                    {contact.nbSuggestedCorrection && (
                      <Text size="2" color="gray">
                        Suggested:{" "}
                        <RadixLink href={`mailto:${contact.nbSuggestedCorrection}`} size="2">
                          {contact.nbSuggestedCorrection}
                        </RadixLink>
                      </Text>
                    )}
                  </Flex>
                </Box>
              )}

              <Separator size="4" />

              {/* Social links */}
              <Box>
                <Text size="2" color="gray" weight="medium">
                  Links
                </Text>
                <Flex gap="4" mt="2" wrap="wrap">
                  {contact.linkedinUrl && (
                    <Flex align="center" gap="1">
                      <LinkedInLogoIcon />
                      <RadixLink
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="2"
                      >
                        LinkedIn
                        <ExternalLinkIcon style={{ marginLeft: 4 }} />
                      </RadixLink>
                    </Flex>
                  )}
                  {contact.githubHandle && (
                    <Flex align="center" gap="1">
                      <GitHubLogoIcon />
                      <RadixLink
                        href={`https://github.com/${contact.githubHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="2"
                      >
                        {contact.githubHandle}
                      </RadixLink>
                    </Flex>
                  )}
                  {contact.telegramHandle && (
                    <Flex align="center" gap="1">
                      <RadixLink
                        href={`https://t.me/${contact.telegramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        size="2"
                      >
                        @{contact.telegramHandle}
                      </RadixLink>
                    </Flex>
                  )}
                  {!contact.linkedinUrl && !contact.githubHandle && !contact.telegramHandle && (
                    <Text size="2" color="gray">
                      No links
                    </Text>
                  )}
                </Flex>
              </Box>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <>
                  <Separator size="4" />
                  <Box>
                    <Text size="2" color="gray" weight="medium">
                      Tags
                    </Text>
                    <Flex gap="1" mt="2" wrap="wrap">
                      {contact.tags.map((tag) => (
                        <Badge key={tag} color="blue" variant="soft" size="1">
                          {tag}
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                </>
              )}

              {/* Notes (free-text / markdown). Used by the paper-author
                  import to store per-paper metadata — can be long. */}
              {contact.notes && contact.notes.trim().length > 0 && (
                <>
                  <Separator size="4" />
                  <Box>
                    <Flex align="center" justify="between">
                      <Text size="2" color="gray" weight="medium">
                        Notes
                      </Text>
                      <Text size="1" color="gray">
                        {contact.notes.length.toLocaleString()} chars
                      </Text>
                    </Flex>
                    <Box
                      mt="2"
                      p="3"
                      style={{
                        border: "1px solid var(--gray-a5)",
                        borderRadius: 6,
                        background: "var(--gray-a2)",
                        maxHeight: 560,
                        overflow: "auto",
                        fontSize: "var(--font-size-2)",
                        lineHeight: 1.55,
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {contact.notes}
                      </ReactMarkdown>
                    </Box>
                  </Box>
                </>
              )}

              <Separator size="4" />

              {/* Metadata */}
              <Flex gap="4" wrap="wrap">
                <Text size="1" color="gray">
                  Created: {new Date(contact.createdAt).toLocaleDateString()}
                </Text>
                <Text size="1" color="gray">
                  Updated: {new Date(contact.updatedAt).toLocaleDateString()}
                </Text>
              </Flex>
            </Flex>
          </Box>
        </Card>

        {/* AI Profile + Work Experience */}
        {contact.profile && (
          <Card>
            <Box p="4">
              <Flex direction="column" gap="4">
                {/* Profile header */}
                <Flex align="center" justify="between" wrap="wrap" gap="2">
                  <Flex align="center" gap="2">
                    <Heading size="4">Profile</Heading>
                    <Badge color="violet" variant="soft" size="1">
                      {contact.profile.experienceLevel}
                    </Badge>
                  </Flex>
                  {contact.profile.specialization && (
                    <Text size="2" color="gray">{contact.profile.specialization}</Text>
                  )}
                </Flex>

                {contact.profile.linkedinHeadline && (
                  <Text size="2" as="p" color="gray" style={{ fontStyle: "italic" }}>
                    {contact.profile.linkedinHeadline}
                  </Text>
                )}

                {/* Skills */}
                {contact.profile.skills.length > 0 && (
                  <Box>
                    <Text size="2" color="gray" weight="medium">Skills</Text>
                    <Flex gap="1" mt="2" wrap="wrap">
                      {contact.profile.skills.map((skill) => (
                        <Badge key={skill} color="blue" variant="soft" size="1">{skill}</Badge>
                      ))}
                    </Flex>
                  </Box>
                )}

                {/* Research areas */}
                {contact.profile.researchAreas.length > 0 && (
                  <Box>
                    <Text size="2" color="gray" weight="medium">Research areas</Text>
                    <Flex gap="1" mt="2" wrap="wrap">
                      {contact.profile.researchAreas.map((area) => (
                        <Badge key={area} color="purple" variant="soft" size="1">{area}</Badge>
                      ))}
                    </Flex>
                  </Box>
                )}

                {/* Confidence + enriched date */}
                <Flex gap="4" wrap="wrap">
                  <Text size="1" color="gray">
                    Confidence: {Math.round((contact.profile.synthesisConfidence ?? 0) * 100)}%
                  </Text>
                  <Text size="1" color="gray">
                    Enriched: {new Date(contact.profile.enrichedAt).toLocaleDateString()}
                  </Text>
                </Flex>

                {/* Work Experience */}
                {contact.profile.workExperience.length > 0 && (
                  <>
                    <Separator size="4" />
                    <Flex align="center" gap="2">
                      <Heading size="3">Experience</Heading>
                      <Badge color="gray" variant="soft" size="1">
                        {contact.profile.workExperience.length}
                      </Badge>
                    </Flex>

                    {contact.profile.workExperience.map((exp, i) => (
                      <Box key={i}>
                        {i > 0 && <Separator size="4" mb="3" />}
                        <Flex direction="column" gap="2">
                          <Flex justify="between" align="start" wrap="wrap" gap="2">
                            <Box>
                              <Text size="3" weight="medium">{exp.title}</Text>
                              <Text size="2" color="gray" as="p">
                                {exp.company}
                                {exp.employmentType && ` · ${exp.employmentType}`}
                              </Text>
                            </Box>
                            {exp.duration && (
                              <Badge color="gray" variant="soft" size="1">{exp.duration}</Badge>
                            )}
                          </Flex>
                          <Flex gap="3" wrap="wrap">
                            <Text size="1" color="gray">
                              {exp.startDate} — {exp.endDate ?? "Present"}
                            </Text>
                            {exp.location && (
                              <Text size="1" color="gray">{exp.location}</Text>
                            )}
                          </Flex>
                          {exp.description && (
                            <Text size="2" as="p" style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
                              {exp.description}
                            </Text>
                          )}
                          {exp.skills.length > 0 && (
                            <Flex gap="1" wrap="wrap">
                              {exp.skills.map((skill) => (
                                <Badge key={skill} color="blue" variant="soft" size="1">{skill}</Badge>
                              ))}
                            </Flex>
                          )}
                        </Flex>
                      </Box>
                    ))}
                  </>
                )}
              </Flex>
            </Box>
          </Card>
        )}

        {/* Paper-Author Enrichment — populated by contact_enrich_paper_author_graph
            for every paper-tagged contact. Renders openalex / orcid / scholar /
            github / homepage / email-candidate JSONB blobs. The card itself
            no-ops if nothing is set. */}
        <PaperAuthorEnrichmentCard
          openalexProfile={contact.openalexProfile}
          orcidProfile={contact.orcidProfile}
          scholarProfile={contact.scholarProfile}
          githubProfile={contact.githubProfile}
          homepageUrl={contact.homepageUrl ?? null}
          homepageExtract={contact.homepageExtract}
          emailCandidates={contact.emailCandidates}
          ghMatchStatus={contact.ghMatchStatus ?? null}
          ghMatchScore={contact.ghMatchScore ?? null}
          ghMatchArm={contact.ghMatchArm ?? null}
          ghMatchEvidenceRef={contact.ghMatchEvidenceRef}
        />

        {/* Bottom actions */}
        <Flex gap="2" wrap="wrap">
          {contact.email && (
            <ComposeEmailDialog contact={contact} onSent={() => refetchEmails()} onToast={setEmailToast} />
          )}
          {!contact.email && (
            <button className={button({ variant: "ghost", size: "md" })} onClick={handleFindEmail} disabled={finding}>
              {finding ? <Spinner size="1" /> : <MagnifyingGlassIcon />}
              Find email
            </button>
          )}
          <GenerateEmailDialog contact={contact} onSent={() => refetchEmails()} />
          <FollowUpEmailDialog
            contact={contact}
            opportunities={opportunitiesData?.contactOpportunities}
            onSent={() => refetchEmails()}
          />
        </Flex>

        {/* Related Opportunities */}
        <Box>
          <Flex align="center" justify="between" mb="3">
            <Heading size="4">Opportunities</Heading>
            {(opportunitiesData?.contactOpportunities?.length ?? 0) > 0 && (
              <Badge color="orange" variant="soft">
                {opportunitiesData!.contactOpportunities.length}
              </Badge>
            )}
          </Flex>

          {opportunitiesLoading ? (
            <Flex justify="center" py="4">
              <Spinner size="2" />
            </Flex>
          ) : !opportunitiesData?.contactOpportunities || opportunitiesData.contactOpportunities.length === 0 ? (
            <Text size="2" color="gray">No opportunities linked to this contact.</Text>
          ) : (
            <Flex direction="column" gap="2">
              {opportunitiesData.contactOpportunities.map((opp) => (
                <Card key={opp.id}>
                  <Box p="3">
                    <Flex justify="between" align="start" gap="2" wrap="wrap">
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Flex align="center" gap="2" mb="1">
                          <Link href={`/opportunities/${opp.id}`} style={{ textDecoration: "none" }}>
                            <Text size="2" weight="medium" color="blue">{opp.title}</Text>
                          </Link>
                          {opp.url && (
                            <a href={opp.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLinkIcon width={12} height={12} style={{ color: "var(--gray-9)" }} />
                            </a>
                          )}
                        </Flex>
                        <Flex align="center" gap="2" wrap="wrap">
                          <Badge
                            color={
                              opp.status === "offer" ? "green"
                                : opp.status === "interviewing" ? "yellow"
                                : opp.status === "applied" ? "orange"
                                : opp.status === "rejected" ? "red"
                                : opp.status === "closed" ? "gray"
                                : "blue"
                            }
                            variant="soft"
                            size="1"
                          >
                            {opp.status}
                          </Badge>
                          {opp.companyName && (
                            <Text size="1" color="gray">{opp.companyName}</Text>
                          )}
                          {opp.rewardText && (
                            <Text size="1" color="gray">{opp.rewardText}</Text>
                          )}
                          {opp.score != null && (
                            <Badge color={opp.score >= 70 ? "green" : opp.score >= 40 ? "yellow" : "gray"} variant="soft" size="1">
                              {opp.score}%
                            </Badge>
                          )}
                        </Flex>
                        {opp.tags.length > 0 && (
                          <Flex gap="1" mt="1" wrap="wrap">
                            {opp.tags.map((tag) => (
                              <Badge key={tag} color="gray" variant="soft" size="1">{tag}</Badge>
                            ))}
                          </Flex>
                        )}
                      </Box>
                      <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
                        {new Date(opp.createdAt).toLocaleDateString()}
                      </Text>
                    </Flex>
                    <Flex mt="2" pt="2" style={{ borderTop: "1px solid var(--gray-4)" }}>
                      <ShowInterestEmailDialog
                        contact={contact}
                        opportunity={opp}
                        onSent={() => refetchEmails()}
                      />
                    </Flex>
                  </Box>
                </Card>
              ))}
            </Flex>
          )}
        </Box>

        {/* Email History (outbound + inbound merged) */}
        <Box>
          <Flex align="center" justify="between" mb="3">
            <Heading size="4">Email history</Heading>
            {((emailsData?.contactEmails?.length ?? 0) + (emailsData?.contactReceivedEmails?.length ?? 0)) > 0 && (
              <Badge color="blue" variant="soft">
                {(emailsData?.contactEmails?.length ?? 0) + (emailsData?.contactReceivedEmails?.length ?? 0)}
              </Badge>
            )}
          </Flex>

          {emailsLoading ? (
            <Flex justify="center" py="4">
              <Spinner size="2" />
            </Flex>
          ) : !emailsData?.contactEmails || emailsData.contactEmails.length === 0 ? (
            emailsData?.contactReceivedEmails && emailsData.contactReceivedEmails.length > 0 ? (
              <Flex direction="column" gap="2">
                {emailsData.contactReceivedEmails.map((re) => (
                  <Card key={`re-${re.id}`} style={{ borderLeft: "3px solid var(--purple-9)" }}>
                    <Box p="3">
                      <Flex justify="between" align="start" gap="2" wrap="wrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Flex align="center" gap="2" mb="1">
                            <Badge color="purple" variant="soft" size="1">reply</Badge>
                            {re.classification && (
                              <Badge
                                color={re.classification === "interested" ? "green" : re.classification === "not_interested" ? "red" : "gray"}
                                variant="soft"
                                size="1"
                              >
                                {re.classification}
                              </Badge>
                            )}
                          </Flex>
                          <Text size="2" weight="medium" as="p" style={{ wordBreak: "break-word" }}>
                            {re.subject ?? "(no subject)"}
                          </Text>
                          <Text size="1" color="gray" as="p" mt="1">
                            From {re.fromEmail} · {new Date(re.receivedAt).toLocaleString()}
                          </Text>
                          {re.textContent && (
                            <Box mt="2" style={{ background: "var(--purple-2)", borderRadius: 4, padding: "var(--space-2)" }}>
                              <Text size="2" style={{ whiteSpace: "pre-wrap" }}>{stripQuotedReply(re.textContent)}</Text>
                            </Box>
                          )}
                          <ReplyEmailDialog
                            contact={contact}
                            receivedEmail={{ id: re.id, fromEmail: re.fromEmail ?? "", subject: re.subject ?? null, textContent: re.textContent ?? null }}
                            onSent={() => refetchEmails()}
                          />
                        </Box>
                      </Flex>
                    </Box>
                  </Card>
                ))}
              </Flex>
            ) : (
              <Text size="2" color="gray">No emails yet.</Text>
            )
          ) : (
            <Flex direction="column" gap="2">
              {/* Build a merged timeline: outbound emails + received replies, sorted by date */}
              {[
                ...emailsData.contactEmails.map((email) => ({
                  type: "sent" as const,
                  date: email.sentAt ?? email.createdAt,
                  email,
                })),
                ...(emailsData?.contactReceivedEmails ?? []).map((re) => ({
                  type: "received" as const,
                  date: re.receivedAt,
                  received: re,
                })),
              ]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((item) =>
                  item.type === "sent" ? (
                    <EmailCard key={`sent-${item.email.id}`} email={item.email} />
                  ) : (
                    <Card key={`re-${item.received.id}`} style={{ borderLeft: "3px solid var(--purple-9)" }}>
                      <Box p="3">
                        <Flex justify="between" align="start" gap="2" wrap="wrap">
                          <Box style={{ flex: 1, minWidth: 0 }}>
                            <Flex align="center" gap="2" mb="1">
                              <Badge color="purple" variant="soft" size="1">reply</Badge>
                              {item.received.classification && (
                                <Badge
                                  color={item.received.classification === "interested" ? "green" : item.received.classification === "not_interested" ? "red" : "gray"}
                                  variant="soft"
                                  size="1"
                                >
                                  {item.received.classification}
                                </Badge>
                              )}
                            </Flex>
                            <Text size="2" weight="medium" as="p" style={{ wordBreak: "break-word" }}>
                              {item.received.subject ?? "(no subject)"}
                            </Text>
                            <Text size="1" color="gray" as="p" mt="1">
                              From {item.received.fromEmail} · {new Date(item.received.receivedAt).toLocaleString()}
                            </Text>
                            {item.received.textContent && (
                              <Box mt="2" style={{ background: "var(--purple-2)", borderRadius: 4, padding: "var(--space-2)" }}>
                                <Text size="2" style={{ whiteSpace: "pre-wrap" }}>{stripQuotedReply(item.received.textContent)}</Text>
                              </Box>
                            )}
                            <ReplyEmailDialog
                              contact={contact}
                              receivedEmail={{ id: item.received.id, fromEmail: item.received.fromEmail ?? "", subject: item.received.subject ?? null, textContent: item.received.textContent ?? null }}
                              onSent={() => refetchEmails()}
                            />
                          </Box>
                        </Flex>
                      </Box>
                    </Card>
                  ),
                )}
            </Flex>
          )}
        </Box>

      </Flex>

      {/* Email sent toast */}
      {emailToast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            padding: "12px 20px",
            backgroundColor: "#30A46C",
            color: "white",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}
        >
          <Flex align="center" gap="2">
            <CheckCircledIcon />
            <Text size="2" weight="medium">{emailToast}</Text>
          </Flex>
        </div>
      )}
    </Container>
  );
}
