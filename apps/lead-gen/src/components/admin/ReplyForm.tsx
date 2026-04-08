"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  PaperPlaneIcon,
  MagicWandIcon,
  ClockIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import {
  useGenerateReplyMutation,
  useSendEmailMutation,
} from "@/__generated__/hooks";
import { REPLY_TYPE_OPTIONS } from "@/lib/email/reply-types";
import { vadimSignature } from "@/lib/email/signature";

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
  fontSize: "sm",
  fontWeight: "medium",
  color: "ui.secondary",
  mb: "1",
  display: "block",
});

const selectStyles = css({
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

interface ReplyFormProps {
  originalEmail: {
    from: string;
    to: string | string[];
    subject?: string | null;
    html?: string | null;
    text?: string | null;
    replyToOptions?: Array<{
      value: string;
      label: string;
    }> | null;
    recommendedReplyTo?: string | null;
  };
  onSuccess?: () => void;
}

export function ReplyForm({ originalEmail, onSuccess }: ReplyFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [replyType, setReplyType] = useState<string>("polite_decline");
  const [error, setError] = useState("");
  const [includeCalendly, setIncludeCalendly] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>(
    originalEmail.recommendedReplyTo || originalEmail.from,
  );

  const [generateReply, { loading: generating }] = useGenerateReplyMutation();
  const [sendEmail, { loading: sending }] = useSendEmailMutation();

  const recipientOptions = originalEmail.replyToOptions || [
    {
      value: originalEmail.from,
      label: `${originalEmail.from} (Original Sender)`,
    },
  ];

  const handleGenerate = async () => {
    setError("");
    try {
      const originalContent = originalEmail.text || originalEmail.html || "";
      const { data } = await generateReply({
        variables: {
          input: {
            originalEmailContent: originalContent,
            originalSender: originalEmail.from,
            additionalDetails: additionalDetails || undefined,
            tone: "professional",
            replyType: replyType || undefined,
            includeCalendly,
            replyTo: selectedRecipient,
          },
        },
      });

      if (data?.generateReply) {
        setMessage(data.generateReply.body);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate reply");
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      setError("Please enter a message");
      return;
    }
    setError("");

    try {
      const calendlyLink = includeCalendly
        ? `<p><a href="https://calendly.com/nicolad" style="color: #228be6; text-decoration: none;">Schedule a call: https://calendly.com/nicolad</a></p>`
        : "";

      const replyHtml = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px;">
          <div style="white-space: pre-wrap;">${message.replace(/\n/g, "<br>")}</div>
          ${calendlyLink}
          ${vadimSignature}
          <br>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          <div style="color: #666; font-size: 14px;">
            <p><strong>On ${new Date().toLocaleDateString()}, ${originalEmail.from} wrote:</strong></p>
            <blockquote style="margin: 10px 0; padding-left: 15px; border-left: 3px solid #e0e0e0; color: #666;">
              ${originalEmail.html || originalEmail.text?.replace(/\n/g, "<br>") || ""}
            </blockquote>
          </div>
        </div>
      `;

      const { data } = await sendEmail({
        variables: {
          input: {
            to: selectedRecipient,
            subject: originalEmail.subject?.startsWith("Re: ")
              ? originalEmail.subject
              : `Re: ${originalEmail.subject || "No Subject"}`,
            html: replyHtml,
            text: message,
          },
        },
      });

      if (!data?.sendEmail.success) {
        throw new Error(data?.sendEmail.error || "Failed to schedule reply");
      }

      setMessage("");
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setMessage("");
      setError("");
      setAdditionalDetails("");
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button className={button({ variant: "ghost" })} onClick={() => setOpen(true)}>
        <PaperPlaneIcon /> Reply
      </button>

      {/* Modal */}
      {open && (
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
              maxWidth: "600px",
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
                Reply to Email
              </h2>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                aria-label="Close"
                onClick={() => handleOpenChange(false)}
              >
                <Cross2Icon />
              </button>
            </div>

            <div className={css({ display: "flex", gap: "1", alignItems: "center", mb: "4" })}>
              <ClockIcon />
              <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                Email will be sent immediately
              </span>
            </div>

            <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
              <div>
                <label className={labelStyles}>From</label>
                <input
                  className={inputStyles}
                  value="contact@vadim.blog"
                  readOnly
                />
              </div>

              {recipientOptions.length > 1 ? (
                <div>
                  <label className={labelStyles}>Reply To</label>
                  <select
                    className={selectStyles}
                    value={selectedRecipient}
                    onChange={(e) => setSelectedRecipient(e.target.value)}
                  >
                    {recipientOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className={labelStyles}>To</label>
                  <input
                    className={inputStyles}
                    value={originalEmail.from}
                    readOnly
                  />
                </div>
              )}

              <div>
                <label className={labelStyles}>Subject</label>
                <input
                  className={inputStyles}
                  value={
                    originalEmail.subject?.startsWith("Re: ")
                      ? originalEmail.subject
                      : `Re: ${originalEmail.subject || "No Subject"}`
                  }
                  readOnly
                />
              </div>

              <div>
                <label className={labelStyles}>Reply Type</label>
                <select
                  className={selectStyles}
                  value={replyType}
                  onChange={(e) => setReplyType(e.target.value)}
                >
                  {REPLY_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelStyles}>Additional Details (Optional)</label>
                <textarea
                  className={textareaStyles}
                  placeholder="Add any specific details you want to include in the AI-generated reply..."
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  rows={2}
                  style={{ minHeight: "60px" }}
                />
              </div>

              <button
                className={button({ variant: "ghost" })}
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <div className={spinnerStyles} /> Generating AI Reply...
                  </>
                ) : (
                  <>
                    <MagicWandIcon /> Generate AI Reply
                  </>
                )}
              </button>

              <div>
                <label className={labelStyles}>Message</label>
                <textarea
                  className={textareaStyles}
                  placeholder="Type your reply here or use the Generate AI Reply button..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={12}
                />
              </div>

              <label className={css({ display: "flex", gap: "2", alignItems: "center", cursor: "pointer" })}>
                <input
                  type="checkbox"
                  checked={includeCalendly}
                  onChange={(e) => setIncludeCalendly(e.target.checked)}
                  className={css({ accentColor: "accent.primary" })}
                />
                <span className={css({ fontSize: "sm", color: "ui.body" })}>Include Calendly link</span>
              </label>

              {error && (
                <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.500/30", bg: "red.500/10" })}>
                  <ExclamationTriangleIcon />
                  <span className={css({ fontSize: "sm", color: "ui.body" })}>{error}</span>
                </div>
              )}

              <div className={css({ display: "flex", justifyContent: "flex-end", gap: "3" })}>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={() => handleOpenChange(false)}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={handleSend}
                  disabled={sending || !message.trim()}
                >
                  {sending ? (
                    <>
                      <div className={spinnerStyles} /> Sending...
                    </>
                  ) : (
                    <>
                      <PaperPlaneIcon /> Send Reply
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
