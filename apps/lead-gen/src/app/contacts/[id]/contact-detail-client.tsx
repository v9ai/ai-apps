"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  useGetContactQuery,
  useGetContactEmailsQuery,
  useGetResendEmailQuery,
  useFindContactEmailMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
import { button } from "@/recipes/button";
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";
import {
  ArrowLeftIcon,
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
} from "@radix-ui/react-icons";

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

  const handleSend = async () => {
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
        }),
      });
      const json = (await res.json()) as { success: boolean; error?: string };
      if (json.success) {
        setSendResult({ type: "success", message: `Sent to ${contact.email}` });
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

  if (!open) {
    return (
      <button className={button({ variant: "ghost", size: "md" })} onClick={() => handleOpen(true)}>
        <MagicWandIcon />
        Draft email
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className={css({ position: "fixed", inset: "0", bg: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "50" })} onClick={() => handleOpen(false)}>
        <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "540px", width: "100%" })} onClick={(e) => e.stopPropagation()}>
          <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>
            {step === "generate" ? "Draft email" : "Edit & send"} \u2014 {recipientName}
          </h3>
          {(contact.position || contact.company) && (
            <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
              {contact.position ?? ""}
              {contact.position && contact.company ? " \u00b7 " : ""}
              {contact.company ?? ""}
            </p>
          )}

          {/* ── Generate step ── */}
          {step === "generate" && (
            <div className={flex({ direction: "column", gap: "3" })}>
              <textarea
                className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", resize: "vertical", _focus: { borderColor: "accent.primary" } })}
                placeholder="Special instructions (optional) \u2014 e.g. mention their recent open source work\u2026"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                disabled={isStreaming}
              />

              <div className={flex({ gap: "2" })}>
                <button className={button({ variant: "ghost" })} onClick={handleGenerate} disabled={isStreaming}>
                  <MagicWandIcon />
                  {isStreaming ? "Generating\u2026" : "Generate"}
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
              </div>

              {error && (
                <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.9", bg: "red.3" })}>
                  <div className={css({ flexShrink: 0 })}><ExclamationTriangleIcon /></div>
                  <span>{error}</span>
                </div>
              )}

              {isStreaming && partialContent && (
                <div>
                  <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>Streaming\u2026</p>
                  <code className={css({ fontFamily: "mono", fontSize: "xs", bg: "ui.surfaceRaised", px: "1", display: "block", whiteSpace: "pre-wrap", maxHeight: "200px", overflow: "auto" })}>
                    {partialContent}
                  </code>
                </div>
              )}

              {content && !isStreaming && (
                <div style={{ background: "var(--green-2)", borderRadius: 0, padding: "var(--space-3)" }}>
                  <div className={flex({ justify: "space-between", align: "center", mb: "2" })}>
                    <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}><CheckIcon /> Generated</span>
                  </div>
                  <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold", mb: "1" })}>SUBJECT</p>
                  <p className={css({ fontSize: "sm", fontWeight: "medium", mb: "3" })}>{content.subject}</p>
                  <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold", mb: "1" })}>BODY</p>
                  <p className={css({ fontSize: "sm" })} style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{content.body}</p>
                </div>
              )}

              <div className={flex({ align: "center", gap: "2" })}>
                <input
                  type="checkbox"
                  id="includeResumeGenerate"
                  checked={includeResume}
                  onChange={(e) => setIncludeResume(e.target.checked)}
                />
                <label className={css({ fontSize: "sm" })} htmlFor="includeResumeGenerate">
                  Include resume
                </label>
              </div>

              <div className={flex({ justify: "space-between", mt: "2" })}>
                <button className={button({ variant: "ghost" })} onClick={() => handleOpen(false)}>Close</button>
                {content && !isStreaming && (
                  <button className={button({ variant: "ghost" })} onClick={handleProceedToEdit}>
                    Edit & Send {"\u2192"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Edit & Send step ── */}
          {step === "edit" && (
            <div className={flex({ direction: "column", gap: "3" })}>
              <div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>Subject</p>
                <input
                  className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                />
              </div>

              <div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>Body</p>
                <textarea
                  className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", resize: "vertical", _focus: { borderColor: "accent.primary" } })}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={12}
                />
              </div>

              <div className={flex({ align: "center", gap: "2" })}>
                <input
                  type="checkbox"
                  id="includeResume"
                  checked={includeResume}
                  onChange={(e) => setIncludeResume(e.target.checked)}
                />
                <label className={css({ fontSize: "sm" })} htmlFor="includeResume">
                  Include resume
                </label>
              </div>

              {sendResult && (
                <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: sendResult.type === "success" ? "status.positive" : "red.9", bg: sendResult.type === "success" ? "status.positiveDim" : "red.3" })}>
                  <div className={css({ flexShrink: 0 })}><InfoCircledIcon /></div>
                  <span>{sendResult.message}</span>
                </div>
              )}

              <div className={flex({ justify: "space-between", gap: "2", wrap: "wrap" })}>
                <button className={button({ variant: "ghost" })} onClick={() => setStep("generate")}>
                  {"\u2190"} Back
                </button>
                <div className={flex({ gap: "2" })}>
                  <button className={button({ variant: "ghost" })} onClick={handleCopy}>
                    <CopyIcon />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                  {hasEmail ? (
                    <button
                      className={button({ variant: "solidGreen" })}
                      onClick={handleSend}
                      disabled={sending || !editSubject || !editBody}
                    >
                      <PaperPlaneIcon />
                      Send
                    </button>
                  ) : (
                    <button className={button({ variant: "ghost" })} disabled>
                      No email address
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
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

  if (!open) {
    return (
      <button className={button({ variant: "ghost", size: "md" })} onClick={() => handleOpenChange(true)}>
        <Pencil1Icon />
        Edit
      </button>
    );
  }

  return (
    <div className={css({ position: "fixed", inset: "0", bg: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "50" })} onClick={() => handleOpenChange(false)}>
      <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "480px", width: "100%" })} onClick={(e) => e.stopPropagation()}>
        <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "3" })}>Edit contact</h3>

        <div className={flex({ direction: "column", gap: "3" })}>
          {error && (
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.9", bg: "red.3" })}>
              <div className={css({ flexShrink: 0 })}><ExclamationTriangleIcon /></div>
              <span>{error}</span>
            </div>
          )}

          <div className={flex({ gap: "2" })}>
            <div style={{ flex: 1 }}>
              <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
                First name *
              </p>
              <input
                className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div style={{ flex: 1 }}>
              <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
                Last name
              </p>
              <input
                className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
              Position
            </p>
            <input
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
              placeholder="e.g. Engineering Manager"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
              Email
            </p>
            <input
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
              type="email"
              placeholder="name@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
              LinkedIn URL
            </p>
            <input
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
              placeholder="https://linkedin.com/in/\u2026"
              value={form.linkedinUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
              GitHub handle
            </p>
            <input
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
              placeholder="username"
              value={form.githubHandle}
              onChange={(e) => setForm((f) => ({ ...f, githubHandle: e.target.value }))}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
              Telegram handle
            </p>
            <input
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
              placeholder="username"
              value={form.telegramHandle}
              onChange={(e) => setForm((f) => ({ ...f, telegramHandle: e.target.value }))}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
              Tags (comma-separated)
            </p>
            <input
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })}
              placeholder="recruiter, hiring-manager"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
            />
          </div>

          <div className={flex({ align: "center", gap: "2" })}>
            <input
              type="checkbox"
              id="doNotContact"
              checked={form.doNotContact}
              onChange={(e) => setForm((f) => ({ ...f, doNotContact: e.target.checked }))}
            />
            <label className={css({ fontSize: "sm" })} htmlFor="doNotContact">
              Do not contact
            </label>
          </div>
        </div>

        <div className={flex({ gap: "3", mt: "4", justify: "end" })}>
          <button className={button({ variant: "ghost" })} onClick={() => handleOpenChange(false)}>
            Cancel
          </button>
          <button className={button({ variant: "ghost" })} onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving\u2026" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
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

  if (!open) {
    return (
      <button className={button({ variant: "ghost", size: "md" })} onClick={() => setOpen(true)}>
        <TrashIcon />
        Delete
      </button>
    );
  }

  return (
    <div className={css({ position: "fixed", inset: "0", bg: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "50" })} onClick={() => setOpen(false)}>
      <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "400px", width: "100%" })} onClick={(e) => e.stopPropagation()}>
        <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>Delete {contactName}?</h3>
        <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
          This action cannot be undone.
        </p>

        {error && (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.9", bg: "red.3", mb: "3" })}>
            <div className={css({ flexShrink: 0 })}><ExclamationTriangleIcon /></div>
            <span>{error}</span>
          </div>
        )}

        <div className={flex({ gap: "3", justify: "end" })}>
          <button className={button({ variant: "ghost" })} onClick={() => setOpen(false)}>
            Cancel
          </button>
          <button className={button({ variant: "solid" })} onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting\u2026" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Email Detail Dialog ─────────────────────────────────────────────────────

type ContactEmailRow = {
  id: number;
  resendId: string;
  subject: string;
  fromEmail: string;
  toEmails: string[];
  status: string;
  sentAt?: string | null;
  createdAt: string;
};

function EmailDetailDialog({ email }: { email: ContactEmailRow }) {
  const [open, setOpen] = useState(false);

  const { data, loading } = useGetResendEmailQuery({
    variables: { resendId: email.resendId },
    skip: !open,
  });

  const detail = data?.resendEmail;

  return (
    <>
      {/* Card trigger */}
      <div
        className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3", cursor: "pointer" })}
        onClick={() => setOpen(true)}
      >
        <div className={css({ p: "3" })}>
          <div className={flex({ justify: "space-between", align: "start", gap: "2", wrap: "wrap" })}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className={css({ fontSize: "sm", fontWeight: "medium" })} style={{ wordBreak: "break-word" }}>
                {email.subject}
              </p>
              <p className={css({ fontSize: "xs", color: "ui.tertiary", mt: "1" })}>
                {email.sentAt
                  ? new Date(email.sentAt).toLocaleString()
                  : new Date(email.createdAt).toLocaleString()}
              </p>
            </div>
            <span
              className={css({
                fontSize: "xs",
                px: "2",
                py: "1",
                border: "1px solid",
                borderColor: email.status === "delivered" ? "status.positive" : email.status === "bounced" ? "red.9" : "blue.9",
                color: email.status === "delivered" ? "status.positive" : email.status === "bounced" ? "red.9" : "blue.9",
                bg: email.status === "delivered" ? "status.positiveDim" : email.status === "bounced" ? "red.3" : "blue.3",
              })}
            >
              {email.status}
            </span>
          </div>
        </div>
      </div>

      {/* Dialog overlay */}
      {open && (
        <div className={css({ position: "fixed", inset: "0", bg: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "50" })} onClick={() => setOpen(false)}>
          <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "580px", width: "100%" })} onClick={(e) => e.stopPropagation()}>
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "3" })}>{email.subject}</h3>

            {loading ? (
              <div className={flex({ justify: "center", py: "6" })}>
                <div className={css({ w: "16px", h: "16px", border: "2px solid", borderColor: "ui.border", borderTopColor: "accent.primary", borderRadius: "50%", animation: "spin 0.6s linear infinite" })} />
              </div>
            ) : detail ? (
              <div className={flex({ direction: "column", gap: "3" })}>
                {/* Meta */}
                <div className={flex({ direction: "column", gap: "1" })}>
                  <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                    <span className={css({ fontWeight: "medium" })}>From:</span> {detail.from}
                  </span>
                  <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                    <span className={css({ fontWeight: "medium" })}>To:</span> {detail.to.join(", ")}
                  </span>
                  {detail.cc && detail.cc.length > 0 && (
                    <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                      <span className={css({ fontWeight: "medium" })}>CC:</span> {detail.cc.join(", ")}
                    </span>
                  )}
                  <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                    <span className={css({ fontWeight: "medium" })}>Sent:</span>{" "}
                    {new Date(detail.createdAt).toLocaleString()}
                  </span>
                  {detail.lastEvent && (
                    <div className={flex({ align: "center", gap: "2" })}>
                      <span className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium" })}>Status:</span>
                      <span
                        className={css({
                          fontSize: "xs",
                          px: "2",
                          py: "1",
                          border: "1px solid",
                          borderColor: detail.lastEvent === "delivered" ? "status.positive" : detail.lastEvent === "bounced" ? "red.9" : detail.lastEvent === "opened" ? "teal.9" : "blue.9",
                          color: detail.lastEvent === "delivered" ? "status.positive" : detail.lastEvent === "bounced" ? "red.9" : detail.lastEvent === "opened" ? "teal.9" : "blue.9",
                          bg: detail.lastEvent === "delivered" ? "status.positiveDim" : detail.lastEvent === "bounced" ? "red.3" : detail.lastEvent === "opened" ? "teal.3" : "blue.3",
                        })}
                      >
                        {detail.lastEvent}
                      </span>
                    </div>
                  )}
                </div>

                <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

                {/* Body */}
                {detail.text ? (
                  <div
                    style={{
                      background: "var(--gray-2)",
                      borderRadius: 0,
                      padding: "var(--space-4)",
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      maxHeight: 400,
                      overflow: "auto",
                    }}
                  >
                    <span className={css({ fontSize: "sm" })}>{detail.text}</span>
                  </div>
                ) : (
                  <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>No body content.</span>
                )}
              </div>
            ) : (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.9", bg: "red.3" })}>
                <div className={css({ flexShrink: 0 })}><ExclamationTriangleIcon /></div>
                <span>Failed to load email from Resend.</span>
              </div>
            )}

            <div className={flex({ justify: "end", mt: "4" })}>
              <button className={button({ variant: "ghost" })} onClick={() => setOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ContactDetailClient({ contactId }: { contactId: number }) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, refetch } = useGetContactQuery({
    variables: { id: contactId },
    skip: !contactId || isNaN(contactId) || !isAdmin,
  });

  const contact = data?.contact;

  const {
    data: emailsData,
    loading: emailsLoading,
    refetch: refetchEmails,
  } = useGetContactEmailsQuery({
    variables: { contactId },
    skip: !contactId || isNaN(contactId) || !isAdmin,
  });

  const [findEmail, { loading: finding }] = useFindContactEmailMutation();
  const [findResult, setFindResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  if (!isAdmin) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "red.9", bg: "red.3" })}>
          <div className={css({ flexShrink: 0 })}><ExclamationTriangleIcon /></div>
          <span>Access denied. Admin only.</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={flex({ justify: "center" })}>
          <div className={css({ w: "16px", h: "16px", border: "2px solid", borderColor: "ui.border", borderTopColor: "accent.primary", borderRadius: "50%", animation: "spin 0.6s linear infinite" })} />
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "ui.border", bg: "ui.surface" })}>
          <div className={css({ flexShrink: 0 })}><InfoCircledIcon /></div>
          <span>Contact not found.</span>
        </div>
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`.trim();

  return (
    <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: { base: "4", md: "6" } })}>
      <div className={flex({ direction: "column", gap: "5" })}>
        {/* Back link */}
        <div>
          <Link href="/contacts" style={{ textDecoration: "none" }}>
            <div className={flex({ align: "center", gap: "1", mb: "3" })}>
              <ArrowLeftIcon />
              <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                All contacts
              </span>
            </div>
          </Link>

          <div className={flex({ align: "center", justify: "space-between", wrap: "wrap", gap: "3" })}>
            <div className={flex({ align: "center", gap: "3", wrap: "wrap" })}>
              <h1 className={css({ fontSize: "2xl", fontWeight: "bold", color: "ui.heading" })}>{fullName}</h1>
              {contact.emailVerified && (
                <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                  verified
                </span>
              )}
              {contact.doNotContact && (
                <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "red.9", color: "red.9", bg: "red.3" })}>
                  do not contact
                </span>
              )}
            </div>

            {/* Header actions */}
            <div className={flex({ gap: "2", wrap: "wrap" })}>
              <EditContactDialog contact={contact} onUpdated={() => refetch()} />
              <DeleteContactDialog
                contactId={contact.id}
                contactName={fullName}
                onDeleted={() => router.push("/contacts")}
              />
            </div>
          </div>
        </div>

        {/* Find email result */}
        {findResult && (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: findResult.type === "success" ? "status.positive" : "red.9", bg: findResult.type === "success" ? "status.positiveDim" : "red.3" })}>
            <div className={css({ flexShrink: 0 })}><InfoCircledIcon /></div>
            <span>{findResult.message}</span>
          </div>
        )}

        {/* Main info card */}
        <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
          <div className={css({ p: "4" })}>
            <div className={flex({ direction: "column", gap: "4" })}>
              {/* Position & Company */}
              {(contact.position || contact.company) && (
                <div>
                  <span className={css({ fontSize: "sm", color: "ui.tertiary", fontWeight: "medium" })}>
                    Role
                  </span>
                  <p className={css({ fontSize: "md", mt: "1" })}>
                    {contact.position}
                    {contact.position && contact.company && " at "}
                    {contact.companyId ? (
                      <Link href={`/companies/${contact.companyId}`} className={css({ color: "accent.primary", textDecoration: "underline" })}>
                        {contact.company}
                      </Link>
                    ) : (
                      contact.company
                    )}
                  </p>
                </div>
              )}

              <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

              {/* Primary email */}
              <div>
                <span className={css({ fontSize: "sm", color: "ui.tertiary", fontWeight: "medium" })}>
                  Email
                </span>
                {contact.email ? (
                  <div className={flex({ align: "center", gap: "2", mt: "1" })}>
                    <EnvelopeClosedIcon />
                    <a href={`mailto:${contact.email}`} className={css({ color: "accent.primary", textDecoration: "underline", fontSize: "md" })}>
                      {contact.email}
                    </a>
                    {contact.emailVerified && (
                      <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                        verified
                      </span>
                    )}
                    {!contact.emailVerified && contact.nbResult && (
                      <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "orange.9", color: "orange.9", bg: "orange.3" })}>
                        {contact.nbResult}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className={flex({ align: "center", gap: "3", mt: "1" })}>
                    <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                      No email
                    </span>
                    <button
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={handleFindEmail}
                      disabled={finding}
                    >
                      {finding ? (
                        <div className={css({ w: "12px", h: "12px", border: "2px solid", borderColor: "ui.border", borderTopColor: "accent.primary", borderRadius: "50%", animation: "spin 0.6s linear infinite" })} />
                      ) : (
                        <MagnifyingGlassIcon />
                      )}
                      Find email
                    </button>
                  </div>
                )}
              </div>

              {/* Additional emails */}
              {contact.emails && contact.emails.length > 0 && (
                <div>
                  <span className={css({ fontSize: "sm", color: "ui.tertiary", fontWeight: "medium" })}>
                    Additional emails
                  </span>
                  <div className={flex({ direction: "column", gap: "1", mt: "1" })}>
                    {contact.emails.map((email) => (
                      <a key={email} href={`mailto:${email}`} className={css({ color: "accent.primary", textDecoration: "underline", fontSize: "sm" })}>
                        {email}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Bounced emails */}
              {contact.bouncedEmails && contact.bouncedEmails.length > 0 && (
                <div>
                  <span className={css({ fontSize: "sm", color: "ui.tertiary", fontWeight: "medium" })}>
                    Bounced emails
                  </span>
                  <div className={flex({ direction: "column", gap: "1", mt: "1" })}>
                    {contact.bouncedEmails.map((email) => (
                      <span key={email} className={css({ fontSize: "sm", color: "red.9" })}>
                        {email}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* NeverBounce details */}
              {(contact.nbStatus || (contact.nbFlags && contact.nbFlags.length > 0) || contact.nbSuggestedCorrection) && (
                <div>
                  <span className={css({ fontSize: "sm", color: "ui.tertiary", fontWeight: "medium" })}>
                    NeverBounce
                  </span>
                  <div className={flex({ direction: "column", gap: "1", mt: "1" })}>
                    {contact.nbStatus && (
                      <span className={css({ fontSize: "sm" })}>
                        Status:{" "}
                        <span
                          className={css({
                            fontSize: "xs",
                            px: "2",
                            py: "1",
                            border: "1px solid",
                            borderColor: contact.nbStatus === "valid" ? "status.positive" : contact.nbStatus === "invalid" ? "red.9" : "orange.9",
                            color: contact.nbStatus === "valid" ? "status.positive" : contact.nbStatus === "invalid" ? "red.9" : "orange.9",
                            bg: contact.nbStatus === "valid" ? "status.positiveDim" : contact.nbStatus === "invalid" ? "red.3" : "orange.3",
                          })}
                        >
                          {contact.nbStatus}
                        </span>
                      </span>
                    )}
                    {contact.nbFlags && contact.nbFlags.length > 0 && (
                      <div className={flex({ gap: "1", wrap: "wrap" })}>
                        {contact.nbFlags.map((flag) => (
                          <span key={flag} className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" })}>
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                    {contact.nbSuggestedCorrection && (
                      <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                        Suggested:{" "}
                        <a href={`mailto:${contact.nbSuggestedCorrection}`} className={css({ color: "accent.primary", textDecoration: "underline", fontSize: "sm" })}>
                          {contact.nbSuggestedCorrection}
                        </a>
                      </span>
                    )}
                  </div>
                </div>
              )}

              <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

              {/* Social links */}
              <div>
                <span className={css({ fontSize: "sm", color: "ui.tertiary", fontWeight: "medium" })}>
                  Links
                </span>
                <div className={flex({ gap: "4", mt: "2", wrap: "wrap" })}>
                  {contact.linkedinUrl && (
                    <div className={flex({ align: "center", gap: "1" })}>
                      <LinkedInLogoIcon />
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css({ color: "accent.primary", textDecoration: "underline", fontSize: "sm" })}
                      >
                        LinkedIn
                        <ExternalLinkIcon style={{ marginLeft: 4, display: "inline" }} />
                      </a>
                    </div>
                  )}
                  {contact.githubHandle && (
                    <div className={flex({ align: "center", gap: "1" })}>
                      <GitHubLogoIcon />
                      <a
                        href={`https://github.com/${contact.githubHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css({ color: "accent.primary", textDecoration: "underline", fontSize: "sm" })}
                      >
                        {contact.githubHandle}
                      </a>
                    </div>
                  )}
                  {contact.telegramHandle && (
                    <div className={flex({ align: "center", gap: "1" })}>
                      <a
                        href={`https://t.me/${contact.telegramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={css({ color: "accent.primary", textDecoration: "underline", fontSize: "sm" })}
                      >
                        @{contact.telegramHandle}
                      </a>
                    </div>
                  )}
                  {!contact.linkedinUrl && !contact.githubHandle && !contact.telegramHandle && (
                    <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                      No links
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <>
                  <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />
                  <div>
                    <span className={css({ fontSize: "sm", color: "ui.tertiary", fontWeight: "medium" })}>
                      Tags
                    </span>
                    <div className={flex({ gap: "1", mt: "2", wrap: "wrap" })}>
                      {contact.tags.map((tag) => (
                        <span key={tag} className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "blue.9", color: "blue.9", bg: "blue.3" })}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

              {/* Metadata */}
              <div className={flex({ gap: "4", wrap: "wrap" })}>
                <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                  Created: {new Date(contact.createdAt).toLocaleDateString()}
                </span>
                <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                  Updated: {new Date(contact.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom actions */}
        <div className={flex({ gap: "2", wrap: "wrap" })}>
          {contact.email && (
            <a href={`mailto:${contact.email}`} className={button({ variant: "ghost", size: "md" })}>
              <EnvelopeClosedIcon />
              Send email
            </a>
          )}
          {!contact.email && (
            <button className={button({ variant: "ghost", size: "md" })} onClick={handleFindEmail} disabled={finding}>
              {finding ? (
                <div className={css({ w: "12px", h: "12px", border: "2px solid", borderColor: "ui.border", borderTopColor: "accent.primary", borderRadius: "50%", animation: "spin 0.6s linear infinite" })} />
              ) : (
                <MagnifyingGlassIcon />
              )}
              Find email
            </button>
          )}
          <GenerateEmailDialog contact={contact} onSent={() => refetchEmails()} />
        </div>

        {/* Email History */}
        <div>
          <div className={flex({ align: "center", justify: "space-between", mb: "3" })}>
            <h2 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading" })}>Email history</h2>
            {emailsData?.contactEmails && emailsData.contactEmails.length > 0 && (
              <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "blue.9", color: "blue.9", bg: "blue.3" })}>
                {emailsData.contactEmails.length}
              </span>
            )}
          </div>

          {emailsLoading ? (
            <div className={flex({ justify: "center", py: "4" })}>
              <div className={css({ w: "14px", h: "14px", border: "2px solid", borderColor: "ui.border", borderTopColor: "accent.primary", borderRadius: "50%", animation: "spin 0.6s linear infinite" })} />
            </div>
          ) : !emailsData?.contactEmails || emailsData.contactEmails.length === 0 ? (
            <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>No emails sent yet.</span>
          ) : (
            <div className={flex({ direction: "column", gap: "2" })}>
              {emailsData.contactEmails.map((email) => (
                <EmailDetailDialog key={email.id} email={email} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
