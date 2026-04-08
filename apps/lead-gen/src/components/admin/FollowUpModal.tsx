"use client";

import { useState, useEffect } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  ClockIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  ReloadIcon,
  ArrowLeftIcon,
} from "@radix-ui/react-icons";
import { useGenerateEmailMutation } from "@/__generated__/hooks";

// ── Reusable form styles ─────────────────────────────────────────────────────

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

interface FollowUpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName?: string;
  companyDescription?: string;
  sentEmails: Array<{
    id: number;
    resendId: string;
    recipientEmail: string;
    recipientName?: string | null;
    subject: string;
    sentAt?: string | null;
    sequenceNumber?: string | null;
    sequenceType?: string | null;
    status: string;
  }>;
  onSuccess?: () => void;
}

interface EmailPreview {
  contactEmail: string;
  contactName: string;
  subject: string;
  body: string;
  originalEmailId: number;
  originalSubject: string;
  daysSinceOriginal: number;
}

export function FollowUpModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  companyDescription,
  sentEmails,
  onSuccess,
}: FollowUpModalProps) {
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [generatedEmails, setGeneratedEmails] = useState<Map<number, EmailPreview>>(new Map());
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [step, setStep] = useState<"select" | "preview">("select");

  const [generateEmail] = useGenerateEmailMutation();

  // Filter emails eligible for follow-up
  const eligibleEmails = sentEmails.filter(
    (email) =>
      (email.status === "sent" || email.status === "delivered" || email.status === "opened") &&
      (email.sequenceNumber === "0" || email.sequenceType === "initial") &&
      email.recipientEmail,
  );

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setSelectedEmails(new Set());
      setGeneratedEmails(new Map());
      setStep("select");
    }
  }, [open]);

  const toggleEmail = (emailId: number) => {
    const next = new Set(selectedEmails);
    if (next.has(emailId)) next.delete(emailId);
    else next.add(emailId);
    setSelectedEmails(next);
  };

  const selectAll = () => setSelectedEmails(new Set(eligibleEmails.map((e) => e.id)));
  const deselectAll = () => setSelectedEmails(new Set());

  const daysSince = (sentAt: string | null | undefined): number => {
    if (!sentAt) return 0;
    return Math.floor((Date.now() - new Date(sentAt).getTime()) / (1000 * 60 * 60 * 24));
  };

  const followUpInstructions = (originalSubject: string, days: number): string => {
    const timeRef = days <= 3 ? "a few days ago" : days <= 7 ? "last week" : "earlier";
    return `This is a FIRST FOLLOW-UP email sent ${days} days after the initial outreach about "${originalSubject}".

CRITICAL GUIDELINES:
- Reference the previous email naturally ("Following up on my message from ${timeRef}...")
- Keep it SHORT and FRIENDLY (max 120 words)
- Acknowledge they might be busy
- Gently reiterate interest without being pushy
- Include ONE specific question or simple call-to-action
- Maintain the same professional but approachable tone

DO NOT:
- Apologize excessively for following up
- Repeat everything from the first email
- Sound desperate or aggressive`;
  };

  const handleGenerate = async () => {
    if (selectedEmails.size === 0) return;
    setGenerating(true);
    const generated = new Map<number, EmailPreview>();

    try {
      for (const emailId of selectedEmails) {
        const original = eligibleEmails.find((e) => e.id === emailId);
        if (!original) continue;

        const days = daysSince(original.sentAt);
        const result = await generateEmail({
          variables: {
            input: {
              recipientName: original.recipientName || original.recipientEmail.split("@")[0],
              companyName: companyName ?? undefined,
              purpose: followUpInstructions(original.subject, days),
              tone: "professional and friendly",
            },
          },
        });

        if (result.data?.generateEmail) {
          generated.set(emailId, {
            contactEmail: original.recipientEmail,
            contactName: original.recipientName || original.recipientEmail,
            subject: result.data.generateEmail.subject,
            body: result.data.generateEmail.text,
            originalEmailId: emailId,
            originalSubject: original.subject,
            daysSinceOriginal: days,
          });
        }
      }

      setGeneratedEmails(generated);
      setStep("preview");
    } catch (err) {
      console.error("Failed to generate follow-ups:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const results = await Promise.allSettled(
        Array.from(generatedEmails.entries()).map(async ([emailId, preview]) => {
          const html = `<p>${preview.body.replace(/\n/g, "</p><p>")}</p>`;
          const response = await fetch("/api/email/send-single", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: preview.contactEmail,
              subject: preview.subject,
              html,
              text: preview.body,
              companyId,
              parentEmailId: emailId,
              sequenceType: "followup_1",
              sequenceNumber: 1,
              recipientName: preview.contactName,
            }),
          });
          if (!response.ok) throw new Error(`Failed to send to ${preview.contactEmail}`);
          return response.json();
        }),
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      if (successful > 0) {
        onSuccess?.();
        onOpenChange(false);
      }
    } catch (err) {
      console.error("Failed to send follow-ups:", err);
    } finally {
      setSending(false);
    }
  };

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
        onClick={() => onOpenChange(false)}
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
          maxHeight: "85vh",
          overflowY: "auto",
          p: "6",
        })}
      >
        {/* Header */}
        <h2
          className={css({
            fontSize: "lg",
            fontWeight: "bold",
            color: "ui.heading",
            mb: "4",
            pb: "4",
            borderBottom: "1px solid",
            borderBottomColor: "ui.border",
            display: "flex",
            alignItems: "center",
            gap: "2",
          })}
        >
          <ClockIcon />
          Schedule Follow-up Emails {companyName && `- ${companyName}`}
        </h2>

        {step === "select" && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
            <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
              <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                Select contacts for follow-up
              </span>
              <div className={css({ display: "flex", gap: "2" })}>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={selectAll}>Select All</button>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={deselectAll}>Deselect All</button>
              </div>
            </div>

            {eligibleEmails.length === 0 ? (
              <div className={css({ border: "1px solid", borderColor: "ui.border", p: "3" })}>
                <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                  No emails eligible for follow-ups. Emails must be sent/delivered/opened initial outreach.
                </span>
              </div>
            ) : (
              <div className={css({ overflowY: "auto", maxHeight: "400px" })}>
                <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                  {eligibleEmails.map((email) => {
                    const days = daysSince(email.sentAt);
                    return (
                      <div
                        key={email.id}
                        className={css({
                          border: "1px solid",
                          borderColor: selectedEmails.has(email.id) ? "accent.primary" : "ui.border",
                          p: "3",
                          cursor: "pointer",
                        })}
                        onClick={() => toggleEmail(email.id)}
                      >
                        <div className={css({ display: "flex", gap: "3", alignItems: "flex-start" })}>
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(email.id)}
                            onChange={() => toggleEmail(email.id)}
                            onClick={(e) => e.stopPropagation()}
                            className={css({ accentColor: "accent.primary", mt: "1" })}
                          />
                          <div style={{ flex: 1 }}>
                            <span className={css({ fontSize: "sm", fontWeight: "bold", color: "ui.body", display: "block" })}>
                              {email.recipientName || email.recipientEmail}
                            </span>
                            <span className={css({ fontSize: "xs", color: "ui.tertiary", display: "block" })}>{email.recipientEmail}</span>
                            <span className={css({ fontSize: "xs", color: "ui.tertiary", display: "block" })}>Original: {email.subject}</span>
                          </div>
                          <div className={css({ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "1" })}>
                            <span
                              className={css({
                                fontSize: "xs",
                                px: "2",
                                py: "1",
                                border: "1px solid",
                                borderColor: "ui.border",
                                color: "ui.secondary",
                              })}
                            >
                              {email.status}
                            </span>
                            <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>{days}d ago</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", mt: "2" })}>
              <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                {selectedEmails.size} contact{selectedEmails.size !== 1 ? "s" : ""} selected
              </span>
              <div className={css({ display: "flex", gap: "2" })}>
                <button className={button({ variant: "ghost" })} onClick={() => onOpenChange(false)}>Cancel</button>
                <button className={button({})} onClick={handleGenerate} disabled={selectedEmails.size === 0 || generating}>
                  {generating ? <><div className={spinnerStyles} /> Generating...</> : <><MagicWandIcon /> Generate Follow-ups</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
            <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
              Review and edit before sending ({generatedEmails.size} emails)
            </span>

            <div className={css({ overflowY: "auto", maxHeight: "400px" })}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
                {Array.from(generatedEmails.entries()).map(([emailId, preview]) => (
                  <div key={emailId} className={css({ border: "1px solid", borderColor: "ui.border", p: "3" })}>
                    <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                      <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
                        <div>
                          <span className={css({ fontSize: "sm", fontWeight: "bold", color: "ui.body", display: "block" })}>To: {preview.contactName}</span>
                          <span className={css({ fontSize: "xs", color: "ui.tertiary", display: "block" })}>{preview.contactEmail}</span>
                        </div>
                      </div>

                      <div>
                        <span className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold" })}>Subject:</span>
                        <span className={css({ fontSize: "sm", color: "ui.body", ml: "1" })}>{preview.subject}</span>
                      </div>

                      <div>
                        <span className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold", display: "block", mb: "1" })}>Body:</span>
                        <textarea
                          className={textareaStyles}
                          value={preview.body}
                          onChange={(e) => {
                            const updated = new Map(generatedEmails);
                            const current = updated.get(emailId);
                            if (current) {
                              updated.set(emailId, { ...current, body: e.target.value });
                              setGeneratedEmails(updated);
                            }
                          }}
                          rows={6}
                        />
                      </div>

                      <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                        Follow-up to: {preview.originalSubject} ({preview.daysSinceOriginal}d ago)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center", mt: "2" })}>
              <button className={button({ variant: "ghost" })} onClick={() => setStep("select")}>
                <ArrowLeftIcon /> Back
              </button>
              <button className={button({})} onClick={handleSend} disabled={generatedEmails.size === 0 || sending}>
                {sending ? <><div className={spinnerStyles} /> Sending...</> : <><PaperPlaneIcon /> Send {generatedEmails.size} Follow-up{generatedEmails.size !== 1 ? "s" : ""}</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
