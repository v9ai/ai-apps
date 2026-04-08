"use client";

import { useState } from "react";
import {
  useGetCompanyQuery,
  useGetContactsQuery,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
import { ComposeFromLinkedIn } from "@/components/admin/ComposeFromLinkedIn";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  LinkedInLogoIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  PersonIcon,
} from "@radix-ui/react-icons";

// --- Spinner helper ---
function Spinner({ size = 16 }: { size?: number }) {
  return (
    <div
      className={css({
        border: "2px solid",
        borderColor: "ui.border",
        borderTopColor: "accent.primary",
        borderRadius: "50%",
        animation: "spin 0.6s linear infinite",
      })}
      style={{ width: size, height: size }}
    />
  );
}

// --- Inline Compose ---

type Contact = NonNullable<
  NonNullable<ReturnType<typeof useGetContactsQuery>["data"]>["contacts"]
>["contacts"][number];

function InlineCompose({
  companyName,
  contacts,
  contactsLoading,
}: {
  companyName: string;
  contacts: Contact[];
  contactsLoading: boolean;
}) {
  const contactsWithEmail = contacts.filter((c) => c.email);

  const [selectedContactId, setSelectedContactId] = useState<string>("");
  const selectedContact = contactsWithEmail.find(
    (c) => String(c.id) === selectedContactId
  );

  const [instructions, setInstructions] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [includeResume, setIncludeResume] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [step, setStep] = useState<"select" | "edit" | "sent">("select");
  const [copied, setCopied] = useState(false);

  const {
    content,
    partialContent,
    isStreaming,
    error: streamError,
    generate,
    stop,
    reset: resetStream,
  } = useStreamingEmail();

  const handleGenerate = async () => {
    if (!selectedContact) return;
    const name =
      [selectedContact.firstName, selectedContact.lastName]
        .filter(Boolean)
        .join(" ") || "there";
    await generate({
      recipientName: name,
      companyName,
      instructions: instructions || undefined,
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
    if (!selectedContact?.email) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/emails/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContact.id,
          to: selectedContact.email,
          name:
            [selectedContact.firstName, selectedContact.lastName]
              .filter(Boolean)
              .join(" ") || undefined,
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
          message: `Sent to ${selectedContact.email}`,
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
    setSelectedContactId("");
    setInstructions("");
    setEditSubject("");
    setEditBody("");
    setIncludeResume(false);
    setSendResult(null);
    setCopied(false);
    setStep("select");
    resetStream();
  };

  const inputStyle = css({
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    color: "ui.body",
    p: "6px 10px",
    width: "100%",
    outline: "none",
    fontSize: "sm",
    _focus: { borderColor: "accent.primary" },
    _placeholder: { color: "ui.tertiary" },
  });

  if (contactsLoading) {
    return (
      <div className={flex({ justify: "center" })} style={{ padding: "24px 0" }}>
        <Spinner />
      </div>
    );
  }

  if (contactsWithEmail.length === 0) {
    return (
      <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "ui.border" })}>
        <div className={css({ flexShrink: 0 })}>
          <InfoCircledIcon />
        </div>
        <span>
          No contacts with email addresses found for this company.
        </span>
      </div>
    );
  }

  return (
    <div className={flex({ direction: "column", gap: "4" })}>
      {step === "select" && (
        <>
          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Contact
            </p>
            <select
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", fontSize: "sm", outline: "none", cursor: "pointer", width: "100%", _focus: { borderColor: "accent.primary" } })}
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
            >
              <option value="">Select a contact...</option>
              {contactsWithEmail.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {[c.firstName, c.lastName].filter(Boolean).join(" ")}
                  {c.position ? ` \u2014 ${c.position}` : ""} ({c.email})
                </option>
              ))}
            </select>
          </div>

          {selectedContact && (
            <>
              <div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
                  Instructions (optional)
                </p>
                <textarea
                  className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "2", width: "100%", outline: "none", resize: "vertical", minHeight: "80px", fontSize: "sm", _focus: { borderColor: "accent.primary" }, _placeholder: { color: "ui.tertiary" } })}
                  placeholder="E.g. mention their work on open-source, ask about remote roles..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  rows={3}
                  disabled={isStreaming}
                />
              </div>

              <div className={flex({ gap: "2" })}>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={handleGenerate}
                  disabled={isStreaming}
                >
                  <MagicWandIcon />
                  {isStreaming ? "Generating..." : "Generate Email"}
                </button>
                {isStreaming && (
                  <button className={button({ variant: "ghost" })} onClick={stop}>
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
              </div>

              {streamError && (
                <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "status.negative" })}>
                  <div className={css({ flexShrink: 0 })}>
                    <ExclamationTriangleIcon />
                  </div>
                  <span>{streamError}</span>
                </div>
              )}

              {isStreaming && partialContent && (
                <div>
                  <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
                    Streaming...
                  </p>
                  <code
                    className={css({ fontFamily: "mono", fontSize: "xs", bg: "ui.surfaceRaised", px: "1" })}
                    style={{
                      display: "block",
                      whiteSpace: "pre-wrap",
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    {partialContent}
                  </code>
                </div>
              )}

              {content && !isStreaming && (
                <>
                  <div
                    style={{
                      background: "var(--green-a2)",
                      padding: "var(--space-4)",
                      border: "1px solid var(--green-a5)",
                    }}
                  >
                    <div className={flex({ justify: "space-between", align: "center" })} style={{ marginBottom: "8px" }}>
                      <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                        <CheckIcon style={{ display: "inline", verticalAlign: "middle" }} /> Generated
                      </span>
                    </div>
                    <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold", mb: "1" })}>
                      SUBJECT
                    </p>
                    <p className={css({ fontSize: "sm", fontWeight: "medium", mb: "3" })}>
                      {content.subject}
                    </p>
                    <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "bold", mb: "1" })}>
                      BODY
                    </p>
                    <p
                      className={css({ fontSize: "sm" })}
                      style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}
                    >
                      {content.body}
                    </p>
                  </div>

                  <label className={flex({ gap: "2", align: "center" })}>
                    <input
                      type="checkbox"
                      checked={includeResume}
                      onChange={(e) =>
                        setIncludeResume(e.target.checked)
                      }
                    />
                    <span className={css({ fontSize: "sm" })}>Attach resume</span>
                  </label>

                  <div className={flex({ justify: "flex-end" })}>
                    <button className={button({ variant: "ghost" })} onClick={handleProceedToEdit}>Edit & Send</button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}

      {step === "edit" && (
        <>
          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              To
            </p>
            <input className={inputStyle} value={selectedContact?.email ?? ""} disabled />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Subject
            </p>
            <input
              className={inputStyle}
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
            />
          </div>

          <div>
            <p className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium", mb: "1" })}>
              Body
            </p>
            <textarea
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "2", width: "100%", outline: "none", resize: "vertical", minHeight: "120px", fontSize: "sm", _focus: { borderColor: "accent.primary" } })}
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              rows={12}
              style={{ fontFamily: "inherit" }}
            />
          </div>

          <label className={flex({ gap: "2", align: "center" })}>
            <input
              type="checkbox"
              checked={includeResume}
              onChange={(e) =>
                setIncludeResume(e.target.checked)
              }
            />
            <span className={css({ fontSize: "sm" })}>Attach resume</span>
          </label>

          {sendResult && (
            <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: sendResult.type === "success" ? "status.positive" : "status.negative" })}>
              <div className={css({ flexShrink: 0 })}>
                {sendResult.type === "success" ? (
                  <CheckIcon />
                ) : (
                  <ExclamationTriangleIcon />
                )}
              </div>
              <span>{sendResult.message}</span>
            </div>
          )}

          <div className={flex({ gap: "2", justify: "space-between" })}>
            <button
              className={button({ variant: "ghost" })}
              onClick={() => setStep("select")}
            >
              Back
            </button>
            <div className={flex({ gap: "2" })}>
              <button className={button({ variant: "ghost" })} onClick={handleCopy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                className={button({ variant: "ghost" })}
                onClick={handleSend}
                disabled={sending || !editSubject || !editBody}
              >
                <PaperPlaneIcon />
                Send
              </button>
            </div>
          </div>
        </>
      )}

      {step === "sent" && (
        <>
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: sendResult?.type === "success" ? "status.positive" : "status.negative" })}>
            <div className={css({ flexShrink: 0 })}>
              {sendResult?.type === "success" ? (
                <CheckIcon />
              ) : (
                <ExclamationTriangleIcon />
              )}
            </div>
            <span>
              {sendResult?.message ?? "Email sent successfully."}
            </span>
          </div>

          <button className={button({ variant: "ghost" })} onClick={handleReset}>
            Compose Another
          </button>
        </>
      )}
    </div>
  );
}

// --- Main Component ---

export function CreateEmailClient({
  companyKey,
}: {
  companyKey: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [tab, setTab] = useState<"contact" | "linkedin" | "batch">("contact");

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const { data: contactsData, loading: contactsLoading } =
    useGetContactsQuery({
      variables: { companyId: company?.id ?? 0, limit: 100 },
      skip: !company,
    });

  const contacts = contactsData?.contacts?.contacts ?? [];

  const batchRecipients = contacts
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({
      email: c.email as string,
      name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
    }));

  const [batchEmailOpen, setBatchEmailOpen] = useState(false);

  if (!isAdmin) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "status.negative" })}>
          <div className={css({ flexShrink: 0 })}>
            <ExclamationTriangleIcon />
          </div>
          <span>Access denied. Admin only.</span>
        </div>
      </div>
    );
  }

  if (companyLoading) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={flex({ justify: "center" })}>
          <Spinner size={24} />
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "ui.border" })}>
          <div className={css({ flexShrink: 0 })}>
            <InfoCircledIcon />
          </div>
          <span>Company not found.</span>
        </div>
      </div>
    );
  }

  const contactsWithEmail = contacts.filter((c) => c.email);

  const tabButtonStyle = (value: string) =>
    css({
      px: "4",
      py: "2",
      fontSize: "sm",
      color: tab === value ? "ui.heading" : "ui.tertiary",
      fontWeight: tab === value ? "semibold" : "medium",
      borderBottom: tab === value ? "2px solid" : "2px solid transparent",
      borderBottomColor: tab === value ? "accent.primary" : "transparent",
      bg: "transparent",
      cursor: "pointer",
      textTransform: "lowercase",
      border: "none",
      borderTop: "none",
      borderLeft: "none",
      borderRight: "none",
    });

  return (
    <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "6" })}>
      <div className={flex({ direction: "column", gap: "5" })}>
        {/* Header */}
        <div>
          <Link
            href={`/companies/${companyKey}/emails`}
            style={{ textDecoration: "none" }}
          >
            <div className={flex({ align: "center", gap: "1" })} style={{ marginBottom: "12px" }}>
              <ArrowLeftIcon />
              <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                Emails
              </span>
            </div>
          </Link>
          <div className={flex({ align: "center", gap: "3" })}>
            <h2 className={css({ fontSize: "2xl", fontWeight: "bold", color: "ui.heading" })}>Compose Email</h2>
            <span className={css({ fontSize: "sm", fontWeight: "medium", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary" })}>
              {company.name}
            </span>
          </div>
        </div>

        {/* Tabbed compose modes */}
        <div>
          <div className={css({ display: "flex", borderBottom: "1px solid", borderBottomColor: "ui.border" })}>
            <button onClick={() => setTab("contact")} className={tabButtonStyle("contact")}>
              <span className={flex({ align: "center", gap: "2", display: "inline-flex" })}>
                <PersonIcon />
                <span>Contact</span>
                {!contactsLoading && contactsWithEmail.length > 0 && (
                  <span className={css({ fontSize: "xs", px: "2", py: "0.5", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", minWidth: "20px", textAlign: "center" })}>
                    {contactsWithEmail.length}
                  </span>
                )}
              </span>
            </button>
            <button onClick={() => setTab("linkedin")} className={tabButtonStyle("linkedin")}>
              <span className={flex({ align: "center", gap: "2", display: "inline-flex" })}>
                <LinkedInLogoIcon />
                <span>LinkedIn</span>
              </span>
            </button>
            <button onClick={() => setTab("batch")} className={tabButtonStyle("batch")}>
              <span className={flex({ align: "center", gap: "2", display: "inline-flex" })}>
                <EnvelopeClosedIcon />
                <span>Batch</span>
                {!contactsLoading && batchRecipients.length > 0 && (
                  <span className={css({ fontSize: "xs", px: "2", py: "0.5", border: "1px solid", borderColor: "accent.border", color: "accent.primary", minWidth: "20px", textAlign: "center" })}>
                    {batchRecipients.length}
                  </span>
                )}
              </span>
            </button>
          </div>

          <div className={css({ pt: "5" })}>
            {tab === "contact" && (
              <div
                style={{
                  background: "var(--gray-a2)",
                  padding: "var(--space-5)",
                  maxWidth: 640,
                }}
              >
                <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
                  Select a contact and generate a personalized email with AI.
                </p>
                <InlineCompose
                  companyName={company.name}
                  contacts={contacts}
                  contactsLoading={contactsLoading}
                />
              </div>
            )}

            {tab === "linkedin" && (
              <div
                style={{
                  background: "var(--gray-a2)",
                  padding: "var(--space-5)",
                  maxWidth: 640,
                }}
              >
                <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
                  Extract content from a LinkedIn post and compose a personalized
                  outreach email.
                </p>
                <ComposeFromLinkedIn defaultCompanyName={company.name} />
              </div>
            )}

            {tab === "batch" && (
              <div
                style={{
                  background: "var(--gray-a2)",
                  padding: "var(--space-5)",
                  maxWidth: 640,
                }}
              >
                <p className={css({ fontSize: "sm", color: "ui.tertiary", mb: "4" })}>
                  Send a personalized email to all eligible contacts at once, with
                  optional business-day scheduling.
                </p>
                {contactsLoading ? (
                  <div className={flex({ justify: "center" })} style={{ padding: "24px 0" }}>
                    <Spinner />
                  </div>
                ) : batchRecipients.length === 0 ? (
                  <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "ui.border" })}>
                    <div className={css({ flexShrink: 0 })}>
                      <InfoCircledIcon />
                    </div>
                    <span>
                      No eligible contacts with email addresses found.
                    </span>
                  </div>
                ) : (
                  <div className={flex({ direction: "column", gap: "4" })}>
                    <div className={flex({ align: "center", gap: "2" })}>
                      <PersonIcon />
                      <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "accent.border", color: "accent.primary" })}>
                        {batchRecipients.length} recipient
                        {batchRecipients.length === 1 ? "" : "s"}
                      </span>
                      <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                        eligible (have email, not on do-not-contact list)
                      </span>
                    </div>
                    <button
                      className={button({ variant: "ghost" })}
                      onClick={() => setBatchEmailOpen(true)}
                      style={{ alignSelf: "flex-start" }}
                    >
                      <PaperPlaneIcon />
                      Compose Batch Email
                    </button>
                    <BatchEmailModal
                      open={batchEmailOpen}
                      onOpenChange={setBatchEmailOpen}
                      recipients={batchRecipients}
                      defaultUseScheduler
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
