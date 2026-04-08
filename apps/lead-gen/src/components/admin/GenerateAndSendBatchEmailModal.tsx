"use client";

import { useState, useEffect } from "react";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  CheckCircledIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  Pencil1Icon,
  ResetIcon,
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

interface Contact {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
}

interface PreviewEmail {
  contactId: number;
  contactName: string;
  contactEmail: string;
  subject: string;
  body: string;
}

interface JobContext {
  title?: string;
  description?: string;
  requiredSkills?: string[];
  location?: string;
}

interface GenerateAndSendBatchEmailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  companyName?: string;
  contacts: Contact[];
  onSuccess?: () => void;
  jobContext?: JobContext;
}

type Step = "generate" | "preview" | "sending" | "done";

export function GenerateAndSendBatchEmailModal({
  open,
  onOpenChange,
  companyId,
  companyName,
  contacts,
  onSuccess,
  jobContext,
}: GenerateAndSendBatchEmailModalProps) {
  const [step, setStep] = useState<Step>("generate");
  const [instructions, setInstructions] = useState("");
  const [generatedEmails, setGeneratedEmails] = useState<PreviewEmail[]>([]);
  const [editedEmails, setEditedEmails] = useState<Map<number, PreviewEmail>>(
    new Map(),
  );
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<{
    sent: number;
    failed: number;
    message: string;
  } | null>(null);
  const [expandedContact, setExpandedContact] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setStep("generate");
      setGeneratedEmails([]);
      setEditedEmails(new Map());
      setGenError(null);
      setSendResult(null);
      setInstructions("");
      setExpandedContact(null);
    }
  }, [open]);

  async function handleGenerate() {
    setGenerating(true);
    setGenError(null);

    try {
      // Generate a template email, then personalize for each contact
      const res = await fetch("/api/emails/generate-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName || undefined,
          instructions: instructions.trim() || undefined,
          recipientCount: contacts.length,
          jobContext: jobContext || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const template = (await res.json()) as { subject: string; body: string };

      // Personalize for each contact
      const emails: PreviewEmail[] = contacts.map((c) => {
        const firstName = c.firstName.split(" ")[0] || c.firstName;
        const body = template.body.replace(/\{\{name\}\}/g, firstName);
        const hasGreeting = /^(hi|hey|hello)\s+/i.test(body.trim());
        const finalBody = hasGreeting ? body : `Hi ${firstName},\n\n${body}`;

        return {
          contactId: c.id,
          contactName: `${c.firstName} ${c.lastName || ""}`.trim(),
          contactEmail: c.email,
          subject: template.subject,
          body: finalBody,
        };
      });

      setGeneratedEmails(emails);
      setStep("preview");
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function handleEdit(contactId: number, field: "subject" | "body", value: string) {
    const original = generatedEmails.find((e) => e.contactId === contactId);
    if (!original) return;
    const current = editedEmails.get(contactId) || { ...original };
    const updated = { ...current, [field]: value };
    setEditedEmails(new Map(editedEmails.set(contactId, updated)));
  }

  function getEmail(contactId: number): PreviewEmail {
    return editedEmails.get(contactId) || generatedEmails.find((e) => e.contactId === contactId)!;
  }

  async function handleSend() {
    setStep("sending");

    const emailsToSend = generatedEmails.map((e) => {
      const final = getEmail(e.contactId);
      return {
        email: final.contactEmail,
        name: final.contactName,
        contactId: e.contactId,
      };
    });

    try {
      const res = await fetch("/api/emails/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: emailsToSend.map((e) => ({ email: e.email, name: e.name, contactId: e.contactId, companyId })),
          subject: getEmail(generatedEmails[0].contactId).subject,
          body: getEmail(generatedEmails[0].contactId).body,
          useScheduler: true,
        }),
      });

      const data = await res.json();
      setSendResult({
        sent: data.sent?.length ?? 0,
        failed: data.failed?.length ?? 0,
        message: data.message,
      });
      setStep("done");
      onSuccess?.();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Send failed");
      setStep("preview");
    }
  }

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
          maxWidth: "750px",
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
            Generate & Send {companyName ? `-- ${companyName}` : ""}
          </h2>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <Cross2Icon />
          </button>
        </div>

        {/* Step 1: Generate */}
        {step === "generate" && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "accent.border", bg: "accent.subtle" })}>
              <span className={css({ fontSize: "sm", color: "ui.body" })}>
                Generating personalized emails for {contacts.length} contact
                {contacts.length === 1 ? "" : "s"}
              </span>
            </div>

            <textarea
              className={textareaStyles}
              placeholder="Special instructions (e.g., mention their recent work, ask about specific roles)"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={4}
            />

            {genError && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
                <ExclamationTriangleIcon />
                <span className={css({ fontSize: "sm", color: "ui.body" })}>{genError}</span>
              </div>
            )}

            <div className={css({ display: "flex", justifyContent: "flex-end", gap: "3" })}>
              <button
                className={button({ variant: "ghost" })}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </button>
              <button
                className={button({})}
                disabled={generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <>
                    <div className={spinnerStyles} /> Generating...
                  </>
                ) : (
                  <>
                    <MagicWandIcon /> Generate Emails
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview & Edit */}
        {step === "preview" && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div className={css({ display: "flex", justifyContent: "space-between", alignItems: "center" })}>
              <span
                className={css({
                  fontSize: "xs",
                  px: "2",
                  py: "1",
                  border: "1px solid",
                  borderColor: "accent.border",
                  bg: "accent.subtle",
                  color: "accent.primary",
                })}
              >
                {generatedEmails.length} email
                {generatedEmails.length !== 1 ? "s" : ""} generated
              </span>
              <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                Click to edit before sending
              </span>
            </div>

            <div className={css({ overflowY: "auto", maxHeight: "400px" })}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                {generatedEmails.map((email) => {
                  const current = getEmail(email.contactId);
                  const isEdited = editedEmails.has(email.contactId);
                  const isExpanded = expandedContact === email.contactId;

                  return (
                    <div
                      key={email.contactId}
                      className={css({
                        border: "1px solid",
                        borderColor: "ui.border",
                        p: "3",
                      })}
                    >
                      <div
                        className={css({
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                        })}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setExpandedContact(isExpanded ? null : email.contactId)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedContact(isExpanded ? null : email.contactId);
                          }
                        }}
                        aria-expanded={isExpanded}
                      >
                        <div className={css({ display: "flex", gap: "2", alignItems: "center" })}>
                          <span className={css({ fontSize: "sm", fontWeight: "medium", color: "ui.body" })}>
                            {email.contactName}
                          </span>
                          <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                            {email.contactEmail}
                          </span>
                          {isEdited && (
                            <span
                              className={css({
                                fontSize: "xs",
                                px: "2",
                                py: "1",
                                border: "1px solid",
                                borderColor: "ui.border",
                                color: "ui.secondary",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "1",
                              })}
                            >
                              <Pencil1Icon /> Edited
                            </span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className={css({ display: "flex", flexDirection: "column", gap: "2", mt: "3" })}>
                          <input
                            className={inputStyles}
                            value={current.subject}
                            onChange={(e) =>
                              handleEdit(email.contactId, "subject", e.target.value)
                            }
                          />
                          <textarea
                            className={textareaStyles}
                            value={current.body}
                            onChange={(e) =>
                              handleEdit(email.contactId, "body", e.target.value)
                            }
                            rows={8}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

            <div className={css({ display: "flex", justifyContent: "space-between" })}>
              <button
                className={button({ variant: "ghost" })}
                onClick={() => {
                  setStep("generate");
                  setGeneratedEmails([]);
                  setEditedEmails(new Map());
                }}
              >
                <ResetIcon /> Back
              </button>
              <button className={button({ variant: "solidGreen" })} onClick={handleSend}>
                <PaperPlaneIcon /> Send All Emails
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Sending */}
        {step === "sending" && (
          <div className={css({ display: "flex", flexDirection: "column", alignItems: "center", gap: "4", py: "8" })}>
            <div className={spinnerLargeStyles} />
            <span className={css({ fontSize: "base", color: "ui.tertiary" })}>
              Scheduling emails...
            </span>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && sendResult && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            <div
              className={css({
                display: "flex",
                gap: "3",
                p: "3",
                border: "1px solid",
                borderColor: sendResult.failed === 0 ? "green.500/30" : "orange.500/30",
                bg: sendResult.failed === 0 ? "green.500/10" : "orange.500/10",
              })}
            >
              <CheckCircledIcon />
              <span className={css({ fontSize: "sm", color: "ui.body" })}>{sendResult.message}</span>
            </div>

            <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
              <span className={css({ fontSize: "sm", color: "ui.body" })}>Sent: {sendResult.sent}</span>
              {sendResult.failed > 0 && (
                <span className={css({ fontSize: "sm", color: "red.400" })}>
                  Failed: {sendResult.failed}
                </span>
              )}
            </div>

            <div className={css({ display: "flex", justifyContent: "flex-end" })}>
              <button className={button({})} onClick={() => onOpenChange(false)}>Done</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
