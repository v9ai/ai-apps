"use client";

import { useState, useEffect, useId } from "react";
import {
  Badge,
  Box,
  Callout,
  Checkbox,
  Dialog,
  Flex,
  Heading,
  Separator,
  Spinner,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import { button } from "@/recipes/button";
import {
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  MagicWandIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: number;
  to?: string;
  name?: string;
  companyName?: string;
  subject?: string;
  /** Pre-filled body text — sets the body when the dialog opens */
  initialBody?: string;
  /** Original email text for reply context — passed to AI generation */
  replyContext?: string;
  /** ID of the received email being replied to — links the outbound reply in DB */
  receivedEmailId?: number;
  onSuccess?: (toEmail: string) => void;
}

interface SendResponse {
  success: boolean;
  id?: string;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailComposer({
  open,
  onOpenChange,
  contactId,
  to: toProp = "",
  name: nameProp = "",
  companyName = "",
  subject: subjectProp = "",
  initialBody: initialBodyProp = "",
  replyContext,
  receivedEmailId,
  onSuccess,
}: EmailComposerProps) {
  // Form fields
  const [to, setTo] = useState(toProp);
  const [name, setName] = useState(nameProp);
  const [subject, setSubject] = useState(subjectProp);
  const [body, setBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [includeCalendly, setIncludeCalendly] = useState(false);

  // Send state
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Stable IDs for checkbox labels
  const resumeCheckId = useId();
  const calendlyCheckId = useId();

  const {
    content,
    partialContent,
    isStreaming,
    error: streamError,
    generate,
    stop,
    reset: resetStream,
  } = useStreamingEmail();

  // Sync prop changes into state when the dialog reopens
  useEffect(() => {
    if (open) {
      setTo(toProp);
      setName(nameProp);
      setSubject(subjectProp);
      setBody(initialBodyProp);
    }
  }, [open, toProp, nameProp, subjectProp, initialBodyProp]);

  // Apply generated content to editable fields when streaming completes
  useEffect(() => {
    if (content) {
      setSubject(content.subject);
      setBody(content.body);
    }
  }, [content]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function resetForm() {
    setTo(toProp);
    setName(nameProp);
    setSubject(subjectProp);
    setBody("");
    setIncludeResume(false);
    setIncludeCalendly(false);
    setSendResult(null);
    setSending(false);
    resetStream();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleGenerate() {
    await generate({
      recipientName: name.trim() || "there",
      companyName: companyName.trim() || undefined,
      recipientContext: replyContext || undefined,
    });
  }

  async function handleSend() {
    if (!to.trim() || !subject.trim() || !body.trim()) return;

    setSending(true);
    setSendResult(null);

    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contactId ?? 0,
          to: to.trim(),
          name: name.trim(),
          subject: subject.trim(),
          body: body.trim(),
          includeResume,
          ...(receivedEmailId ? { receivedEmailId } : {}),
        }),
      });

      const json = (await res.json()) as SendResponse;

      if (json.success) {
        const recipient = to.trim();
        onSuccess?.(recipient);
        handleOpenChange(false);
      } else {
        setSendResult({
          type: "error",
          message: json.error ?? "Send failed. Please try again.",
        });
        setSending(false);
      }
    } catch (err) {
      setSendResult({
        type: "error",
        message: err instanceof Error ? err.message : "Unexpected error.",
      });
      setSending(false);
    }
  }

  // ─── Derived state ───────────────────────────────────────────────────────────

  const canSend =
    !sending &&
    !isStreaming &&
    to.trim().length > 0 &&
    subject.trim().length > 0 &&
    body.trim().length > 0;

  const hasError = sendResult?.type === "error";

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="620px" style={{ maxHeight: "90vh", overflowY: "auto" }}>

        {/* Header */}
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>
            <Heading size="4">Compose Email</Heading>
          </Dialog.Title>
          <Dialog.Close>
            <button className={button({ variant: "ghost", size: "sm" })} aria-label="Close dialog">
              <Cross2Icon />
            </button>
          </Dialog.Close>
        </Flex>

        <Flex direction="column" gap="4">

          {/* To + Name row */}
          <Flex gap="3">
            <Box style={{ flex: "1 1 55%" }}>
              <Text as="label" size="1" color="gray" weight="medium" mb="1" style={{ display: "block" }}>
                To (email)
              </Text>
              <TextField.Root
                type="email"
                placeholder="jane@company.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={sending}
              />
            </Box>
            <Box style={{ flex: "1 1 45%" }}>
              <Text as="label" size="1" color="gray" weight="medium" mb="1" style={{ display: "block" }}>
                Name
              </Text>
              <TextField.Root
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={sending}
              />
            </Box>
          </Flex>

          {/* Subject */}
          <Box>
            <Text as="label" size="1" color="gray" weight="medium" mb="1" style={{ display: "block" }}>
              Subject
            </Text>
            <TextField.Root
              placeholder="Re: open roles at Acme"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
            />
          </Box>

          {/* AI Generate row */}
          <Flex gap="2" align="center">
            <button
              className={button({ variant: "ghost" })}
              onClick={() => void handleGenerate()}
              disabled={isStreaming || sending}
            >
              <MagicWandIcon />
              {isStreaming ? "Generating…" : "AI Generate"}
            </button>

            {isStreaming && (
              <button className={button({ variant: "ghost", size: "md" })} onClick={stop}>
                Stop
              </button>
            )}

            {content && !isStreaming && (
              <Badge color="green" size="1" variant="soft">
                <CheckCircledIcon />
                Generated
              </Badge>
            )}

            {content && !isStreaming && !sending && (
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => {
                  resetStream();
                  setBody("");
                  setSubject(subjectProp);
                }}
              >
                Regenerate
              </button>
            )}
          </Flex>

          {/* Streaming preview — shown while generating */}
          {isStreaming && partialContent && (
            <Box
              style={{
                background: "var(--violet-a2)",
                borderRadius: 6,
                padding: "var(--space-3)",
                maxHeight: 180,
                overflow: "auto",
              }}
            >
              <Text size="1" color="gray" mb="1" style={{ display: "block" }}>
                Streaming…
              </Text>
              <Text
                size="1"
                style={{
                  fontFamily: "var(--default-font-family)",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.5",
                }}
              >
                {partialContent}
              </Text>
            </Box>
          )}

          {/* Stream error */}
          {streamError && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{streamError}</Callout.Text>
            </Callout.Root>
          )}

          <Separator size="4" />

          {/* Body */}
          <Box>
            <Text as="label" size="1" color="gray" weight="medium" mb="1" style={{ display: "block" }}>
              Body
            </Text>
            <TextArea
              placeholder={"Hey Jane,\n\nI came across your profile…\n\nThanks,\nVadim"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              style={{ fontFamily: "var(--default-font-family)" }}
              disabled={sending}
            />
          </Box>

          {/* Checkboxes */}
          <Flex direction="column" gap="2">
            <Flex asChild gap="2" align="center">
              <label htmlFor={resumeCheckId}>
                <Checkbox
                  id={resumeCheckId}
                  checked={includeResume}
                  onCheckedChange={(checked) => setIncludeResume(checked === true)}
                  disabled={sending}
                />
                <Text size="2">Include resume (PDF attachment)</Text>
              </label>
            </Flex>
            <Flex asChild gap="2" align="center">
              <label htmlFor={calendlyCheckId}>
                <Checkbox
                  id={calendlyCheckId}
                  checked={includeCalendly}
                  onCheckedChange={(checked) => setIncludeCalendly(checked === true)}
                  disabled={sending}
                />
                <Text size="2">Include Calendly link in body</Text>
              </label>
            </Flex>
          </Flex>

          {/* Send error feedback */}
          {hasError && sendResult && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{sendResult.message}</Callout.Text>
            </Callout.Root>
          )}

          {/* Footer actions */}
          <Flex justify="between" align="center" gap="3" mt="1">
            <Dialog.Close>
              <button className={button({ variant: "ghost" })}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className={button({ variant: "solid" })}
              disabled={!canSend}
              onClick={() => void handleSend()}
            >
              {sending ? (
                <>
                  <Spinner size="1" />
                  Sending…
                </>
              ) : (
                <>
                  <PaperPlaneIcon />
                  Send
                </>
              )}
            </button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
