"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Callout,
  Checkbox,
  Code,
  Flex,
  Separator,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
import {
  CheckIcon,
  CopyIcon,
  ExclamationTriangleIcon,
  LinkedInLogoIcon,
  MagicWandIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";

type Step = "input" | "extracted" | "edit" | "sent";

interface ExtractionResult {
  authorName: string | null;
  authorHeadline: string | null;
  postText: string | null;
  postUrl: string;
  profileUrl?: string | null;
  emails: string[];
  imageUrl: string | null;
  companyName?: string | null;
  extractionQuality: "partial" | "failed";
  reason?: string;
}

export function ComposeFromLinkedIn({
  defaultCompanyName,
}: {
  defaultCompanyName?: string;
} = {}) {
  const [step, setStep] = useState<Step>("input");

  // Input step
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Extracted step
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [postContent, setPostContent] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [companyName, setCompanyName] = useState(defaultCompanyName ?? "");
  const [instructions, setInstructions] = useState("");

  // Edit step
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [copied, setCopied] = useState(false);

  // Send step
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    content,
    partialContent,
    isStreaming,
    error: streamError,
    generate,
    stop,
    reset: resetStream,
  } = useStreamingEmail();

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleExtract = async () => {
    setExtracting(true);
    setExtractError(null);
    try {
      const res = await fetch("/api/linkedin/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkedinUrl.trim() }),
      });
      const data: ExtractionResult = await res.json();

      if (!res.ok) {
        setExtractError((data as { error?: string }).error ?? "Extraction failed");
        return;
      }

      setExtraction(data);
      setPostContent(data.postText ?? "");
      setRecipientName(data.authorName ?? "");
      setRecipientEmail(data.emails[0] ?? "");
      if (data.companyName && !companyName) {
        setCompanyName(data.companyName);
      }
      setStep("extracted");
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const handleSkipExtraction = () => {
    setExtraction(null);
    setStep("extracted");
  };

  const handleGenerate = async () => {
    await generate({
      recipientName: recipientName || "there",
      companyName: companyName || undefined,
      instructions: instructions || undefined,
      linkedinPostContent: postContent || undefined,
    });
  };

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

  const handleSend = async () => {
    if (!recipientEmail) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: 0,
          to: recipientEmail,
          name: recipientName,
          subject: editSubject,
          body: editBody,
          includeResume,
        }),
      });
      const json = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (json.success) {
        setSendResult({
          type: "success",
          message: `Sent to ${recipientEmail}`,
        });
        setStep("sent");
      } else {
        setSendResult({
          type: "error",
          message: json.error ?? "Send failed",
        });
      }
    } catch (err) {
      setSendResult({
        type: "error",
        message: err instanceof Error ? err.message : "Send failed",
      });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setLinkedinUrl("");
    setExtractError(null);
    setExtraction(null);
    setPostContent("");
    setRecipientName("");
    setRecipientEmail("");
    setCompanyName("");
    setInstructions("");
    setEditSubject("");
    setEditBody("");
    setIncludeResume(false);
    setSendResult(null);
    setCopied(false);
    resetStream();
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Flex direction="column" gap="4" style={{ maxWidth: 640 }}>
      {/* ── INPUT step ── */}
      {step === "input" && (
        <>
          <Text size="2" color="gray">
            Paste a LinkedIn post URL to extract content and compose an outreach
            email.
          </Text>

          <Flex gap="2" align="end">
            <Box style={{ flex: 1 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">
                LinkedIn Post URL
              </Text>
              <TextField.Root
                placeholder="https://linkedin.com/posts/..."
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
              >
                <TextField.Slot>
                  <LinkedInLogoIcon />
                </TextField.Slot>
              </TextField.Root>
            </Box>
            <Button
              onClick={handleExtract}
              disabled={!linkedinUrl.trim() || extracting}
              loading={extracting}
            >
              Extract
            </Button>
          </Flex>

          {extractError && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{extractError}</Callout.Text>
            </Callout.Root>
          )}

          <Separator size="4" />

          <Button
            variant="soft"
            color="gray"
            size="1"
            onClick={handleSkipExtraction}
          >
            Skip extraction — paste content manually
          </Button>
        </>
      )}

      {/* ── EXTRACTED step ── */}
      {step === "extracted" && (
        <>
          {extraction && extraction.extractionQuality === "failed" && (
            <Callout.Root color="orange" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>
                {extraction.reason ??
                  "Could not extract content. Paste it manually below."}
              </Callout.Text>
            </Callout.Root>
          )}

          {extraction && extraction.extractionQuality === "partial" && (
            <Callout.Root color="blue" size="1">
              <Callout.Icon>
                <LinkedInLogoIcon />
              </Callout.Icon>
              <Callout.Text>
                Extracted partial content from OG tags. Review and edit below.
              </Callout.Text>
            </Callout.Root>
          )}

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Post Content
            </Text>
            <TextArea
              placeholder="Paste or edit the LinkedIn post content..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={5}
              disabled={isStreaming}
            />
          </Box>

          <Flex gap="3">
            <Box style={{ flex: 1 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">
                Recipient Name
              </Text>
              <TextField.Root
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={isStreaming}
              />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text size="1" color="gray" weight="medium" mb="1" as="p">
                Recipient Email
              </Text>
              <TextField.Root
                placeholder="john@company.com"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={isStreaming}
              />
            </Box>
          </Flex>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Company (optional)
            </Text>
            <TextField.Root
              placeholder="Acme Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isStreaming}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Instructions (optional)
            </Text>
            <TextArea
              placeholder="E.g. mention their work on open-source, ask about remote roles..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              disabled={isStreaming}
            />
          </Box>

          <Flex gap="2">
            <Button
              onClick={handleGenerate}
              loading={isStreaming}
              disabled={isStreaming}
            >
              <MagicWandIcon />
              {isStreaming ? "Generating..." : "Generate Email"}
            </Button>
            {isStreaming && (
              <Button variant="soft" color="red" onClick={stop}>
                Stop
              </Button>
            )}
            {content && !isStreaming && (
              <Button
                variant="soft"
                color="gray"
                onClick={() => resetStream()}
              >
                Regenerate
              </Button>
            )}
            <Box style={{ flex: 1 }} />
            <Button
              variant="ghost"
              color="gray"
              size="2"
              onClick={handleReset}
            >
              Start over
            </Button>
          </Flex>

          {streamError && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{streamError}</Callout.Text>
            </Callout.Root>
          )}

          {isStreaming && partialContent && (
            <Box>
              <Text size="1" color="gray" mb="1" as="p">
                Streaming...
              </Text>
              <Code
                size="1"
                style={{
                  display: "block",
                  whiteSpace: "pre-wrap",
                  maxHeight: 200,
                  overflow: "auto",
                }}
              >
                {partialContent}
              </Code>
            </Box>
          )}

          {content && !isStreaming && (
            <>
              <Box
                style={{
                  background: "var(--green-a2)",
                  border: "1px solid var(--green-a5)",
                  borderRadius: "var(--radius-3)",
                  padding: "var(--space-3)",
                }}
              >
                <Flex justify="between" align="center" mb="2">
                  <Badge color="green" size="1">
                    <CheckIcon /> Generated
                  </Badge>
                </Flex>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">
                  SUBJECT
                </Text>
                <Text size="2" weight="medium" as="p" mb="3">
                  {content.subject}
                </Text>
                <Text size="1" color="gray" weight="bold" as="p" mb="1">
                  BODY
                </Text>
                <Text
                  size="2"
                  as="p"
                  style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}
                >
                  {content.body}
                </Text>
              </Box>

              <Flex asChild gap="2" align="center">
                <label>
                  <Checkbox
                    checked={includeResume}
                    onCheckedChange={(checked) =>
                      setIncludeResume(checked === true)
                    }
                  />
                  <Text size="2">Attach resume</Text>
                </label>
              </Flex>

              <Flex justify="end">
                <Button onClick={handleProceedToEdit}>Edit & Send</Button>
              </Flex>
            </>
          )}
        </>
      )}

      {/* ── EDIT step ── */}
      {step === "edit" && (
        <>
          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              To
            </Text>
            <TextField.Root
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Subject
            </Text>
            <TextField.Root
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
            />
          </Box>

          <Box>
            <Text size="1" color="gray" weight="medium" mb="1" as="p">
              Body
            </Text>
            <TextArea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={12}
              style={{ fontFamily: "var(--default-font-family)" }}
            />
          </Box>

          <Flex asChild gap="2" align="center">
            <label>
              <Checkbox
                checked={includeResume}
                onCheckedChange={(checked) =>
                  setIncludeResume(checked === true)
                }
              />
              <Text size="2">Attach resume</Text>
            </label>
          </Flex>

          {sendResult && (
            <Callout.Root
              color={sendResult.type === "success" ? "green" : "red"}
              size="1"
            >
              <Callout.Icon>
                {sendResult.type === "success" ? (
                  <CheckIcon />
                ) : (
                  <ExclamationTriangleIcon />
                )}
              </Callout.Icon>
              <Callout.Text>{sendResult.message}</Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="2" justify="between">
            <Button
              variant="soft"
              color="gray"
              onClick={() => setStep("extracted")}
            >
              Back
            </Button>
            <Flex gap="2">
              <Button variant="soft" onClick={handleCopy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button
                onClick={handleSend}
                loading={sending}
                disabled={sending || !recipientEmail || !editSubject || !editBody}
              >
                <PaperPlaneIcon />
                Send
              </Button>
            </Flex>
          </Flex>
        </>
      )}

      {/* ── SENT step ── */}
      {step === "sent" && (
        <>
          <Callout.Root
            color={sendResult?.type === "success" ? "green" : "red"}
            size="2"
          >
            <Callout.Icon>
              {sendResult?.type === "success" ? (
                <CheckIcon />
              ) : (
                <ExclamationTriangleIcon />
              )}
            </Callout.Icon>
            <Callout.Text>
              {sendResult?.message ?? "Email sent successfully."}
            </Callout.Text>
          </Callout.Root>

          <Button variant="soft" onClick={handleReset}>
            Compose Another
          </Button>
        </>
      )}
    </Flex>
  );
}
