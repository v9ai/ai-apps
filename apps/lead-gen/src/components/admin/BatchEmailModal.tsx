"use client";

import { useState } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  CalendarIcon,
  CheckCircledIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  Cross2Icon,
  CrossCircledIcon,
  ExclamationTriangleIcon,
  MagicWandIcon,
  PaperPlaneIcon,
} from "@radix-ui/react-icons";

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

const spinnerLargeStyles = css({
  display: "inline-block",
  width: "32px",
  height: "32px",
  border: "3px solid",
  borderColor: "ui.border",
  borderTopColor: "accent.primary",
  borderRadius: "50%",
  animation: "spin 0.6s linear infinite",
});

// ── Types ────────────────────────────────────────────────────────────────────

interface Recipient {
  email: string;
  name: string;
}

interface SendResult {
  email: string;
  status: "sent" | "failed";
  scheduledAt?: string;
  batchDay?: number;
}

interface FailedResult {
  email: string;
  error: string;
}

interface BatchSendResponse {
  success: boolean;
  message: string;
  sent: SendResult[];
  failed: FailedResult[];
  schedulingPlan?: string;
}

interface JobContext {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  location?: string;
}

interface BatchEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipients: Recipient[];
  jobContext?: JobContext;
  defaultUseScheduler?: boolean;
}

type ModalState = "compose" | "sending" | "done";

export function BatchEmailModal({
  open,
  onOpenChange,
  recipients,
  jobContext,
  defaultUseScheduler,
}: BatchEmailModalProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<ModalState>("compose");
  const [result, setResult] = useState<BatchSendResponse | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [useScheduler, setUseScheduler] = useState(defaultUseScheduler ?? false);
  const [showRecipients, setShowRecipients] = useState(false);

  function resetForm() {
    setSubject("");
    setBody("");
    setState("compose");
    setResult(null);
    setSendError(null);
    setGenerating(false);
    setGenError(null);
    setInstructions("");
    setCompanyName("");
    setUseScheduler(defaultUseScheduler ?? false);
    setShowRecipients(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/emails/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim() || undefined,
          instructions: instructions.trim() || undefined,
          recipientCount: recipients.length,
          jobContext: jobContext || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { subject: string; body: string };
      setSubject(data.subject);
      setBody(data.body);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !body.trim() || recipients.length === 0) return;

    setState("sending");
    setSendError(null);
    setResult(null);

    try {
      const payload: {
        recipients: Recipient[];
        subject: string;
        body: string;
        useScheduler?: boolean;
      } = {
        recipients,
        subject: subject.trim(),
        body: body.trim(),
        useScheduler,
      };

      const response = await fetch("/api/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as BatchSendResponse;
      setResult(data);
      setState("done");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unexpected error");
      setState("compose");
    }
  }

  /** Preview first few recipients with personalized greeting */
  function previewPersonalization(name: string): string {
    const firstName = name.split(" ")[0] || name;
    const preview = body.replace(/\{\{name\}\}/g, firstName);
    const hasGreeting = /^(hi|hey|hello)\s+/i.test(preview.trim());
    if (!hasGreeting) return `Hi ${firstName},\n\n${preview}`;
    return preview;
  }

  const canSend =
    state === "compose" &&
    subject.trim().length > 0 &&
    body.trim().length > 0 &&
    recipients.length > 0;

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
          maxWidth: "700px",
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
          <h2 className={css({ fontSize: "xl", fontWeight: "bold", color: "ui.heading" })}>
            Send Batch Email
          </h2>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            aria-label="Close"
            onClick={() => handleOpenChange(false)}
          >
            <Cross2Icon />
          </button>
        </div>

        {state === "compose" && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            {/* Recipients section */}
            <div>
              <div className={css({ display: "flex", gap: "2", alignItems: "center", justifyContent: "space-between" })}>
                <div className={css({ display: "flex", gap: "2", alignItems: "center" })}>
                  <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                    Recipients:
                  </span>
                  <span
                    className={css({
                      fontSize: "sm",
                      px: "2",
                      py: "1",
                      bg: "accent.subtle",
                      color: "accent.primary",
                      border: "1px solid",
                      borderColor: "accent.border",
                    })}
                  >
                    {recipients.length} subscriber
                    {recipients.length === 1 ? "" : "s"}
                  </span>
                </div>
                <button
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={() => setShowRecipients(!showRecipients)}
                >
                  {showRecipients ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  {showRecipients ? "Hide" : "Preview"}
                </button>
              </div>

              {showRecipients && (
                <div
                  className={css({
                    mt: "2",
                    bg: "ui.surfaceRaised",
                    p: "2",
                  })}
                >
                  <div className={css({ overflowY: "auto", maxHeight: "140px" })}>
                    <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
                      {recipients.slice(0, 10).map((r) => (
                        <div key={r.email} className={css({ display: "flex", gap: "2", alignItems: "center" })}>
                          <span className={css({ fontSize: "xs", fontWeight: "medium", color: "ui.body" })}>
                            {r.name}
                          </span>
                          <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                            {r.email}
                          </span>
                        </div>
                      ))}
                      {recipients.length > 10 && (
                        <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                          ...and {recipients.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {sendError !== null && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
                <ExclamationTriangleIcon />
                <span className={css({ fontSize: "sm", color: "ui.body" })}>{sendError}</span>
              </div>
            )}

            {/* AI Generation */}
            <div>
              <span
                className={css({
                  fontSize: "sm",
                  fontWeight: "medium",
                  color: "ui.body",
                  display: "block",
                  mb: "2",
                })}
              >
                AI Generation
              </span>
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <input
                  className={inputStyles}
                  placeholder="Company name (optional)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <textarea
                  className={textareaStyles}
                  placeholder="Instructions — e.g. pitch Rust/trading background, ask for a call"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                />
                <button
                  className={button({ variant: "ghost" })}
                  disabled={generating || state !== "compose"}
                  onClick={() => void handleGenerate()}
                >
                  {generating ? (
                    <>
                      <div className={spinnerStyles} />
                      Generating with DeepSeek Reasoner...
                    </>
                  ) : (
                    <>
                      <MagicWandIcon />
                      Generate subject &amp; body
                    </>
                  )}
                </button>
                {genError !== null && (
                  <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
                    <ExclamationTriangleIcon />
                    <span className={css({ fontSize: "sm", color: "ui.body" })}>{genError}</span>
                  </div>
                )}
              </div>
            </div>

            <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

            {/* Subject */}
            <div>
              <label
                className={css({
                  fontSize: "sm",
                  fontWeight: "medium",
                  color: "ui.body",
                  display: "block",
                  mb: "1",
                })}
              >
                Subject
              </label>
              <input
                className={inputStyles}
                placeholder="Email subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Body */}
            <div>
              <label
                className={css({
                  fontSize: "sm",
                  fontWeight: "medium",
                  color: "ui.body",
                  display: "block",
                  mb: "1",
                })}
              >
                Body
              </label>
              <span
                className={css({
                  fontSize: "xs",
                  color: "ui.tertiary",
                  display: "block",
                  mb: "1",
                })}
              >
                Use {"{{name}}"} for personalization. Separate paragraphs with a
                blank line.
              </span>
              <textarea
                className={textareaStyles}
                placeholder={
                  "Hi {{name}},\n\nYour message here...\n\nThanks,\nThe Team"
                }
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={10}
              />
            </div>

            {/* Preview personalization */}
            {body.trim() && recipients.length > 0 && (
              <div>
                <span className={css({ fontSize: "xs", fontWeight: "medium", color: "ui.tertiary", display: "block", mb: "1" })}>
                  Preview ({recipients[0].name}):
                </span>
                <div
                  className={css({
                    bg: "ui.surfaceRaised",
                    p: "2",
                    fontSize: "xs",
                    whiteSpace: "pre-wrap",
                    maxHeight: "120px",
                    overflow: "auto",
                    color: "ui.body",
                  })}
                >
                  {previewPersonalization(recipients[0].name)}
                </div>
              </div>
            )}

            <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

            {/* Scheduling options */}
            <div>
              <span
                className={css({
                  fontSize: "sm",
                  fontWeight: "medium",
                  color: "ui.body",
                  display: "block",
                  mb: "2",
                })}
              >
                Scheduling
              </span>
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <label className={css({ display: "flex", gap: "2", alignItems: "center", cursor: "pointer" })}>
                  <input
                    type="checkbox"
                    checked={useScheduler}
                    onChange={(e) => setUseScheduler(e.target.checked)}
                    className={css({ accentColor: "accent.primary" })}
                  />
                  <span className={css({ fontSize: "sm", color: "ui.body" })}>
                    Distribute across business days (Mon-Fri, 8am UTC)
                  </span>
                </label>

                {useScheduler ? (
                  <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "accent.border", bg: "accent.subtle" })}>
                    <CalendarIcon />
                    <span className={css({ fontSize: "sm", color: "ui.body" })}>
                      Emails will be distributed across business days with
                      random 2-45 minute delays between each. Adaptive rate:{" "}
                      {recipients.length < 50 ? "5" : Math.ceil(recipients.length / 30)}{" "}
                      emails/day.
                    </span>
                  </div>
                ) : (
                  <div className={css({ display: "flex", gap: "1", alignItems: "center" })}>
                    <ClockIcon />
                    <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                      All emails scheduled 10 minutes from now.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className={css({ display: "flex", justifyContent: "flex-end", gap: "3", mt: "2" })}>
              <button
                className={button({ variant: "ghost" })}
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </button>
              <button className={button({})} disabled={!canSend} onClick={handleSend}>
                <PaperPlaneIcon />
                {useScheduler ? "Schedule" : "Send"} to {recipients.length}{" "}
                recipient{recipients.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        )}

        {state === "sending" && (
          <div className={css({ display: "flex", flexDirection: "column", alignItems: "center", gap: "4", py: "8" })}>
            <div className={spinnerLargeStyles} />
            <span className={css({ fontSize: "base", color: "ui.tertiary" })}>
              {useScheduler
                ? "Scheduling emails across business days..."
                : "Sending emails..."}
            </span>
          </div>
        )}

        {state === "done" && result !== null && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div
              className={css({
                display: "flex",
                gap: "3",
                p: "3",
                border: "1px solid",
                borderColor: result.success ? "green.500/30" : "orange.500/30",
                bg: result.success ? "green.500/10" : "orange.500/10",
              })}
            >
              {result.success ? <CheckCircledIcon /> : <ExclamationTriangleIcon />}
              <span className={css({ fontSize: "sm", color: "ui.body" })}>{result.message}</span>
            </div>

            {result.schedulingPlan && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "accent.border", bg: "accent.subtle" })}>
                <CalendarIcon />
                <span className={css({ fontSize: "sm", color: "ui.body" })}>{result.schedulingPlan}</span>
              </div>
            )}

            {result.sent.length > 0 && (
              <div>
                <div className={css({ display: "flex", gap: "2", alignItems: "center", mb: "2" })}>
                  <CheckCircledIcon color="var(--colors-status-positive)" />
                  <span className={css({ fontSize: "sm", fontWeight: "medium", color: "ui.body" })}>
                    Sent ({result.sent.length})
                  </span>
                </div>
                <div className={css({ overflowY: "auto", maxHeight: "200px" })}>
                  <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
                    {result.sent.map((r) => (
                      <div key={r.email} className={css({ display: "flex", gap: "2", alignItems: "center" })}>
                        <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                          {r.email}
                        </span>
                        {r.batchDay && (
                          <span
                            className={css({
                              fontSize: "xs",
                              px: "2",
                              py: "1",
                              bg: "accent.subtle",
                              color: "accent.primary",
                              border: "1px solid",
                              borderColor: "accent.border",
                            })}
                          >
                            Day {r.batchDay}
                          </span>
                        )}
                        {r.scheduledAt && (
                          <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                            {new Date(r.scheduledAt).toLocaleDateString("en-GB", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {result.failed.length > 0 && (
              <div>
                <div className={css({ display: "flex", gap: "2", alignItems: "center", mb: "2" })}>
                  <CrossCircledIcon color="var(--colors-red-9)" />
                  <span className={css({ fontSize: "sm", fontWeight: "medium", color: "ui.body" })}>
                    Failed ({result.failed.length})
                  </span>
                </div>
                <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
                  {result.failed.map((r) => (
                    <span key={r.email} className={css({ fontSize: "xs", color: "red.400" })}>
                      {r.email}: {r.error}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={css({ display: "flex", justifyContent: "flex-end", gap: "3", mt: "2" })}>
              <button className={button({ variant: "ghost" })} onClick={resetForm}>
                Compose Another
              </button>
              <button className={button({})} onClick={() => handleOpenChange(false)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
