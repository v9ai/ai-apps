"use client";

import { useState } from "react";
import {
  useGetCompanyQuery,
  useGetCompanyContactEmailsQuery,
  useGetContactsQuery,
  useGetResendEmailQuery,
  useSyncResendEmailsMutation,
  useCancelCompanyEmailsMutation,
  useSendScheduledEmailNowMutation,
  useCancelScheduledEmailMutation,
} from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  InfoCircledIcon,
  MagicWandIcon,
  PaperPlaneIcon,
  PlusIcon,
  ReloadIcon,
  TrashIcon,
  UpdateIcon,
} from "@radix-ui/react-icons";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";
import { GenerateAndSendBatchEmailModal } from "@/components/admin/GenerateAndSendBatchEmailModal";

const statusBadgeStyle: Record<string, { color: string; borderColor: string; bg: string }> = {
  sent: { color: "status.positive", borderColor: "status.positive", bg: "status.positiveDim" },
  delivered: { color: "status.positive", borderColor: "status.positive", bg: "status.positiveDim" },
  opened: { color: "status.positive", borderColor: "status.positive", bg: "status.positiveDim" },
  clicked: { color: "status.positive", borderColor: "status.positive", bg: "status.positiveDim" },
  bounced: { color: "status.negative", borderColor: "status.negative", bg: "transparent" },
  complained: { color: "status.negative", borderColor: "status.negative", bg: "transparent" },
  failed: { color: "status.negative", borderColor: "status.negative", bg: "transparent" },
  queued: { color: "accent.primary", borderColor: "accent.primary", bg: "transparent" },
  scheduled: { color: "accent.primary", borderColor: "accent.primary", bg: "transparent" },
};

const defaultBadgeStyle = { color: "ui.secondary", borderColor: "ui.border", bg: "transparent" };

type StatusFilter = "all" | "delivered" | "bounced" | "sent" | "scheduled";

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

// --- Email Row Type ---

type CompanyEmailRow = {
  id: number;
  resendId: string;
  subject: string;
  fromEmail: string;
  toEmails: string[];
  status: string;
  sentAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  contactFirstName?: string | null;
  contactLastName?: string | null;
  contactPosition?: string | null;
  sequenceType?: string | null;
  sequenceNumber?: string | null;
  replyReceived?: boolean;
  followupStatus?: string | null;
};

// --- Sequence Badge ---

function SequenceBadge({
  sequenceType,
  sequenceNumber,
}: {
  sequenceType?: string | null;
  sequenceNumber?: string | null;
}) {
  if (!sequenceType && !sequenceNumber) return null;

  const label =
    sequenceType === "initial"
      ? "Initial"
      : sequenceNumber
        ? `Follow-up ${sequenceNumber}`
        : sequenceType ?? "Email";

  return (
    <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "accent.border", color: "accent.primary" })}>
      {label}
    </span>
  );
}

// --- Email Detail Dialog ---

function EmailDetailDialog({
  email,
  onRefetch,
}: {
  email: CompanyEmailRow;
  onRefetch: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [actionResult, setActionResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const { data, loading, refetch: refetchDetail } = useGetResendEmailQuery({
    variables: { resendId: email.resendId },
    skip: !open,
  });

  const [sendNow, { loading: sendingNow }] = useSendScheduledEmailNowMutation();
  const [cancelEmail, { loading: cancellingEmail }] =
    useCancelScheduledEmailMutation();

  const detail = data?.resendEmail;
  const contactName = [email.contactFirstName, email.contactLastName]
    .filter(Boolean)
    .join(" ");

  const isScheduled = email.status === "scheduled";

  async function handleSendNow() {
    setActionResult(null);
    const result = await sendNow({
      variables: { resendId: email.resendId },
    });
    const r = result.data?.sendScheduledEmailNow;
    if (r?.success) {
      setActionResult({ success: true, message: "Email sent successfully." });
      onRefetch();
      void refetchDetail();
    } else {
      setActionResult({
        success: false,
        message: r?.error ?? "Failed to send email.",
      });
    }
  }

  async function handleCancelEmail() {
    setActionResult(null);
    const result = await cancelEmail({
      variables: { resendId: email.resendId },
    });
    const r = result.data?.cancelScheduledEmail;
    if (r?.success) {
      setActionResult({ success: true, message: "Email cancelled." });
      onRefetch();
      void refetchDetail();
    } else {
      setActionResult({
        success: false,
        message: r?.error ?? "Failed to cancel email.",
      });
    }
  }

  const style = statusBadgeStyle[email.status] ?? defaultBadgeStyle;

  return (
    <>
      {/* Card trigger */}
      <div
        className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", cursor: "pointer" })}
        onClick={() => setOpen(true)}
      >
        <div className={css({ p: "3" })}>
          <div className={flex({ justify: "space-between", align: "flex-start", gap: "2", wrap: "wrap" })}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className={css({ fontSize: "sm", fontWeight: "medium", wordBreak: "break-word" })}>
                {email.subject}
              </p>
              <div className={flex({ gap: "2", align: "center", wrap: "wrap" })} style={{ marginTop: "4px" }}>
                <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                  {contactName}
                  {email.contactPosition
                    ? ` \u00b7 ${email.contactPosition}`
                    : ""}
                </span>
                {email.scheduledAt ? (
                  <span className={css({ fontSize: "xs", color: "accent.primary" })}>
                    Scheduled:{" "}
                    {new Date(email.scheduledAt).toLocaleString()}
                  </span>
                ) : (
                  <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                    {email.sentAt
                      ? new Date(email.sentAt).toLocaleString()
                      : new Date(email.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
              <div className={flex({ gap: "2", align: "center", wrap: "wrap" })} style={{ marginTop: "4px" }}>
                <SequenceBadge
                  sequenceType={email.sequenceType}
                  sequenceNumber={email.sequenceNumber}
                />
                {email.replyReceived && (
                  <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                    Replied
                  </span>
                )}
              </div>
            </div>
            <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: style.borderColor, color: style.color, bg: style.bg })}>
              {email.status}
            </span>
          </div>
        </div>
      </div>

      {/* Dialog overlay */}
      {open && (
        <div
          className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" })}
          onClick={() => setOpen(false)}
        >
          <div
            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "580px", width: "90%", maxHeight: "85vh", overflowY: "auto" })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "3" })}>{email.subject}</h3>

            {loading ? (
              <div className={flex({ justify: "center" })} style={{ padding: "24px 0" }}>
                <Spinner size={24} />
              </div>
            ) : detail ? (
              <div className={flex({ direction: "column", gap: "3" })}>
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
                  {detail.scheduledAt && (
                    <span className={css({ fontSize: "xs", color: "accent.primary" })}>
                      <span className={css({ fontWeight: "medium" })}>Scheduled for:</span>{" "}
                      {new Date(detail.scheduledAt).toLocaleString()}
                    </span>
                  )}
                  {detail.lastEvent && (
                    <div className={flex({ align: "center", gap: "2" })}>
                      <span className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium" })}>
                        Status:
                      </span>
                      {(() => {
                        const evtStyle =
                          detail.lastEvent === "delivered" ? { color: "status.positive", borderColor: "status.positive", bg: "status.positiveDim" }
                          : detail.lastEvent === "bounced" ? { color: "status.negative", borderColor: "status.negative", bg: "transparent" }
                          : detail.lastEvent === "opened" ? { color: "status.positive", borderColor: "status.positive", bg: "status.positiveDim" }
                          : { color: "accent.primary", borderColor: "accent.primary", bg: "transparent" };
                        return (
                          <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: evtStyle.borderColor, color: evtStyle.color, bg: evtStyle.bg })}>
                            {detail.lastEvent}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                  {email.replyReceived && (
                    <div className={flex({ align: "center", gap: "2" })}>
                      <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" })}>
                        Replied
                      </span>
                    </div>
                  )}
                  {(email.sequenceType || email.sequenceNumber) && (
                    <div className={flex({ align: "center", gap: "2" })}>
                      <span className={css({ fontSize: "xs", color: "ui.tertiary", fontWeight: "medium" })}>
                        Sequence:
                      </span>
                      <SequenceBadge
                        sequenceType={email.sequenceType}
                        sequenceNumber={email.sequenceNumber}
                      />
                    </div>
                  )}
                </div>

                <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />

                {detail.text ? (
                  <div
                    className={css({ bg: "ui.surfaceRaised", p: "4" })}
                    style={{
                      whiteSpace: "pre-wrap",
                      lineHeight: "1.6",
                      maxHeight: 400,
                      overflow: "auto",
                    }}
                  >
                    <span className={css({ fontSize: "sm" })}>{detail.text}</span>
                  </div>
                ) : (
                  <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
                    No body content.
                  </span>
                )}

                {/* Scheduled email actions */}
                {isScheduled && (
                  <>
                    <hr className={css({ border: "none", borderTop: "1px solid", borderTopColor: "ui.border", my: "3" })} />
                    <div className={flex({ gap: "2", wrap: "wrap" })}>
                      <button
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={handleSendNow}
                        disabled={sendingNow || cancellingEmail}
                      >
                        {sendingNow ? <Spinner size={12} /> : null}
                        Send Now
                      </button>
                      <button
                        className={button({ variant: "ghost", size: "sm" })}
                        onClick={handleCancelEmail}
                        disabled={sendingNow || cancellingEmail}
                      >
                        {cancellingEmail ? <Spinner size={12} /> : null}
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {actionResult && (
                  <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: actionResult.success ? "status.positive" : "status.negative" })}>
                    <div className={css({ flexShrink: 0 })}>
                      {actionResult.success ? (
                        <InfoCircledIcon />
                      ) : (
                        <ExclamationTriangleIcon />
                      )}
                    </div>
                    <span>{actionResult.message}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "status.negative" })}>
                <div className={css({ flexShrink: 0 })}>
                  <ExclamationTriangleIcon />
                </div>
                <span>Failed to load email from Resend.</span>
              </div>
            )}

            <div className={flex({ justify: "flex-end" })} style={{ marginTop: "16px" }}>
              <button className={button({ variant: "ghost" })} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- Cancel All Scheduled Dialog ---

function CancelAllDialog({
  companyId,
  onRefetch,
}: {
  companyId: number;
  onRefetch: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const [cancelAll, { loading }] = useCancelCompanyEmailsMutation();

  async function handleConfirm() {
    setResult(null);
    const res = await cancelAll({ variables: { companyId } });
    const r = res.data?.cancelCompanyEmails;
    if (r?.success) {
      setResult({
        success: true,
        message: `Cancelled ${r.cancelledCount} scheduled email${r.cancelledCount !== 1 ? "s" : ""}.${r.failedCount > 0 ? ` ${r.failedCount} failed.` : ""}`,
      });
      onRefetch();
    } else {
      setResult({
        success: false,
        message: r?.message ?? "Failed to cancel scheduled emails.",
      });
    }
  }

  return (
    <>
      <button
        className={button({ variant: "ghost", size: "sm" })}
        onClick={() => setOpen(true)}
      >
        <TrashIcon />
        Cancel Scheduled
      </button>

      {open && (
        <div
          className={css({ position: "fixed", inset: 0, bg: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" })}
          onClick={() => setOpen(false)}
        >
          <div
            className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "420px", width: "90%" })}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "2" })}>Cancel All Scheduled Emails?</h3>
            <p className={css({ fontSize: "sm", color: "ui.secondary", mb: "3" })}>
              This will cancel all scheduled emails for this company that have not
              yet been sent. This action cannot be undone.
            </p>

            {result && (
              <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: result.success ? "status.positive" : "status.negative", mb: "3" })}>
                <div className={css({ flexShrink: 0 })}>
                  {result.success ? (
                    <InfoCircledIcon />
                  ) : (
                    <ExclamationTriangleIcon />
                  )}
                </div>
                <span>{result.message}</span>
              </div>
            )}

            <div className={flex({ gap: "2", justify: "flex-end" })} style={{ marginTop: "16px" }}>
              <button className={button({ variant: "ghost" })} disabled={loading} onClick={() => setOpen(false)}>
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button
                  className={button({ variant: "solid" })}
                  onClick={handleConfirm}
                  disabled={loading}
                >
                  {loading ? <Spinner size={12} /> : null}
                  Confirm Cancel All
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// --- Main Component ---

export function CompanyEmailsClient({
  companyKey,
}: {
  companyKey: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const { data: companyData, loading: companyLoading } = useGetCompanyQuery({
    variables: { key: companyKey },
    skip: !isAdmin,
  });

  const company = companyData?.company ?? null;

  const {
    data: emailsData,
    loading: emailsLoading,
    error: emailsError,
    refetch: refetchEmails,
  } = useGetCompanyContactEmailsQuery({
    variables: { companyId: company?.id ?? 0 },
    skip: !company?.id || !isAdmin,
  });

  const [batchEmailOpen, setBatchEmailOpen] = useState(false);
  const [generateBatchOpen, setGenerateBatchOpen] = useState(false);

  const { data: contactsData } = useGetContactsQuery({
    variables: { companyId: company?.id ?? 0, limit: 200 },
    skip: !company?.id || !isAdmin,
  });

  const [syncResend, { loading: syncing }] = useSyncResendEmailsMutation();

  async function handleSyncResend() {
    setSyncResult(null);
    const res = await syncResend({
      variables: { companyId: company?.id ?? undefined },
    });
    const r = res.data?.syncResendEmails;
    if (r?.success) {
      setSyncResult(
        `Synced ${r.updatedCount} of ${r.totalCount} emails (${r.skippedCount} skipped).`,
      );
      void refetchEmails();
    } else {
      setSyncResult(r?.error ?? "Sync failed.");
    }
  }

  const companyEmails = emailsData?.companyContactEmails ?? [];

  const filteredEmails =
    statusFilter === "all"
      ? companyEmails
      : companyEmails.filter((e) => e.status === statusFilter);

  const scheduledCount = companyEmails.filter(
    (e) => e.status === "scheduled",
  ).length;

  const contactsList = contactsData?.contacts?.contacts ?? [];
  const batchEmailRecipients = contactsList
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({ email: c.email as string, name: `${c.firstName} ${c.lastName}`.trim() }));
  const generateBatchContacts = contactsList
    .filter((c) => c.email && !c.doNotContact)
    .map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName ?? undefined, email: c.email as string }));

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

  return (
    <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "6" })}>
      <div className={flex({ direction: "column", gap: "5" })}>
        {/* Header */}
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
            <Link href={`/companies/${companyKey}/contacts`} className={tabLinkStyle}>
              Contacts
            </Link>
            <Link href={`/companies/${companyKey}/emails`} className={tabLinkActiveStyle}>
              Emails
            </Link>
          </div>
        </div>

        {/* Toolbar */}
        <div className={flex({ align: "center", gap: "3", wrap: "wrap" })}>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
            {companyEmails.length} email
            {companyEmails.length !== 1 ? "s" : ""}
          </span>
          <Link
            href={`/companies/${companyKey}/emails/create`}
            className={button({ variant: "ghost", size: "sm" })}
          >
            <PlusIcon />
            Compose
          </Link>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleSyncResend}
            disabled={syncing}
          >
            {syncing ? <Spinner size={12} /> : <UpdateIcon />}
            Sync Resend
          </button>
          {scheduledCount > 0 && (
            <CancelAllDialog
              companyId={company.id}
              onRefetch={() => void refetchEmails()}
            />
          )}
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setGenerateBatchOpen(true)}
            disabled={generateBatchContacts.length === 0}
          >
            <MagicWandIcon />
            Generate & Send ({generateBatchContacts.length})
          </button>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={() => setBatchEmailOpen(true)}
            disabled={batchEmailRecipients.length === 0}
          >
            <PaperPlaneIcon />
            Send Batch ({batchEmailRecipients.length})
          </button>
        </div>

        {/* Sync result feedback */}
        {syncResult && (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "accent.border", bg: "accent.subtle" })}>
            <div className={css({ flexShrink: 0 })}>
              <InfoCircledIcon />
            </div>
            <span>{syncResult}</span>
          </div>
        )}

        {/* Email list */}
        {emailsError ? (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "status.negative" })}>
            <div className={css({ flexShrink: 0 })}>
              <ExclamationTriangleIcon />
            </div>
            <span>
              Failed to load emails: {emailsError.message}
            </span>
          </div>
        ) : emailsLoading ? (
          <div className={flex({ justify: "center" })}>
            <Spinner size={24} />
          </div>
        ) : companyEmails.length === 0 ? (
          <div className={css({ display: "flex", gap: "3", p: "3", border: "1px solid", borderColor: "ui.border" })}>
            <div className={css({ flexShrink: 0 })}>
              <InfoCircledIcon />
            </div>
            <span>
              No emails sent to contacts at this company yet.
            </span>
          </div>
        ) : (
          <div className={flex({ direction: "column", gap: "3" })}>
            {/* Filters */}
            <div className={flex({ align: "center", gap: "2", wrap: "wrap" })}>
              <select
                className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", fontSize: "sm", outline: "none", cursor: "pointer", _focus: { borderColor: "accent.primary" } })}
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as StatusFilter)
                }
              >
                <option value="all">All statuses</option>
                <option value="delivered">Delivered</option>
                <option value="scheduled">Scheduled</option>
                <option value="bounced">Bounced</option>
                <option value="sent">Sent</option>
              </select>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => refetchEmails()}
              >
                <ReloadIcon />
                Refresh
              </button>
              {statusFilter !== "all" && (
                <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                  {filteredEmails.length} of {companyEmails.length}
                </span>
              )}
            </div>

            {/* Email cards */}
            <div className={flex({ direction: "column", gap: "2" })}>
              {filteredEmails.map((email) => (
                <EmailDetailDialog
                  key={email.id}
                  email={{
                    id: email.id,
                    resendId: email.resendId,
                    subject: email.subject,
                    fromEmail: email.fromEmail,
                    toEmails: email.toEmails,
                    status: email.status,
                    sentAt: email.sentAt,
                    scheduledAt: email.scheduledAt,
                    createdAt: email.createdAt,
                    contactFirstName: email.contactFirstName,
                    contactLastName: email.contactLastName,
                    contactPosition: email.contactPosition,
                    sequenceType: email.sequenceType,
                    sequenceNumber: email.sequenceNumber,
                    replyReceived: email.replyReceived,
                    followupStatus: email.followupStatus,
                  }}
                  onRefetch={() => void refetchEmails()}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <BatchEmailModal open={batchEmailOpen} onOpenChange={setBatchEmailOpen} recipients={batchEmailRecipients} />
      <GenerateAndSendBatchEmailModal
        open={generateBatchOpen}
        onOpenChange={setGenerateBatchOpen}
        companyId={company.id}
        companyName={company.name ?? undefined}
        contacts={generateBatchContacts}
        onSuccess={() => void refetchEmails()}
      />
    </div>
  );
}
