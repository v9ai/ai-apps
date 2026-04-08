"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  useGetCompanyQuery,
  useGetContactsQuery,
  useGetCompanyContactEmailsQuery,
  useImportContactsMutation,
  useFindContactEmailMutation,
  useFindCompanyEmailsMutation,
  useApplyEmailPatternMutation,
  useCreateContactMutation,
  useDeleteContactMutation,
  useUnverifyCompanyContactsMutation,
  useMergeDuplicateContactsMutation,
  useScoreContactsMlMutation,
  useCreateReminderMutation,
  useComputeNextTouchScoresMutation,
  useDueRemindersQuery,
  useUpdateContactMutation,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useStreamingEmail } from "@/hooks/useStreamingEmail";
import type { GetContactsQuery } from "@/__generated__/hooks";
import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowLeftIcon,
  CalendarIcon,
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
  PlusIcon,
  TrashIcon,
  UpdateIcon,
  ClockIcon,
} from "@radix-ui/react-icons";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";
import { GenerateAndSendBatchEmailModal } from "@/components/admin/GenerateAndSendBatchEmailModal";
import { FollowUpModal } from "@/components/admin/FollowUpModal";
import { useStreamingEmailScheduler } from "@/hooks/useStreamingEmailScheduler";

type Contact = NonNullable<
  GetContactsQuery["contacts"]["contacts"]
>[number];

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

/** Map seniority tier to badge style */
function seniorityBadgeStyle(
  seniority: string | null | undefined,
): { color: string; borderColor: string } {
  switch (seniority) {
    case "C-level":
    case "Founder":
      return { color: "status.negative", borderColor: "status.negative" };
    case "Partner":
    case "VP":
      return { color: "status.warning", borderColor: "status.warning" };
    case "Director":
      return { color: "status.warning", borderColor: "status.warning" };
    case "Manager":
      return { color: "accent.primary", borderColor: "accent.primary" };
    default:
      return { color: "ui.secondary", borderColor: "ui.border" };
  }
}

function parseLinkedInHTML(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const contacts: Array<{ name: string; title: string; profileUrl: string }> =
    [];

  const cards = doc.querySelectorAll(
    "li.org-people-profile-card__profile-card-spacing",
  );

  cards.forEach((card) => {
    const nameElement = card.querySelector(
      ".artdeco-entity-lockup__title .lt-line-clamp",
    );
    const name = nameElement?.textContent?.trim() || "";

    const profileLink = card.querySelector('a[href*="/in/"]');
    let profileUrl = profileLink?.getAttribute("href") || "";
    if (profileUrl) {
      profileUrl = profileUrl.split("?")[0];
      if (!profileUrl.startsWith("http")) {
        profileUrl = `https://www.linkedin.com${profileUrl}`;
      }
    }

    const titleElement = card.querySelector(
      ".artdeco-entity-lockup__subtitle .lt-line-clamp",
    );
    const title = titleElement?.textContent?.trim() || "";

    if (name && profileUrl && name !== "LinkedIn Member") {
      contacts.push({ name, title, profileUrl });
    }
  });

  return contacts;
}

function GenerateEmailDialog({
  contact,
  companyName,
}: {
  contact: Contact;
  companyName: string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [copied, setCopied] = useState(false);
  const { content, partialContent, isStreaming, error, generate, stop, reset } =
    useStreamingEmail();

  const recipientName = `${contact.firstName} ${contact.lastName}`.trim();

  const handleOpen = (val: boolean) => {
    setOpen(val);
    if (!val) {
      reset();
      setInstructions("");
      setCopied(false);
    }
  };

  const handleGenerate = async () => {
    await generate({
      recipientName,
      companyName: companyName ?? undefined,
      recipientContext: contact.position ?? undefined,
      instructions: instructions || undefined,
    });
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(
      `Subject: ${content.subject}\n\n${content.body}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={() => handleOpen(true)}
      >
        <MagicWandIcon />
        Draft email
      </button>

      {open && (
        <div
          className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" })}
          onClick={() => handleOpen(false)}
        >
          <div
            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "540px", width: "90%", maxHeight: "85vh", overflowY: "auto" })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>Draft email to {recipientName}</h3>
            {companyName && (
              <p className={css({ fontSize: "sm", color: "ui.secondary", mb: "4" })}>
                {contact.position ? `${contact.position} \u00b7 ` : ""}
                {companyName}
              </p>
            )}

            <div className={flex({ direction: "column", gap: "3" })}>
              <textarea
                className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "2", width: "100%", outline: "none", resize: "vertical", minHeight: "80px", fontSize: "sm", _focus: { borderColor: "accent.primary" }, _placeholder: { color: "ui.tertiary" } })}
                placeholder="Special instructions (optional) \u2014 e.g. mention their recent open source work\u2026"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={3}
                disabled={isStreaming}
              />

              <div className={flex({ gap: "2" })}>
                <button
                  className={button({ variant: "ghost" })}
                  onClick={handleGenerate}
                  disabled={isStreaming}
                >
                  <MagicWandIcon />
                  {isStreaming ? "Generating\u2026" : "Generate"}
                </button>
                {isStreaming && (
                  <button className={button({ variant: "ghost" })} onClick={stop}>
                    Stop
                  </button>
                )}
                {content && !isStreaming && (
                  <button className={button({ variant: "ghost" })} onClick={reset}>
                    Regenerate
                  </button>
                )}
              </div>

              {error && (
                <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "status.negative" })}>
                  <div className={css({ flexShrink: 0 })}>
                    <ExclamationTriangleIcon />
                  </div>
                  <span>{error}</span>
                </div>
              )}

              {isStreaming && partialContent && (
                <div>
                  <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>
                    Streaming\u2026
                  </p>
                  <div className={css({ overflowY: "auto", maxHeight: "200px" })}>
                    <code
                      className={css({ fontFamily: "mono", fontSize: "xs", bg: "ui.surfaceRaised", px: "1" })}
                      style={{
                        display: "block",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {partialContent}
                    </code>
                  </div>
                </div>
              )}

              {content && !isStreaming && (
                <div
                  className={css({ p: "3" })}
                  style={{
                    background: "var(--green-2)",
                  }}
                >
                  <div className={flex({ justify: "space-between", align: "center" })} style={{ marginBottom: "8px" }}>
                    <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                      <CheckIcon style={{ display: "inline", verticalAlign: "middle" }} />
                      Generated
                    </span>
                    <button className={button({ variant: "ghost", size: "sm" })} onClick={handleCopy}>
                      <CopyIcon />
                      {copied ? "Copied!" : "Copy"}
                    </button>
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
              )}
            </div>

            <div className={flex({ justify: "flex-end" })} style={{ marginTop: "16px" }}>
              <button className={button({ variant: "ghost" })} onClick={() => handleOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FindEmailButton({
  contact,
  onFound,
}: {
  contact: Contact;
  onFound: () => void;
}) {
  const [findEmail, { loading }] = useFindContactEmailMutation();
  const [result, setResult] = useState<string | null>(null);

  const handleClick = useCallback(async () => {
    setResult(null);
    const { data } = await findEmail({ variables: { contactId: contact.id } });
    const res = data?.findContactEmail;
    if (res?.emailFound && res.email) {
      setResult(`Found: ${res.email}`);
      onFound();
    } else {
      setResult(res?.message ?? "No email found");
    }
  }, [findEmail, contact.id, onFound]);

  if (contact.emailVerified) return null;

  return (
    <div className={flex({ direction: "column", align: "flex-end", gap: "1" })}>
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? <Spinner size={12} /> : <MagnifyingGlassIcon />}
        Find email
      </button>
      {result && (
        <span className={css({ fontSize: "xs", color: "ui.tertiary", maxWidth: "180px", textAlign: "right" })}>
          {result}
        </span>
      )}
    </div>
  );
}

function CreateContactDialog({
  companyId,
  companyName,
  onCreated,
}: {
  companyId: number;
  companyName: string | null | undefined;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    linkedinUrl: "",
    tags: "",
  });
  const [createContact, { loading }] = useCreateContactMutation();
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setForm({ firstName: "", lastName: "", email: "", position: "", linkedinUrl: "", tags: "" });
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
      await createContact({
        variables: {
          input: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim() || undefined,
            email: form.email.trim() || undefined,
            position: form.position.trim() || undefined,
            linkedinUrl: form.linkedinUrl.trim() || undefined,
            tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
            companyId,
          },
        },
      });
      setOpen(false);
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create contact.");
    }
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

  return (
    <>
      <button
        className={button({ variant: "solid", size: "md" })}
        onClick={() => handleOpenChange(true)}
      >
        <PlusIcon />
        Add contact
      </button>

      {open && (
        <div
          className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" })}
          onClick={() => handleOpenChange(false)}
        >
          <div
            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "440px", width: "90%" })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>Add contact</h3>
            {companyName && (
              <p className={css({ fontSize: "sm", color: "ui.secondary", mb: "4" })}>
                {companyName}
              </p>
            )}

            <div className={flex({ direction: "column", gap: "3" })}>
              {error && (
                <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "status.negative" })}>
                  <div className={css({ flexShrink: 0 })}>
                    <ExclamationTriangleIcon />
                  </div>
                  <span>{error}</span>
                </div>
              )}

              <div className={flex({ gap: "2" })}>
                <div style={{ flex: 1 }}>
                  <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>First name *</p>
                  <input
                    className={inputStyle}
                    placeholder="First name"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>Last name</p>
                  <input
                    className={inputStyle}
                    placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>Position</p>
                <input
                  className={inputStyle}
                  placeholder="e.g. Engineering Manager"
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                />
              </div>

              <div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>Email</p>
                <input
                  className={inputStyle}
                  type="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>

              <div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>LinkedIn URL</p>
                <input
                  className={inputStyle}
                  placeholder="https://linkedin.com/in/\u2026"
                  value={form.linkedinUrl}
                  onChange={(e) => setForm((f) => ({ ...f, linkedinUrl: e.target.value }))}
                />
              </div>

              <div>
                <p className={css({ fontSize: "xs", color: "ui.tertiary", mb: "1" })}>Tags (comma-separated)</p>
                <input
                  className={inputStyle}
                  placeholder="friend, vip, client"
                  value={form.tags}
                  onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                />
              </div>
            </div>

            <div className={flex({ gap: "3", justify: "flex-end" })} style={{ marginTop: "16px" }}>
              <button className={button({ variant: "ghost" })} onClick={() => handleOpenChange(false)}>Cancel</button>
              <button className={button({ variant: "ghost" })} onClick={handleSubmit} disabled={loading}>
                {loading ? "Saving\u2026" : "Create contact"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DeleteContactButton({
  contact,
  onDeleted,
}: {
  contact: Contact;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleteContact, { loading }] = useDeleteContactMutation();

  const handleDelete = useCallback(async () => {
    const { data } = await deleteContact({ variables: { id: contact.id } });
    if (data?.deleteContact?.success) {
      setOpen(false);
      onDeleted();
    }
  }, [deleteContact, contact.id, onDeleted]);

  return (
    <>
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={() => setOpen(true)}
      >
        <TrashIcon />
        Remove
      </button>

      {open && (
        <div
          className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" })}
          onClick={() => setOpen(false)}
        >
          <div
            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "400px", width: "90%" })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>Remove contact</h3>
            <p className={css({ fontSize: "sm", color: "ui.secondary" })}>
              Remove {contact.firstName} {contact.lastName}? This cannot be undone.
            </p>
            <div className={flex({ gap: "3", justify: "flex-end" })} style={{ marginTop: "16px" }}>
              <button className={button({ variant: "ghost" })} onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button className={button({ variant: "ghost" })} onClick={handleDelete} disabled={loading}>
                {loading ? "Removing\u2026" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CompanyContactsClient({
  companyKey,
}: {
  companyKey: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [batchEmailOpen, setBatchEmailOpen] = useState(false);
  const [generateBatchOpen, setGenerateBatchOpen] = useState(false);
  const [linkedinHtml, setLinkedinHtml] = useState("");
  const [importStatus, setImportStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [emailDiscoveryStatus, setEmailDiscoveryStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [linkedinPeopleStatus, setLinkedinPeopleStatus] = useState<{
    type: "idle" | "running" | "done" | "error";
    message?: string;
  }>({ type: "idle" });
  const { isStreaming, progress, completion, error: schedulerError, scheduleEmails, reset: resetScheduler } = useStreamingEmailScheduler();

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const { data, loading, error: contactsError, refetch } = useGetContactsQuery({
    variables: {
      companyId: company?.id ?? 0,
      search: debouncedSearch || undefined,
      limit: 100,
    },
    skip: !isAdmin || !company?.id,
    fetchPolicy: "cache-and-network",
  });

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [importContacts, { loading: importing }] = useImportContactsMutation();
  const [findCompanyEmails, { loading: enhancing }] = useFindCompanyEmailsMutation();
  const [applyEmailPattern, { loading: applyingPattern }] = useApplyEmailPatternMutation();
  const [unverifyCompanyContacts, { loading: unverifying }] = useUnverifyCompanyContactsMutation();
  const [mergeDuplicateContacts, { loading: merging }] = useMergeDuplicateContactsMutation();
  const [scoreContactsML, { loading: scoringML }] = useScoreContactsMlMutation();
  const [computeTouchScores, { loading: computingTouch }] = useComputeNextTouchScoresMutation();
  const [createReminder] = useCreateReminderMutation();
  const [updateContact] = useUpdateContactMutation();
  const [mlScoreStatus, setMlScoreStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // Inline tag editing state
  const [editingTagContactId, setEditingTagContactId] = useState<number | null>(null);
  const [newTagValue, setNewTagValue] = useState("");
  // Local optimistic tag overrides: contactId -> tags array
  const [localTags, setLocalTags] = useState<Record<number, string[]>>({});
  // Remind dialog state
  const [remindContactId, setRemindContactId] = useState<number | null>(null);
  const [remindDate, setRemindDate] = useState("");
  const [remindNote, setRemindNote] = useState("");
  const [remindRecurrence, setRemindRecurrence] = useState("none");
  const [remindStatus, setRemindStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  // Due reminders -- loaded for overdue badges
  const { data: dueRemindersData } = useDueRemindersQuery({ skip: !isAdmin, fetchPolicy: "cache-and-network" });
  const dueContactIds = new Set(dueRemindersData?.dueReminders?.map((r) => r.contact.id) ?? []);

  // Fetch company emails for follow-up modal
  const { data: companyEmailsData, refetch: refetchEmails } = useGetCompanyContactEmailsQuery({
    variables: { companyId: company?.id ?? 0 },
    skip: !company?.id,
    fetchPolicy: "cache-and-network",
  });

  // Listen for progress/completion messages from the Chrome extension background script
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.source !== "lead-gen-bg") return;
      if (e.data.action === "peopleScrapeProgress") {
        setLinkedinPeopleStatus({ type: "running", message: e.data.message });
      } else if (e.data.action === "peopleScrapeComplete") {
        setLinkedinPeopleStatus({
          type: "done",
          message: `Imported ${e.data.imported} contact${e.data.imported !== 1 ? "s" : ""}${e.data.failed ? `, ${e.data.failed} failed` : ""}`,
        });
        void refetch();
      } else if (e.data.action === "peopleScrapeError") {
        setLinkedinPeopleStatus({ type: "error", message: e.data.error });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [refetch]);

  const handleImportContacts = useCallback(async () => {
    if (!linkedinHtml || !company) return;
    setImportStatus(null);

    const parsed = parseLinkedInHTML(linkedinHtml);
    if (parsed.length === 0) {
      setImportStatus({
        type: "error",
        message:
          "No contacts found in the HTML. Make sure you copied the LinkedIn company People page source.",
      });
      return;
    }

    try {
      const { data: result } = await importContacts({
        variables: {
          contacts: parsed.map((c) => ({
            firstName: c.name.split(" ")[0] || "",
            lastName: c.name.split(" ").slice(1).join(" ") || "",
            linkedinUrl: c.profileUrl || null,
            email: null,
            company: company.name || null,
            companyId: company.id,
            position: c.title || null,
          })),
        },
      });

      const imported = result?.importContacts?.imported ?? 0;
      const failed = result?.importContacts?.failed ?? 0;

      if (failed === 0) {
        setImportStatus({
          type: "success",
          message: `Imported ${imported} contact${imported !== 1 ? "s" : ""} successfully.`,
        });
      } else {
        setImportStatus({
          type: "error",
          message: `Imported ${imported}, failed ${failed}.`,
        });
      }

      setLinkedinHtml("");
      await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed.";
      setImportStatus({ type: "error", message: msg });
    }
  }, [linkedinHtml, importContacts, company, refetch]);

  const handleEnhanceAll = useCallback(async () => {
    if (!company) return;
    setEmailDiscoveryStatus(null);
    try {
      const { data: result } = await findCompanyEmails({
        variables: { companyId: company.id },
      });
      const res = result?.findCompanyEmails;
      if (res?.success) {
        const errSuffix = res.errors?.length
          ? ` (${res.errors.length} errors: ${res.errors.slice(0, 3).join("; ")}${res.errors.length > 3 ? "\u2026" : ""})`
          : "";
        setEmailDiscoveryStatus({ type: "success", message: res.message + errSuffix });
        await refetch();
      } else {
        setEmailDiscoveryStatus({
          type: "error",
          message: res?.message ?? "Email discovery failed",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Email discovery failed.";
      setEmailDiscoveryStatus({ type: "error", message: msg });
    }
  }, [findCompanyEmails, company, refetch]);

  const handleApplyPattern = useCallback(async () => {
    if (!company) return;
    setEmailDiscoveryStatus(null);
    try {
      const { data: result } = await applyEmailPattern({
        variables: { companyId: company.id },
      });
      const res = result?.applyEmailPattern;
      setEmailDiscoveryStatus({
        type: res?.success ? "success" : "error",
        message: res?.message ?? "Pattern application failed",
      });
      if (res?.success) await refetch();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pattern application failed.";
      setEmailDiscoveryStatus({ type: "error", message: msg });
    }
  }, [applyEmailPattern, company, refetch]);

  const handleUnverifyAll = useCallback(async () => {
    if (!company) return;
    try {
      const { data: result, errors } = await unverifyCompanyContacts({ variables: { companyId: company.id } });
      if (errors?.length) {
        setEmailDiscoveryStatus({ type: "error", message: errors[0].message });
        return;
      }
      setEmailDiscoveryStatus({ type: "success", message: `Unverified ${result?.unverifyCompanyContacts?.count ?? 0} contacts` });
      await refetch();
    } catch (err: unknown) {
      setEmailDiscoveryStatus({ type: "error", message: err instanceof Error ? err.message : "Unverify failed" });
    }
  }, [company, unverifyCompanyContacts, refetch]);

  const handleComputeTouch = useCallback(async () => {
    if (!company) return;
    setMlScoreStatus(null);
    try {
      const { data: result } = await computeTouchScores({ variables: { companyId: company.id } });
      const res = result?.computeNextTouchScores;
      setMlScoreStatus({ type: res?.success ? "success" : "error", message: res?.message ?? "Touch score computation failed" });
      if (res?.success) await refetch();
    } catch (err: unknown) {
      setMlScoreStatus({ type: "error", message: err instanceof Error ? err.message : "Touch score computation failed" });
    }
  }, [computeTouchScores, company, refetch]);

  const handleCreateReminder = useCallback(async () => {
    if (!remindContactId || !remindDate) return;
    setRemindStatus(null);
    try {
      await createReminder({
        variables: { input: { contactId: remindContactId, remindAt: remindDate, recurrence: remindRecurrence, note: remindNote || null } },
      });
      setRemindStatus({ type: "success", message: "Reminder set" });
      setRemindContactId(null);
      setRemindDate("");
      setRemindNote("");
      setRemindRecurrence("none");
    } catch (err: unknown) {
      setRemindStatus({ type: "error", message: err instanceof Error ? err.message : "Failed to set reminder" });
    }
  }, [createReminder, remindContactId, remindDate, remindNote, remindRecurrence]);

  const handleScoreML = useCallback(async () => {
    if (!company) return;
    setMlScoreStatus(null);
    try {
      const { data: result } = await scoreContactsML({
        variables: { companyId: company.id },
      });
      const res = result?.scoreContactsML;
      setMlScoreStatus({
        type: res?.success ? "success" : "error",
        message: res?.message ?? "ML scoring failed",
      });
      if (res?.success) await refetch();
    } catch (err: unknown) {
      setMlScoreStatus({ type: "error", message: err instanceof Error ? err.message : "ML scoring failed" });
    }
  }, [scoreContactsML, company, refetch]);

  // Admin guard
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

  if (contactsError) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "status.negative" })}>
          <div className={css({ flexShrink: 0 })}>
            <ExclamationTriangleIcon />
          </div>
          <span>Failed to load contacts: {contactsError.message}</span>
        </div>
      </div>
    );
  }

  // Sort by next_touch_score DESC (urgency-weighted authority score) so highest-priority contacts appear first
  const contactsList = [...(data?.contacts?.contacts ?? [])].sort(
    (a, b) => (b.nextTouchScore ?? 0) - (a.nextTouchScore ?? 0),
  );
  const totalCount = data?.contacts?.totalCount ?? 0;
  const batchEmailRecipients = contactsList
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({
      email: c.email as string,
      name: `${c.firstName} ${c.lastName}`.trim(),
    }));

  const generateBatchContacts = contactsList
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email as string,
    }));

  const tabLinkStyle = css({
    px: "4",
    py: "2",
    fontSize: "sm",
    color: "ui.tertiary",
    fontWeight: "medium",
    borderBottom: "2px solid transparent",
    borderBottomColor: "transparent",
    textDecoration: "none",
    textTransform: "lowercase",
  });

  const tabLinkActiveStyle = css({
    px: "4",
    py: "2",
    fontSize: "sm",
    color: "ui.heading",
    fontWeight: "semibold",
    borderBottom: "2px solid",
    borderBottomColor: "accent.primary",
    textDecoration: "none",
    textTransform: "lowercase",
  });

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

  return (
    <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "6" })}>
      <div className={flex({ direction: "column", gap: "5" })}>
        {/* Back link + header */}
        <div>
          <Link
            href={`/companies/${companyKey}`}
            style={{ textDecoration: "none" }}
          >
            <div className={flex({ align: "center", gap: "1" })} style={{ marginBottom: "12px" }}>
              <ArrowLeftIcon />
              <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                {company.name}
              </span>
            </div>
          </Link>

          {/* Tab navigation */}
          <div className={css({ display: "flex", borderBottom: "1px solid", borderBottomColor: "ui.border", mb: "4" })}>
            <Link href={`/companies/${companyKey}`} className={tabLinkStyle}>
              Overview
            </Link>
            <Link href={`/companies/${companyKey}/contacts`} className={tabLinkActiveStyle}>
              Contacts
            </Link>
            <Link href={`/companies/${companyKey}/emails`} className={tabLinkStyle}>
              Emails
            </Link>
          </div>
        </div>

        {/* Email discovery status */}
        {emailDiscoveryStatus && (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: emailDiscoveryStatus.type === "success" ? "status.positive" : "status.negative" })}>
            <div className={css({ flexShrink: 0 })}>
              <InfoCircledIcon />
            </div>
            <span>{emailDiscoveryStatus.message}</span>
          </div>
        )}

        {/* ML scoring status */}
        {mlScoreStatus && (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: mlScoreStatus.type === "success" ? "accent.primary" : "status.negative" })}>
            <div className={css({ flexShrink: 0 })}>
              <InfoCircledIcon />
            </div>
            <span>{mlScoreStatus.message}</span>
          </div>
        )}

        {/* Streaming scheduler progress */}
        {(isStreaming || completion || schedulerError) && (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: schedulerError ? "status.negative" : completion ? "status.positive" : "accent.primary" })}>
            <div className={css({ flexShrink: 0 })}>
              {isStreaming ? <Spinner size={12} /> : schedulerError ? <ExclamationTriangleIcon /> : <InfoCircledIcon />}
            </div>
            <span>
              {completion
                ? completion.message
                : schedulerError
                  ? schedulerError
                  : progress.length > 0
                    ? progress[progress.length - 1].message
                    : "Starting scheduler..."}
            </span>
            {(completion || schedulerError) && (
              <div className={css({ ml: "2", flexShrink: 0 })}>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={resetScheduler}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className={flex({ align: "center", justify: "space-between", gap: "3", wrap: "wrap" })}>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
            {loading
              ? "Loading\u2026"
              : `${totalCount} contact${totalCount !== 1 ? "s" : ""}`}
          </span>
          <div className={flex({ gap: "2", align: "center", wrap: "wrap" })}>
            <CreateContactDialog
              companyId={company.id}
              companyName={company.name}
              onCreated={refetch}
            />

            {/* Email discovery actions */}
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleEnhanceAll}
              disabled={enhancing || applyingPattern}
            >
              {enhancing ? <Spinner size={12} /> : <MagnifyingGlassIcon />}
              Find emails for all
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleApplyPattern}
              disabled={applyingPattern || enhancing}
            >
              {applyingPattern ? <Spinner size={12} /> : <UpdateIcon />}
              Apply pattern
            </button>

            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleUnverifyAll}
              disabled={unverifying}
            >
              {unverifying ? <Spinner size={12} /> : null}
              Unverify all
            </button>

            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleScoreML}
              disabled={scoringML}
              title="Classify each contact's seniority, department, and decision-maker status from their job title"
            >
              {scoringML ? <Spinner size={12} /> : <MagicWandIcon />}
              Score ML
            </button>

            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={handleComputeTouch}
              disabled={computingTouch}
              title="Compute next-touch urgency scores based on days since last email and authority score"
            >
              {computingTouch ? <Spinner size={12} /> : <ClockIcon />}
              Touch scores
            </button>

            <button
              className={button({ variant: "solid", size: "md" })}
              onClick={() => setGenerateBatchOpen(true)}
              disabled={batchEmailRecipients.length === 0}
            >
              <MagicWandIcon />
              Generate & Send
              {batchEmailRecipients.length > 0 && ` (${batchEmailRecipients.length})`}
            </button>
            <button
              className={button({ variant: "solid", size: "md" })}
              onClick={() => setBatchEmailOpen(true)}
              disabled={batchEmailRecipients.length === 0}
            >
              <PaperPlaneIcon />
              Send Batch Email
              {batchEmailRecipients.length > 0 && ` (${batchEmailRecipients.length})`}
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={() => company?.id && scheduleEmails(company.id)}
              disabled={isStreaming || !company?.id}
            >
              {isStreaming ? <Spinner size={12} /> : <UpdateIcon />}
              {isStreaming ? "Scheduling..." : "Schedule All"}
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={() => setFollowUpOpen(true)}
              disabled={!company?.id}
            >
              <ClockIcon />
              Follow-up
            </button>
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={async () => {
                if (!company?.id) return;
                const { data: result } = await mergeDuplicateContacts({ variables: { companyId: company.id } });
                if (result?.mergeDuplicateContacts?.success) {
                  setImportStatus({ type: "success", message: result.mergeDuplicateContacts.message });
                  await refetch();
                }
              }}
              disabled={merging}
            >
              {merging ? <Spinner size={12} /> : null}
              Merge Duplicates
            </button>

            {/* LinkedIn import */}
            <button
              className={button({ variant: "ghost", size: "md" })}
              onClick={() => setShowImport(true)}
            >
              <LinkedInLogoIcon />
              Import from LinkedIn
            </button>

            {/* One-click import via Chrome extension */}
            {company?.linkedin_url && (
              <button
                className={button({ variant: "ghost", size: "md" })}
                disabled={linkedinPeopleStatus.type === "running"}
                onClick={() => {
                  const peopleUrl =
                    company.linkedin_url!.replace(/\/?$/, "/") + "people/";
                  setLinkedinPeopleStatus({
                    type: "running",
                    message: "Opening LinkedIn\u2026",
                  });
                  window.postMessage(
                    {
                      source: "lead-gen-ext",
                      action: "importLinkedInPeople",
                      linkedinPeopleUrl: peopleUrl,
                      companyId: company.id,
                    },
                    "*",
                  );
                }}
              >
                <LinkedInLogoIcon />
                {linkedinPeopleStatus.type === "running"
                  ? (linkedinPeopleStatus.message ?? "Importing\u2026")
                  : linkedinPeopleStatus.type === "done"
                    ? linkedinPeopleStatus.message
                    : "Import People"}
              </button>
            )}
            {linkedinPeopleStatus.type === "error" && (
              <span className={css({ fontSize: "xs", color: "status.negative" })}>
                {linkedinPeopleStatus.message}
              </span>
            )}

            <div style={{ width: 240 }}>
              <div style={{ position: "relative" }}>
                <input
                  className={inputStyle}
                  placeholder="Search contacts\u2026"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                />
                <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", opacity: 0.5 }}>
                  <MagnifyingGlassIcon />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts list */}
        {!loading && contactsList.length === 0 ? (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "ui.border" })}>
            <div className={css({ flexShrink: 0 })}>
              <InfoCircledIcon />
            </div>
            <span>No contacts found.</span>
          </div>
        ) : (
          <div className={flex({ direction: "column", gap: "2" })}>
            {contactsList.map((contact) => (
              <div
                key={contact.id}
                className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", cursor: "pointer" })}
                onClick={() => router.push(`/contacts/${contact.id}`)}
              >
                <div className={css({ p: "3" })}>
                  <div className={flex({ align: "flex-start", justify: "space-between", gap: "3", wrap: "wrap" })}>
                    <div style={{ minWidth: 0 }}>
                      <div className={flex({ align: "center", gap: "2", wrap: "wrap" })}>
                        <span className={css({ fontSize: "base", fontWeight: "medium" })}>
                          {contact.firstName} {contact.lastName}
                        </span>
                        {contact.emailVerified && (
                          <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                            verified
                          </span>
                        )}
                        {contact.email && !contact.emailVerified && contact.nbResult && (
                          <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.warning", color: "status.warning" })}>
                            {contact.nbResult}
                          </span>
                        )}
                        {contact.doNotContact && (
                          <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.negative", color: "status.negative" })}>
                            do not contact
                          </span>
                        )}
                        {contact.isDecisionMaker && (
                          <span className={css({ fontSize: "xs", px: "2", py: "1", bg: "status.positive", color: "white", fontWeight: "bold" })}>
                            DM
                          </span>
                        )}
                        {dueContactIds.has(contact.id) && (
                          <span className={css({ fontSize: "xs", px: "2", py: "1", bg: "status.negative", color: "white", fontWeight: "bold" })}>
                            reminder due
                          </span>
                        )}
                        {!dueContactIds.has(contact.id) && (contact.nextTouchScore ?? 0) > 0.7 && (
                          <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.warning", color: "status.warning" })}>
                            follow up
                          </span>
                        )}
                        {contact.seniority && (() => {
                          const sStyle = seniorityBadgeStyle(contact.seniority);
                          return (
                            <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: sStyle.borderColor, color: sStyle.color })}>
                              {contact.seniority}
                            </span>
                          );
                        })()}
                        {contact.department && contact.department !== "Other" && (
                          <span className={css({ fontSize: "xs", fontWeight: "medium", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", textTransform: "lowercase" })}>
                            {contact.department}
                          </span>
                        )}
                      </div>

                      {contact.position && (
                        <p className={css({ fontSize: "sm", color: "ui.secondary", mt: "1" })}>
                          {contact.position}
                          {contact.authorityScore != null && contact.authorityScore > 0 && (
                            <span className={css({ fontSize: "xs", color: "ui.tertiary", ml: "2" })}>
                              {(contact.authorityScore * 100).toFixed(0)}%
                            </span>
                          )}
                          {contact.lastContactedAt && (
                            <span className={css({ fontSize: "xs", color: "ui.tertiary", ml: "2" })}>
                              \u00b7 last: {Math.floor((Date.now() - new Date(contact.lastContactedAt).getTime()) / 86_400_000)}d ago
                            </span>
                          )}
                        </p>
                      )}

                      <div className={flex({ gap: "3", wrap: "wrap", align: "center" })} style={{ marginTop: "8px" }}>
                        {contact.email && (
                          <div className={flex({ align: "center", gap: "1" })} onClick={(e) => e.stopPropagation()}>
                            <EnvelopeClosedIcon style={{ color: "var(--colors-ui-tertiary)" }} />
                            <a
                              href={`mailto:${contact.email}`}
                              className={css({ fontSize: "sm", color: "ui.secondary", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                            >
                              {contact.email}
                            </a>
                          </div>
                        )}
                        {contact.linkedinUrl && (
                          <div className={flex({ align: "center", gap: "1" })} onClick={(e) => e.stopPropagation()}>
                            <LinkedInLogoIcon style={{ color: "var(--colors-ui-tertiary)" }} />
                            <a
                              href={contact.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={css({ fontSize: "sm", color: "ui.secondary", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                            >
                              <span className={flex({ align: "center", gap: "1", display: "inline-flex" })}>
                                LinkedIn
                                <ExternalLinkIcon />
                              </span>
                            </a>
                          </div>
                        )}
                        {contact.githubHandle && (
                          <div className={flex({ align: "center", gap: "1" })} onClick={(e) => e.stopPropagation()}>
                            <GitHubLogoIcon style={{ color: "var(--colors-ui-tertiary)" }} />
                            <a
                              href={`https://github.com/${contact.githubHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={css({ fontSize: "sm", color: "ui.secondary", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                            >
                              {contact.githubHandle}
                            </a>
                          </div>
                        )}
                      </div>

                      <div className={flex({ gap: "1", wrap: "wrap", align: "center" })} style={{ marginTop: "8px" }} onClick={(e) => e.stopPropagation()}>
                        {(localTags[contact.id] ?? contact.tags ?? []).map((tag) => (
                          <span
                            key={tag}
                            className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", cursor: "pointer" })}
                            title="Click to remove"
                            onClick={() => {
                              const next = (localTags[contact.id] ?? contact.tags ?? []).filter((t) => t !== tag);
                              setLocalTags((prev) => ({ ...prev, [contact.id]: next }));
                              updateContact({ variables: { id: contact.id, input: { tags: next } } });
                            }}
                          >
                            {tag} \u00d7
                          </span>
                        ))}
                        {editingTagContactId === contact.id ? (
                          <input
                            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "2px 6px", fontSize: "xs", outline: "none", _focus: { borderColor: "accent.primary" } })}
                            style={{ width: 100 }}
                            autoFocus
                            placeholder="tag\u2026"
                            value={newTagValue}
                            onChange={(e) => setNewTagValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && newTagValue.trim()) {
                                const next = [...(localTags[contact.id] ?? contact.tags ?? []), newTagValue.trim()];
                                setLocalTags((prev) => ({ ...prev, [contact.id]: next }));
                                updateContact({ variables: { id: contact.id, input: { tags: next } } });
                                setNewTagValue("");
                                setEditingTagContactId(null);
                              } else if (e.key === "Escape") {
                                setNewTagValue("");
                                setEditingTagContactId(null);
                              }
                            }}
                            onBlur={() => {
                              if (newTagValue.trim()) {
                                const next = [...(localTags[contact.id] ?? contact.tags ?? []), newTagValue.trim()];
                                setLocalTags((prev) => ({ ...prev, [contact.id]: next }));
                                updateContact({ variables: { id: contact.id, input: { tags: next } } });
                              }
                              setNewTagValue("");
                              setEditingTagContactId(null);
                            }}
                          />
                        ) : (
                          <button
                            className={button({ variant: "ghost", size: "sm" })}
                            style={{ padding: "0 4px", minWidth: 0 }}
                            title="Add tag"
                            onClick={() => { setEditingTagContactId(contact.id); setNewTagValue(""); }}
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>

                    <div className={flex({ direction: "column", align: "flex-end", gap: "2" })} style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      {!contact.doNotContact && (
                        <GenerateEmailDialog
                          contact={contact}
                          companyName={company.name}
                        />
                      )}
                      {!contact.doNotContact && (
                        <FindEmailButton
                          contact={contact}
                          onFound={refetch}
                        />
                      )}
                      <button
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={(e) => { e.stopPropagation(); setRemindContactId(contact.id); setRemindDate(""); setRemindNote(""); setRemindRecurrence("none"); setRemindStatus(null); }}
                        title="Set a reminder for this contact"
                      >
                        <CalendarIcon />
                        Remind
                      </button>
                      <DeleteContactButton
                        contact={contact}
                        onDeleted={refetch}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* LinkedIn import dialog */}
      {showImport && (
        <div
          className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" })}
          onClick={() => { setShowImport(false); setLinkedinHtml(""); setImportStatus(null); }}
        >
          <div
            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "520px", width: "90%" })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>Import LinkedIn contacts</h3>
            <p className={css({ fontSize: "sm", color: "ui.secondary", mb: "4" })}>
              Go to the company&apos;s LinkedIn page &rarr; People tab &rarr;
              right-click &rarr; View Page Source &rarr; copy all HTML &rarr; paste below.
            </p>

            {importStatus && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: importStatus.type === "success" ? "status.positive" : "status.negative", mb: "3" })}>
                <div className={css({ flexShrink: 0 })}>
                  <InfoCircledIcon />
                </div>
                <span>{importStatus.message}</span>
              </div>
            )}

            <textarea
              className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "2", width: "100%", outline: "none", resize: "vertical", minHeight: "120px", fontSize: "xs", _focus: { borderColor: "accent.primary" }, _placeholder: { color: "ui.tertiary" } })}
              placeholder="Paste LinkedIn page HTML here\u2026"
              value={linkedinHtml}
              onChange={(e) => setLinkedinHtml(e.target.value)}
              rows={12}
            />

            <div className={flex({ gap: "3", justify: "flex-end" })} style={{ marginTop: "16px" }}>
              <button className={button({ variant: "ghost" })} onClick={() => { setShowImport(false); setLinkedinHtml(""); setImportStatus(null); }}>
                Cancel
              </button>
              <button
                className={button({ variant: "ghost" })}
                onClick={handleImportContacts}
                disabled={!linkedinHtml.trim() || importing}
              >
                {importing ? "Importing\u2026" : "Import contacts"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Set Reminder dialog */}
      {remindContactId !== null && (
        <div
          className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" })}
          onClick={() => setRemindContactId(null)}
        >
          <div
            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "400px", width: "90%" })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>Set reminder</h3>
            <p className={css({ fontSize: "sm", color: "ui.secondary", mb: "4" })}>
              Choose when to follow up with this contact.
            </p>

            {remindStatus && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: remindStatus.type === "success" ? "status.positive" : "status.negative", mb: "3" })}>
                <div className={css({ flexShrink: 0 })}>
                  <InfoCircledIcon />
                </div>
                <span>{remindStatus.message}</span>
              </div>
            )}

            <div className={flex({ direction: "column", gap: "3" })}>
              <div>
                <p className={css({ fontSize: "sm", fontWeight: "medium", mb: "1" })}>Date</p>
                <input
                  type="date"
                  value={remindDate}
                  onChange={(e) => setRemindDate(e.target.value)}
                  className={inputStyle}
                />
              </div>

              <div>
                <p className={css({ fontSize: "sm", fontWeight: "medium", mb: "1" })}>Recurrence</p>
                <select
                  value={remindRecurrence}
                  onChange={(e) => setRemindRecurrence(e.target.value)}
                  className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", fontSize: "sm", outline: "none", cursor: "pointer", width: "100%", _focus: { borderColor: "accent.primary" } })}
                >
                  <option value="none">One-time</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <p className={css({ fontSize: "sm", fontWeight: "medium", mb: "1" })}>Note (optional)</p>
                <textarea
                  className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "2", width: "100%", outline: "none", resize: "vertical", minHeight: "80px", fontSize: "xs", _focus: { borderColor: "accent.primary" }, _placeholder: { color: "ui.tertiary" } })}
                  placeholder="e.g. Follow up on proposal\u2026"
                  value={remindNote}
                  onChange={(e) => setRemindNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className={flex({ gap: "3", justify: "flex-end" })} style={{ marginTop: "16px" }}>
              <button className={button({ variant: "ghost" })} onClick={() => setRemindContactId(null)}>Cancel</button>
              <button
                className={button({ variant: "solid" })}
                onClick={handleCreateReminder}
                disabled={!remindDate}
              >
                <CalendarIcon />
                Set reminder
              </button>
            </div>
          </div>
        </div>
      )}

      <BatchEmailModal
        open={batchEmailOpen}
        onOpenChange={setBatchEmailOpen}
        recipients={batchEmailRecipients}
      />
      <GenerateAndSendBatchEmailModal
        open={generateBatchOpen}
        onOpenChange={setGenerateBatchOpen}
        companyId={company.id}
        companyName={company.name ?? undefined}
        contacts={generateBatchContacts}
        onSuccess={refetch}
      />
      <FollowUpModal
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        companyId={company.id}
        companyName={company.name ?? undefined}
        companyDescription={company.description ?? undefined}
        sentEmails={(companyEmailsData?.companyContactEmails ?? []).map((e) => ({
          id: e.id,
          resendId: e.resendId,
          recipientEmail: (e.toEmails?.[0] ?? ""),
          recipientName: e.recipientName ?? `${e.contactFirstName} ${e.contactLastName}`.trim(),
          subject: e.subject,
          sentAt: e.sentAt,
          sequenceNumber: e.sequenceNumber,
          sequenceType: e.sequenceType,
          status: e.status,
        }))}
        onSuccess={() => { refetch(); refetchEmails(); }}
      />
    </div>
  );
}
