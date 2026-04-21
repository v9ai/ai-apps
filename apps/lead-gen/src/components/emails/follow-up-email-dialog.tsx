"use client";

import { useState } from "react";
import {
  Box,
  Callout,
  Dialog,
  Flex,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  PaperPlaneIcon,
  CopyIcon,
  ClockIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { button } from "@/recipes/button";

export const SCHEDULE_DELAYS = [
  { label: "5 min", ms: 5 * 60 * 1000 },
  { label: "15 min", ms: 15 * 60 * 1000 },
  { label: "30 min", ms: 30 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
] as const;

export function FollowUpEmailDialog({
  contact,
  opportunities,
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
  opportunities?: Array<{
    id: string;
    title: string;
    status: string;
    appliedAt?: string | null;
    applicationStatus?: string | null;
    companyName?: string | null;
    tags?: string[] | null;
  }>;
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
  const firstName = contact.firstName;
  const hasEmail = !!editTo.trim();

  // Pick the most relevant opportunity (applied ones first)
  const appliedOpp = opportunities?.find((o) => o.status === "applied") ?? opportunities?.[0];

  const buildFollowUp = () => {
    const role = appliedOpp?.title ?? "the role";

    const subject = `Following up — ${role}`;
    const body = `Hi ${firstName},

I recently applied for the ${role} position and wanted to follow up directly.

My background aligns closely with what you're looking for — I've been building agentic AI systems, RAG pipelines, and multi-agent orchestration frameworks using Python and TypeScript. I've also shipped eval frameworks and production ML pipelines end-to-end.

Happy to share more specifics or jump on a quick call at your convenience.

Best,
Vadim`;

    return { subject, body };
  };

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (val) {
      const { subject, body } = buildFollowUp();
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
        <button className={button({ variant: "ghost", size: "md" })}>
          <PaperPlaneIcon />
          Follow up
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="540px">
        <Dialog.Title>Follow-up email — {recipientName}</Dialog.Title>
        {appliedOpp && (
          <Dialog.Description size="2" color="gray" mb="4">
            {appliedOpp.title}
            {appliedOpp.companyName ? ` · ${appliedOpp.companyName}` : ""}
            {appliedOpp.appliedAt ? ` · applied ${new Date(appliedOpp.appliedAt).toLocaleDateString()}` : ""}
          </Dialog.Description>
        )}

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
              id="includeResumeFollowup"
              checked={includeResume}
              onChange={(e) => setIncludeResume(e.target.checked)}
            />
            <Text size="2" as="label" htmlFor="includeResumeFollowup">
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
