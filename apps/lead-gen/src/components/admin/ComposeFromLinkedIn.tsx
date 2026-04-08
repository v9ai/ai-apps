"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  CheckIcon,
  CopyIcon,
  ExclamationTriangleIcon,
  LinkedInLogoIcon,
  MagicWandIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";

// ── Reusable form styles ─────────────────────────────────────────────────────

const inputStyles = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  color: "ui.body",
  p: "6px 10px",
  fontSize: "base",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  borderRadius: "0",
  _focus: { borderColor: "accent.primary" },
  _placeholder: { color: "ui.tertiary" },
});

const textareaStyles = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  color: "ui.body",
  p: "2",
  fontSize: "base",
  width: "100%",
  outline: "none",
  fontFamily: "inherit",
  borderRadius: "0",
  resize: "vertical",
  minHeight: "80px",
  _focus: { borderColor: "accent.primary" },
  _placeholder: { color: "ui.tertiary" },
});

// ── Types ────────────────────────────────────────────────────────────────────

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
    <div className={css({ display: "flex", flexDirection: "column", gap: "4", maxWidth: "640px" })}>
      {/* ── INPUT step ── */}
      {step === "input" && (
        <>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
            Paste a LinkedIn post URL to extract content and compose an outreach
            email.
          </span>

          <div className={css({ display: "flex", gap: "2", alignItems: "flex-end" })}>
            <div className={css({ flex: 1 })}>
              <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
                LinkedIn Post URL
              </p>
              <div className={css({ position: "relative" })}>
                <span className={css({ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "ui.tertiary" })}>
                  <LinkedInLogoIcon />
                </span>
                <input
                  className={css({
                    bg: "ui.surface",
                    border: "1px solid",
                    borderColor: "ui.border",
                    color: "ui.body",
                    p: "6px 10px",
                    pl: "32px",
                    fontSize: "base",
                    width: "100%",
                    outline: "none",
                    fontFamily: "inherit",
                    borderRadius: "0",
                    _focus: { borderColor: "accent.primary" },
                    _placeholder: { color: "ui.tertiary" },
                  })}
                  placeholder="https://linkedin.com/posts/..."
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                />
              </div>
            </div>
            <button
              className={button({ variant: "ghost" })}
              onClick={handleExtract}
              disabled={!linkedinUrl.trim() || extracting}
            >
              {extracting ? "Extracting..." : "Extract"}
            </button>
          </div>

          {extractError && (
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
              <ExclamationTriangleIcon />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>{extractError}</span>
            </div>
          )}

          <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleSkipExtraction}
          >
            Skip extraction — paste content manually
          </button>
        </>
      )}

      {/* ── EXTRACTED step ── */}
      {step === "extracted" && (
        <>
          {extraction && extraction.extractionQuality === "failed" && (
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "orange.500/30", bg: "orange.500/10" })}>
              <ExclamationTriangleIcon />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>
                {extraction.reason ??
                  "Could not extract content. Paste it manually below."}
              </span>
            </div>
          )}

          {extraction && extraction.extractionQuality === "partial" && (
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "accent.border", bg: "accent.subtle" })}>
              <LinkedInLogoIcon />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>
                Extracted partial content from OG tags. Review and edit below.
              </span>
            </div>
          )}

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Post Content
            </p>
            <textarea
              className={textareaStyles}
              placeholder="Paste or edit the LinkedIn post content..."
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              rows={5}
              disabled={isStreaming}
            />
          </div>

          <div className={css({ display: "flex", gap: "3" })}>
            <div className={css({ flex: 1 })}>
              <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
                Recipient Name
              </p>
              <input
                className={inputStyles}
                placeholder="John Doe"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                disabled={isStreaming}
              />
            </div>
            <div className={css({ flex: 1 })}>
              <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
                Recipient Email
              </p>
              <input
                className={inputStyles}
                placeholder="john@company.com"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={isStreaming}
              />
            </div>
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Company (optional)
            </p>
            <input
              className={inputStyles}
              placeholder="Acme Inc."
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isStreaming}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Instructions (optional)
            </p>
            <textarea
              className={textareaStyles}
              placeholder="E.g. mention their work on open-source, ask about remote roles..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={3}
              disabled={isStreaming}
            />
          </div>

          <div className={css({ display: "flex", gap: "2" })}>
            <button
              className={button({ variant: "ghost" })}
              onClick={handleGenerate}
              disabled={isStreaming}
            >
              <MagicWandIcon />
              {isStreaming ? "Generating..." : "Generate Email"}
            </button>
            {isStreaming && (
              <button
                className={button({ variant: "ghost" })}
                onClick={stop}
              >
                Stop
              </button>
            )}
            {content && !isStreaming && (
              <button
                className={button({ variant: "ghost" })}
                onClick={() => resetStream()}
              >
                Regenerate
              </button>
            )}
            <div className={css({ flex: 1 })} />
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleReset}
            >
              Start over
            </button>
          </div>

          {streamError && (
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
              <ExclamationTriangleIcon />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>{streamError}</span>
            </div>
          )}

          {isStreaming && partialContent && (
            <div>
              <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
                Streaming...
              </p>
              <code
                className={css({
                  display: "block",
                  whiteSpace: "pre-wrap",
                  maxHeight: "200px",
                  overflow: "auto",
                  fontSize: "xs",
                  color: "ui.body",
                  bg: "ui.surfaceRaised",
                  p: "2",
                  fontFamily: "monospace",
                })}
              >
                {partialContent}
              </code>
            </div>
          )}

          {content && !isStreaming && (
            <>
              <div
                className={css({
                  bg: "green.500/10",
                  border: "1px solid",
                  borderColor: "green.500/30",
                  p: "3",
                })}
              >
                <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", mb: "2" })}>
                  <span className={css({ fontSize: "xs", px: "2", py: "1", bg: "green.500/10", color: "status.positive", border: "1px solid", borderColor: "green.500/30", display: "inline-flex", alignItems: "center", gap: "1" })}>
                    <CheckIcon /> Generated
                  </span>
                </div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold", mb: "1" })}>
                  SUBJECT
                </p>
                <p className={css({ fontSize: "sm", fontWeight: "medium", color: "ui.body", mb: "3" })}>
                  {content.subject}
                </p>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold", mb: "1" })}>
                  BODY
                </p>
                <p className={css({ fontSize: "sm", color: "ui.body", whiteSpace: "pre-wrap", lineHeight: "1.6" })}>
                  {content.body}
                </p>
              </div>

              <label className={css({ display: "flex", gap: "2", alignItems: "center", cursor: "pointer" })}>
                <input
                  type="checkbox"
                  checked={includeResume}
                  onChange={(e) => setIncludeResume(e.target.checked)}
                  className={css({ accentColor: "accent.primary" })}
                />
                <span className={css({ fontSize: "sm", color: "ui.body" })}>Attach resume</span>
              </label>

              <div className={css({ display: "flex", justifyContent: "flex-end" })}>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={handleProceedToEdit}
                >
                  Edit & Send
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── EDIT step ── */}
      {step === "edit" && (
        <>
          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              To
            </p>
            <input
              className={inputStyles}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Subject
            </p>
            <input
              className={inputStyles}
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Body
            </p>
            <textarea
              className={textareaStyles}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={12}
            />
          </div>

          <label className={css({ display: "flex", gap: "2", alignItems: "center", cursor: "pointer" })}>
            <input
              type="checkbox"
              checked={includeResume}
              onChange={(e) => setIncludeResume(e.target.checked)}
              className={css({ accentColor: "accent.primary" })}
            />
            <span className={css({ fontSize: "sm", color: "ui.body" })}>Attach resume</span>
          </label>

          {sendResult && (
            <div
              className={css({
                display: "flex",
                gap: "3",
                p: "3",
                border: "1px solid",
                borderColor: sendResult.type === "success" ? "green.500/30" : "red.500/30",
                bg: sendResult.type === "success" ? "green.500/10" : "red.500/10",
              })}
            >
              {sendResult.type === "success" ? (
                <CheckIcon />
              ) : (
                <ExclamationTriangleIcon />
              )}
              <span className={css({ fontSize: "sm", color: "ui.body" })}>{sendResult.message}</span>
            </div>
          )}

          <div className={css({ display: "flex", gap: "2", justifyContent: "space-between" })}>
            <button
              className={button({ variant: "ghost" })}
              onClick={() => setStep("extracted")}
            >
              Back
            </button>
            <div className={css({ display: "flex", gap: "2" })}>
              <button
                className={button({ variant: "ghost" })}
                onClick={handleCopy}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                className={button({ variant: "ghost" })}
                onClick={handleSend}
                disabled={sending || !recipientEmail || !editSubject || !editBody}
              >
                <PaperPlaneIcon />
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── SENT step ── */}
      {step === "sent" && (
        <>
          <div
            className={css({
              display: "flex",
              gap: "3",
              p: "3",
              border: "1px solid",
              borderColor: sendResult?.type === "success" ? "green.500/30" : "red.500/30",
              bg: sendResult?.type === "success" ? "green.500/10" : "red.500/10",
            })}
          >
            {sendResult?.type === "success" ? (
              <CheckIcon />
            ) : (
              <ExclamationTriangleIcon />
            )}
            <span className={css({ fontSize: "sm", color: "ui.body" })}>
              {sendResult?.message ?? "Email sent successfully."}
            </span>
          </div>

          <button
            className={button({ variant: "ghost" })}
            onClick={handleReset}
          >
            Compose Another
          </button>
        </>
      )}
    </div>
  );
}
