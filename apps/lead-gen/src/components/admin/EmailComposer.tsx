"use client";

import { useState, useEffect, useId } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
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
  minHeight: "120px",
  _focus: { borderColor: "accent.primary" },
  _placeholder: { color: "ui.tertiary" },
});

const labelStyles = css({
  fontSize: "xs",
  fontWeight: "medium",
  color: "ui.tertiary",
  mb: "1",
  display: "block",
});

const spinnerStyles = css({
  display: "inline-block",
  width: "16px",
  height: "16px",
  border: "2px solid",
  borderColor: "ui.border",
  borderTopColor: "accent.primary",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: number;
  to?: string;
  name?: string;
  companyName?: string;
  subject?: string;
  onSuccess?: () => void;
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
    }
  }, [open, toProp, nameProp, subjectProp]);

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
        }),
      });

      const json = (await res.json()) as SendResponse;

      if (json.success) {
        setSendResult({
          type: "success",
          message: `Email sent to ${to.trim()}.`,
        });
        onSuccess?.();
      } else {
        setSendResult({
          type: "error",
          message: json.error ?? "Send failed. Please try again.",
        });
      }
    } catch (err) {
      setSendResult({
        type: "error",
        message: err instanceof Error ? err.message : "Unexpected error.",
      });
    } finally {
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

  const hasSentSuccessfully = sendResult?.type === "success";

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className={css({
          position: "fixed",
          inset: 0,
          zIndex: 50,
          bg: "rgba(10, 10, 15, 0.85)",
          backdropFilter: "blur(12px)",
        })}
        onClick={() => handleOpenChange(false)}
      />
      {/* Panel */}
      <div
        className={css({
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 51,
          bg: "ui.surface",
          border: "1px solid",
          borderColor: "ui.border",
          width: "100%",
          maxWidth: "620px",
          maxHeight: "90vh",
          overflowY: "auto",
          p: "6",
        })}
      >
        {/* Header */}
        <div
          className={css({
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pb: "4",
            mb: "4",
            borderBottom: "1px solid",
            borderBottomColor: "ui.border",
          })}
        >
          <h2 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading" })}>
            Compose Email
          </h2>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            aria-label="Close dialog"
            onClick={() => handleOpenChange(false)}
          >
            <Cross2Icon />
          </button>
        </div>

        <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>

          {/* To + Name row */}
          <div className={css({ display: "flex", gap: "3" })}>
            <div style={{ flex: "1 1 55%" }}>
              <label className={labelStyles}>To (email)</label>
              <input
                className={inputStyles}
                type="email"
                placeholder="jane@company.com"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={hasSentSuccessfully}
              />
            </div>
            <div style={{ flex: "1 1 45%" }}>
              <label className={labelStyles}>Name</label>
              <input
                className={inputStyles}
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={hasSentSuccessfully}
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className={labelStyles}>Subject</label>
            <input
              className={inputStyles}
              placeholder="Re: open roles at Acme"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={hasSentSuccessfully}
            />
          </div>

          {/* AI Generate row */}
          <div className={css({ display: "flex", gap: "2", alignItems: "center" })}>
            <button
              className={button({ variant: "ghost" })}
              onClick={() => void handleGenerate()}
              disabled={isStreaming || hasSentSuccessfully}
            >
              <MagicWandIcon />
              {isStreaming ? "Generating..." : "AI Generate"}
            </button>

            {isStreaming && (
              <button className={button({ variant: "ghost", size: "md" })} onClick={stop}>
                Stop
              </button>
            )}

            {content && !isStreaming && (
              <span
                className={css({
                  fontSize: "xs",
                  px: "2",
                  py: "1",
                  border: "1px solid",
                  borderColor: "green.500/30",
                  bg: "green.500/10",
                  color: "ui.secondary",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "1",
                })}
              >
                <CheckCircledIcon />
                Generated
              </span>
            )}

            {content && !isStreaming && !hasSentSuccessfully && (
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
          </div>

          {/* Streaming preview -- shown while generating */}
          {isStreaming && partialContent && (
            <div
              className={css({
                bg: "accent.subtle",
                p: "3",
                maxHeight: "180px",
                overflow: "auto",
              })}
            >
              <span className={css({ fontSize: "xs", color: "ui.tertiary", display: "block", mb: "1" })}>
                Streaming...
              </span>
              <span
                className={css({
                  fontSize: "xs",
                  fontFamily: "inherit",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.5",
                  color: "ui.body",
                })}
              >
                {partialContent}
              </span>
            </div>
          )}

          {/* Stream error */}
          {streamError && (
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
              <ExclamationTriangleIcon />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>{streamError}</span>
            </div>
          )}

          <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

          {/* Body */}
          <div>
            <label className={labelStyles}>Body</label>
            <textarea
              className={textareaStyles}
              placeholder={"Hey Jane,\n\nI came across your profile...\n\nThanks,\nVadim"}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              disabled={hasSentSuccessfully}
            />
          </div>

          {/* Checkboxes */}
          <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
            <label
              htmlFor={resumeCheckId}
              className={css({ display: "flex", gap: "2", alignItems: "center", cursor: "pointer" })}
            >
              <input
                type="checkbox"
                id={resumeCheckId}
                checked={includeResume}
                onChange={(e) => setIncludeResume(e.target.checked)}
                disabled={hasSentSuccessfully}
                className={css({ accentColor: "accent.primary" })}
              />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>Include resume (PDF attachment)</span>
            </label>
            <label
              htmlFor={calendlyCheckId}
              className={css({ display: "flex", gap: "2", alignItems: "center", cursor: "pointer" })}
            >
              <input
                type="checkbox"
                id={calendlyCheckId}
                checked={includeCalendly}
                onChange={(e) => setIncludeCalendly(e.target.checked)}
                disabled={hasSentSuccessfully}
                className={css({ accentColor: "accent.primary" })}
              />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>Include Calendly link in body</span>
            </label>
          </div>

          {/* Send result feedback */}
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
                <CheckCircledIcon />
              ) : (
                <ExclamationTriangleIcon />
              )}
              <span className={css({ fontSize: "sm", color: "ui.body" })}>{sendResult.message}</span>
            </div>
          )}

          {/* Footer actions */}
          <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "3", mt: "1" })}>
            {hasSentSuccessfully ? (
              <>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={() => {
                    resetForm();
                  }}
                >
                  Compose Another
                </button>
                <button
                  className={button({ variant: "solid" })}
                  onClick={() => handleOpenChange(false)}
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </button>
                <button
                  className={button({ variant: "solid" })}
                  disabled={!canSend}
                  onClick={() => void handleSend()}
                >
                  {sending ? (
                    <>
                      <div className={spinnerStyles} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <PaperPlaneIcon />
                      Send
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
