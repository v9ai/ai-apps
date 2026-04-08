"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { css, cx } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import {
  ExternalLinkIcon,
  ReloadIcon,
  ExclamationTriangleIcon,
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
  PlusIcon,
  TrashIcon,
  RocketIcon,
  FileTextIcon,
  LinkedInLogoIcon,
  BarChartIcon,
  UpdateIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSentEmails, getReceivedEmails, getEmailSubscribers } from "./actions";
import type { EmailSubscriber } from "./actions";
import { BatchEmailModal } from "@/components/admin/BatchEmailModal";
import { ComposeFromLinkedIn } from "@/components/admin/ComposeFromLinkedIn";
import { EditCampaignDialog } from "@/components/admin/EditCampaignDialog";
import {
  useGetEmailCampaignsQuery,
  useCreateDraftCampaignMutation,
  useDeleteCampaignMutation,
  useGetEmailTemplatesQuery,
  useCreateEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
  useUpdateEmailTemplateMutation,
  useGetEmailStatsQuery,
  useSyncResendEmailsMutation,
  useGetReceivedEmailsQuery,
  useArchiveEmailMutation,
  useUnarchiveEmailMutation,
  useImportResendEmailsMutation,
} from "@/__generated__/hooks";

type SentEmail = {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
  last_event: string;
};

type ReceivedEmail = {
  id: string;
  to: string[];
  from: string;
  subject: string;
  created_at: string;
};

function statusBadgeStyles(status: string) {
  switch (status) {
    case "delivered":
      return css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" });
    case "sent":
      return css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "blue.9", color: "blue.9", bg: "blue.3" });
    case "bounced":
    case "complained":
      return css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "red.9", color: "red.9", bg: "red.3" });
    case "delivery_delayed":
      return css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "orange.9", color: "orange.9", bg: "orange.3" });
    default:
      return css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" });
  }
}

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
      <div className={flex({ direction: "column", gap: "1" })}>
        <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
          {label}
        </span>
        <span className={css({ fontSize: "xl", fontWeight: "bold" })}>
          {value}
        </span>
      </div>
    </div>
  );
}

type StatSectionProps = {
  title: string;
  stats: StatCardProps[];
};

function StatSection({ title, stats }: StatSectionProps) {
  return (
    <div>
      <div className={css({ fontSize: "sm", fontWeight: "bold", mb: "2" })}>
        {title}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "8px",
        }}
      >
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>
    </div>
  );
}

function EmailStatsDashboard() {
  const { data, loading, error, refetch } = useGetEmailStatsQuery({
    fetchPolicy: "cache-and-network",
  });

  if (loading && !data) {
    return (
      <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
        Loading stats\u2026
      </span>
    );
  }

  if (error) {
    return (
      <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
        <div className={flex({ gap: "2", align: "center" })}>
          <ExclamationTriangleIcon color="red" />
          <span className={css({ fontSize: "sm", color: "red.9" })}>
            {error.message}
          </span>
        </div>
      </div>
    );
  }

  const stats = data?.emailStats;

  if (!stats) {
    return (
      <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
        <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
          No stats available.
        </span>
      </div>
    );
  }

  return (
    <div className={flex({ direction: "column", gap: "5" })}>
      <div className={flex({ justify: "space-between", align: "center" })}>
        <h2 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading" })}>Email Statistics</h2>
        <button className={button({ variant: "ghost", size: "sm" })} onClick={() => refetch()}>
          <ReloadIcon /> Refresh
        </button>
      </div>

      <StatSection
        title="Sending"
        stats={[
          { label: "Sent today", value: stats.sentToday },
          { label: "Sent this week", value: stats.sentThisWeek },
          { label: "Sent this month", value: stats.sentThisMonth },
          { label: "Total sent", value: stats.totalSent },
        ]}
      />

      <StatSection
        title="Scheduled"
        stats={[
          { label: "Scheduled today", value: stats.scheduledToday },
          { label: "Scheduled future", value: stats.scheduledFuture },
        ]}
      />

      <StatSection
        title="Delivery"
        stats={[
          { label: "Delivered today", value: stats.deliveredToday },
          { label: "Delivered this week", value: stats.deliveredThisWeek },
          { label: "Delivered this month", value: stats.deliveredThisMonth },
        ]}
      />

      <StatSection
        title="Issues"
        stats={[
          { label: "Bounced today", value: stats.bouncedToday },
          { label: "Bounced this week", value: stats.bouncedThisWeek },
          { label: "Bounced this month", value: stats.bouncedThisMonth },
        ]}
      />

      <StatSection
        title="Engagement"
        stats={[
          { label: "Opened today", value: stats.openedToday },
          { label: "Opened this week", value: stats.openedThisWeek },
          { label: "Opened this month", value: stats.openedThisMonth },
        ]}
      />
    </div>
  );
}

function SentList() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [syncResend, { loading: syncing }] = useSyncResendEmailsMutation();
  const [importResend, { loading: importing }] = useImportResendEmailsMutation();

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getSentEmails(100);
    setEmails(result.emails as SentEmail[]);
    setError(result.error);
    setLoading(false);
  }, []);

  const handleSync = async () => {
    await syncResend();
    await load();
  };

  const handleImport = async () => {
    setImportSummary(null);
    const result = await importResend();
    const data = result.data?.importResendEmails;
    if (data) {
      if (data.error) {
        setImportSummary(`Error: ${data.error}`);
      } else {
        setImportSummary(
          `Imported ${data.newCount} new, updated ${data.updatedCount}, skipped ${data.skippedCount} (${data.totalFetched} fetched in ${data.durationMs}ms)`,
        );
      }
    }
    await load();
  };

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
        Loading\u2026
      </span>
    );
  }

  if (error) {
    return (
      <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
        <div className={flex({ gap: "2", align: "center" })}>
          <ExclamationTriangleIcon color="red" />
          <span className={css({ fontSize: "sm", color: "red.9" })}>
            {error}
          </span>
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
        <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
          No sent emails found.
        </span>
      </div>
    );
  }

  return (
    <div className={flex({ direction: "column", gap: "2" })}>
      <div className={flex({ justify: "space-between", align: "center", mb: "2" })}>
        <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" })}>
          {emails.length} emails
        </span>
        <div className={flex({ gap: "2", align: "center" })}>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleSync}
            disabled={syncing}
          >
            <UpdateIcon /> {syncing ? "Syncing\u2026" : "Sync Resend"}
          </button>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleImport}
            disabled={importing}
          >
            <ReloadIcon /> {importing ? "Importing\u2026" : "Import from Resend"}
          </button>
          <button className={button({ variant: "ghost", size: "sm" })} onClick={load}>
            <ReloadIcon /> Refresh
          </button>
        </div>
      </div>
      {importSummary && (
        <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
          {importSummary}
        </span>
      )}
      {emails.map((email) => (
        <div key={email.id} className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
          <div className={flex({ justify: "space-between", align: "start", gap: "4" })}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={flex({ gap: "2", align: "center", mb: "1", wrap: "wrap" })}>
                <EnvelopeClosedIcon />
                <span className={css({ fontSize: "sm", fontWeight: "bold", flex: "1" })}>
                  {email.subject || "(no subject)"}
                </span>
                {email.last_event && (
                  <span className={statusBadgeStyles(email.last_event)}>
                    {email.last_event}
                  </span>
                )}
              </div>
              <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                To: {email.to?.join(", ")}
              </span>
              <div className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                {new Date(email.created_at).toLocaleString()}
              </div>
            </div>
            <a
              href={`https://resend.com/emails/${email.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={button({ variant: "ghost", size: "sm" })}
              style={{ flexShrink: 0 }}
            >
              Resend <ExternalLinkIcon />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReceivedList() {
  const [showArchived, setShowArchived] = useState(false);
  const { data, loading, error, refetch } = useGetReceivedEmailsQuery({
    variables: { limit: 100, archived: showArchived },
    fetchPolicy: "cache-and-network",
  });
  const [archiveEmail] = useArchiveEmailMutation();
  const [unarchiveEmail] = useUnarchiveEmailMutation();

  const emails = data?.receivedEmails?.emails ?? [];
  const totalCount = data?.receivedEmails?.totalCount ?? 0;

  const handleArchive = async (id: number) => {
    await archiveEmail({ variables: { id } });
    refetch();
  };

  const handleUnarchive = async (id: number) => {
    await unarchiveEmail({ variables: { id } });
    refetch();
  };

  if (loading && !data) {
    return <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>Loading\u2026</span>;
  }

  if (error) {
    return (
      <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
        <div className={flex({ gap: "2", align: "center" })}>
          <ExclamationTriangleIcon color="red" />
          <span className={css({ fontSize: "sm", color: "red.9" })}>{error.message}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={flex({ direction: "column", gap: "2" })}>
      <div className={flex({ justify: "space-between", align: "center", mb: "2" })}>
        <div className={flex({ gap: "2", align: "center" })}>
          <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" })}>
            {totalCount} emails
          </span>
          <button
            className={button({ variant: showArchived ? "solid" : "ghost", size: "sm" })}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Show Inbox" : "Show Archived"}
          </button>
        </div>
        <button className={button({ variant: "ghost", size: "sm" })} onClick={() => refetch()}>
          <ReloadIcon /> Refresh
        </button>
      </div>
      {emails.length === 0 ? (
        <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
            {showArchived ? "No archived emails." : "No received emails found."}
          </span>
        </div>
      ) : (
        emails.map((email) => (
          <div key={email.id} className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
            <div className={flex({ justify: "space-between", align: "start", gap: "4" })}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className={flex({ gap: "2", align: "center", mb: "1" })}>
                  <EnvelopeOpenIcon />
                  <span className={css({ fontSize: "sm", fontWeight: "bold", flex: "1" })}>
                    {email.subject || "(no subject)"}
                  </span>
                </div>
                <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>From: {email.fromEmail}</span>
                <div className={css({ fontSize: "xs", color: "ui.tertiary" })}>
                  {new Date(email.receivedAt).toLocaleString()}
                </div>
              </div>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => showArchived ? handleUnarchive(email.id) : handleArchive(email.id)}
              >
                {showArchived ? "Unarchive" : "Archive"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const CAMPAIGN_STATUS_STYLES: Record<string, string> = {
  draft: css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" }),
  pending: css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "blue.9", color: "blue.9", bg: "blue.3" }),
  running: css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "orange.9", color: "orange.9", bg: "orange.3" }),
  completed: css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "status.positive", color: "status.positive", bg: "status.positiveDim" }),
  failed: css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "red.9", color: "red.9", bg: "red.3" }),
  stopped: css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" }),
};

function CampaignsList() {
  const { data, loading, refetch } = useGetEmailCampaignsQuery({ fetchPolicy: "cache-and-network" });
  const [createCampaign, { loading: creating }] = useCreateDraftCampaignMutation();
  const [deleteCampaign] = useDeleteCampaignMutation();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);

  const campaigns = data?.emailCampaigns?.campaigns ?? [];

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createCampaign({
      variables: { input: { name: fd.get("name") as string, fromEmail: fd.get("fromEmail") as string || undefined } },
    });
    setCreateOpen(false);
    refetch();
  }

  async function handleDelete(id: string) {
    await deleteCampaign({ variables: { id } });
    refetch();
  }

  if (loading) return <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>Loading\u2026</span>;

  return (
    <div className={flex({ direction: "column", gap: "3" })}>
      <div className={flex({ justify: "space-between", align: "center" })}>
        <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" })}>
          {campaigns.length} campaigns
        </span>
        <div>
          <button className={button({ variant: "ghost", size: "sm" })} onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New Campaign
          </button>
        </div>
      </div>

      {/* Create Campaign Modal */}
      {createOpen && (
        <div className={css({ position: "fixed", inset: "0", bg: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "50" })} onClick={() => setCreateOpen(false)}>
          <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "400px", width: "100%" })} onClick={(e) => e.stopPropagation()}>
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "3" })}>New Campaign</h3>
            <form onSubmit={handleCreate}>
              <div className={flex({ direction: "column", gap: "3" })}>
                <input className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })} name="name" placeholder="Campaign name *" required />
                <input className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })} name="fromEmail" placeholder="From email" type="email" />
                <div className={flex({ gap: "3", justify: "end", mt: "2" })}>
                  <button type="button" className={button({ variant: "ghost" })} onClick={() => setCreateOpen(false)}>Cancel</button>
                  <button className={button({ variant: "ghost" })} type="submit" disabled={creating}>{creating ? "Creating\u2026" : "Create"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>No campaigns yet.</span>
        </div>
      ) : (
        campaigns.map((c) => (
          <div key={c.id} className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
            <div className={flex({ justify: "space-between", align: "center", gap: "3" })}>
              <div style={{ flex: 1 }}>
                <div className={flex({ align: "center", gap: "2", mb: "1" })}>
                  <span className={css({ fontSize: "sm", fontWeight: "bold" })}>{c.name}</span>
                  <span className={CAMPAIGN_STATUS_STYLES[c.status] ?? CAMPAIGN_STATUS_STYLES.draft}>{c.status}</span>
                </div>
                <div className={flex({ gap: "3", wrap: "wrap" })}>
                  <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>Sent: {c.emailsSent}/{c.totalRecipients}</span>
                  {c.emailsFailed > 0 && <span className={css({ fontSize: "xs", color: "red.9" })}>Failed: {c.emailsFailed}</span>}
                  <span className={css({ fontSize: "xs", color: "ui.tertiary" })}>{new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={flex({ gap: "1" })}>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={() => setEditingCampaignId(c.id)}><Pencil1Icon /></button>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={() => handleDelete(c.id)}><TrashIcon /></button>
              </div>
            </div>
          </div>
        ))
      )}
      {editingCampaignId && (
        <EditCampaignDialog
          campaignId={editingCampaignId}
          open={!!editingCampaignId}
          onOpenChange={(open) => { if (!open) setEditingCampaignId(null); }}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}

function EmailTemplatesList() {
  const { data, loading, refetch } = useGetEmailTemplatesQuery({ fetchPolicy: "cache-and-network" });
  const [createTemplate, { loading: creating }] = useCreateEmailTemplateMutation();
  const [deleteTemplate] = useDeleteEmailTemplateMutation();
  const [updateTemplate] = useUpdateEmailTemplateMutation();
  const [createOpen, setCreateOpen] = useState(false);

  const templates = data?.emailTemplates?.templates ?? [];

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await createTemplate({
      variables: {
        input: {
          name: fd.get("name") as string,
          subject: fd.get("subject") as string || undefined,
          category: fd.get("category") as string || undefined,
          textContent: fd.get("textContent") as string || undefined,
        },
      },
    });
    setCreateOpen(false);
    refetch();
  }

  async function handleDelete(id: number) {
    await deleteTemplate({ variables: { id } });
    refetch();
  }

  async function handleToggleActive(id: number, isActive: boolean) {
    await updateTemplate({ variables: { id, input: { isActive: !isActive } } });
    refetch();
  }

  if (loading) return <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>Loading\u2026</span>;

  return (
    <div className={flex({ direction: "column", gap: "3" })}>
      <div className={flex({ justify: "space-between", align: "center" })}>
        <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", bg: "ui.surface" })}>
          {templates.length} templates
        </span>
        <div>
          <button className={button({ variant: "ghost", size: "sm" })} onClick={() => setCreateOpen(true)}>
            <PlusIcon /> New Template
          </button>
        </div>
      </div>

      {/* Create Template Modal */}
      {createOpen && (
        <div className={css({ position: "fixed", inset: "0", bg: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "50" })} onClick={() => setCreateOpen(false)}>
          <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "5", maxWidth: "500px", width: "100%" })} onClick={(e) => e.stopPropagation()}>
            <h3 className={css({ fontSize: "lg", fontWeight: "bold", color: "ui.heading", mb: "3" })}>New Email Template</h3>
            <form onSubmit={handleCreate}>
              <div className={flex({ direction: "column", gap: "3" })}>
                <input className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })} name="name" placeholder="Template name *" required />
                <input className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })} name="subject" placeholder="Subject line" />
                <input className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" } })} name="category" placeholder="Category (e.g. outreach, follow-up)" />
                <textarea className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", color: "ui.body", p: "6px 10px", width: "100%", outline: "none", _focus: { borderColor: "accent.primary" }, resize: "vertical" })} name="textContent" placeholder="Email body text" rows={6} />
                <div className={flex({ gap: "3", justify: "end", mt: "2" })}>
                  <button type="button" className={button({ variant: "ghost" })} onClick={() => setCreateOpen(false)}>Cancel</button>
                  <button className={button({ variant: "ghost" })} type="submit" disabled={creating}>{creating ? "Creating\u2026" : "Create"}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>No templates yet.</span>
        </div>
      ) : (
        templates.map((t) => (
          <div key={t.id} className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
            <div className={flex({ justify: "space-between", align: "center", gap: "3" })}>
              <div style={{ flex: 1 }}>
                <div className={flex({ align: "center", gap: "2", mb: "1" })}>
                  <span className={css({ fontSize: "sm", fontWeight: "bold" })}>{t.name}</span>
                  {t.category && <span className={css({ fontSize: "xs", fontWeight: "medium", px: "2", py: "1", border: "1px solid", borderColor: "ui.border", color: "ui.secondary", textTransform: "lowercase" })}>{t.category}</span>}
                  {!t.isActive && <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: "red.9", color: "red.9", bg: "red.3" })}>inactive</span>}
                </div>
                {t.subject && <p className={css({ fontSize: "xs", color: "ui.tertiary" })}>Subject: {t.subject}</p>}
                <p className={css({ fontSize: "xs", color: "ui.tertiary" })}>{new Date(t.createdAt).toLocaleDateString()}</p>
              </div>
              <div className={flex({ align: "center", gap: "2" })}>
                <button
                  className={cx(button({ variant: "ghost", size: "sm" }), css({ fontWeight: t.isActive ? "bold" : "normal" }))}
                  onClick={() => handleToggleActive(t.id, t.isActive)}
                >
                  {t.isActive ? "Active" : "Inactive"}
                </button>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={() => handleDelete(t.id)}><TrashIcon /></button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function EmailsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams?.get("tab") ?? "received";

  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(false);

  const handleTabChange = (value: string) => {
    router.push(`/admin/emails?tab=${value}`);
  };

  const handleOpenBatchModal = async () => {
    setLoadingSubscribers(true);
    const list = await getEmailSubscribers();
    setSubscribers(list);
    setLoadingSubscribers(false);
    setBatchModalOpen(true);
  };

  return (
    <div className={css({ maxWidth: "1100px", mx: "auto", px: "4", py: "8" })}>
      <div className={flex({ justify: "space-between", align: "center", mb: "6" })}>
        <div>
          <h1 className={css({ fontSize: "2xl", fontWeight: "bold", color: "ui.heading" })}>Emails</h1>
          <span className={css({ fontSize: "sm", color: "ui.tertiary" })}>
            Sent and received emails via Resend
          </span>
        </div>
        <div className={flex({ gap: "2", align: "center" })}>
          <button
            className={button({ variant: "solid", size: "md" })}
            onClick={handleOpenBatchModal}
            disabled={loadingSubscribers}
          >
            {loadingSubscribers ? "Loading..." : "Send Batch Email"}
          </button>
          <a
            href="https://resend.com/emails"
            target="_blank"
            rel="noopener noreferrer"
            className={button({ variant: "ghost", size: "md" })}
          >
            Resend dashboard <ExternalLinkIcon />
          </a>
        </div>
      </div>

      <BatchEmailModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        recipients={subscribers}
      />

      {/* Tab bar */}
      <div className={css({ display: "flex", borderBottom: "1px solid", borderBottomColor: "ui.border", mb: "4" })}>
        {[
          { value: "received", icon: <EnvelopeOpenIcon />, label: "Received" },
          { value: "sent", icon: <EnvelopeClosedIcon />, label: "Sent" },
          { value: "campaigns", icon: <RocketIcon />, label: "Campaigns" },
          { value: "templates", icon: <FileTextIcon />, label: "Templates" },
          { value: "compose", icon: <LinkedInLogoIcon />, label: "Compose" },
          { value: "stats", icon: <BarChartIcon />, label: "Stats" },
        ].map((t) => (
          <button
            key={t.value}
            onClick={() => handleTabChange(t.value)}
            className={css({
              px: "4",
              py: "2",
              fontSize: "sm",
              color: tab === t.value ? "ui.heading" : "ui.tertiary",
              fontWeight: tab === t.value ? "semibold" : "medium",
              borderBottom: tab === t.value ? "2px solid" : "2px solid transparent",
              borderBottomColor: tab === t.value ? "accent.primary" : "transparent",
              bg: "transparent",
              cursor: "pointer",
              textTransform: "lowercase",
              display: "flex",
              alignItems: "center",
              gap: "1",
            })}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "sent" && <div className={css({ pt: "4" })}><SentList /></div>}
      {tab === "received" && <div className={css({ pt: "4" })}><ReceivedList /></div>}
      {tab === "campaigns" && <div className={css({ pt: "4" })}><CampaignsList /></div>}
      {tab === "templates" && <div className={css({ pt: "4" })}><EmailTemplatesList /></div>}
      {tab === "compose" && <div className={css({ pt: "4" })}><ComposeFromLinkedIn /></div>}
      {tab === "stats" && <div className={css({ pt: "4" })}><EmailStatsDashboard /></div>}
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <span className={css({ color: "ui.tertiary" })}>Loading\u2026</span>
      </div>
    );
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={css({ bg: "ui.surface", border: "1px solid", borderColor: "ui.border", p: "3" })}>
          <div className={flex({ direction: "column", align: "center", gap: "4", p: "4" })}>
            <ExclamationTriangleIcon width="32" height="32" color="red" />
            <h2 className={css({ fontSize: "xl", fontWeight: "bold", color: "ui.heading" })}>Access denied</h2>
            <span className={css({ color: "ui.tertiary" })}>This page is restricted to administrators.</span>
            <Link href="/" className={button({ variant: "ghost" })}>&#8592; Back to Jobs</Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function EmailsPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
            <span className={css({ color: "ui.tertiary" })}>Loading\u2026</span>
          </div>
        }
      >
        <EmailsPageContent />
      </Suspense>
    </AdminGuard>
  );
}
