"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Card,
  Container,
  Dialog,
  Flex,
  Heading,
  Spinner,
  Switch,
  Tabs,
  Text,
  TextArea,
  TextField,
} from "@radix-ui/themes";
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

function statusColor(
  status: string,
): "green" | "blue" | "red" | "orange" | "gray" {
  switch (status) {
    case "delivered":
      return "green";
    case "sent":
      return "blue";
    case "bounced":
    case "complained":
      return "red";
    case "delivery_delayed":
      return "orange";
    default:
      return "gray";
  }
}

type StatCardProps = {
  label: string;
  value: number;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card>
      <Flex direction="column" gap="1" p="1">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text size="5" weight="bold">
          {value}
        </Text>
      </Flex>
    </Card>
  );
}

type StatSectionProps = {
  title: string;
  stats: StatCardProps[];
};

function StatSection({ title, stats }: StatSectionProps) {
  return (
    <Box>
      <Text size="2" weight="bold" mb="2" as="div">
        {title}
      </Text>
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
    </Box>
  );
}

function EmailStatsDashboard() {
  const { data, loading, error, refetch } = useGetEmailStatsQuery({
    fetchPolicy: "cache-and-network",
  });

  if (loading && !data) {
    return (
      <Text color="gray" size="2">
        Loading stats…
      </Text>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex gap="2" align="center">
          <ExclamationTriangleIcon color="red" />
          <Text color="red" size="2">
            {error.message}
          </Text>
        </Flex>
      </Card>
    );
  }

  const stats = data?.emailStats;

  if (!stats) {
    return (
      <Card>
        <Text color="gray" size="2">
          No stats available.
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="5">
      <Flex justify="between" align="center">
        <Heading size="4">Email Statistics</Heading>
        <button className={button({ variant: "ghost", size: "sm" })} onClick={() => refetch()}>
          <ReloadIcon /> Refresh
        </button>
      </Flex>

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
    </Flex>
  );
}

function SentList() {
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [syncResend, { loading: syncing }] = useSyncResendEmailsMutation();
  const [importResend, { loading: importing }] = useImportResendEmailsMutation();

  const load = async () => {
    setLoading(true);
    const result = await getSentEmails(100);
    setEmails(result.emails as SentEmail[]);
    setError(result.error);
    setLoading(false);
  };

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
  }, []);

  if (loading) {
    return (
      <Text color="gray" size="2">
        Loading…
      </Text>
    );
  }

  if (error) {
    return (
      <Card>
        <Flex gap="2" align="center">
          <ExclamationTriangleIcon color="red" />
          <Text color="red" size="2">
            {error}
          </Text>
        </Flex>
      </Card>
    );
  }

  if (emails.length === 0) {
    return (
      <Card>
        <Text color="gray" size="2">
          No sent emails found.
        </Text>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center" mb="2">
        <Badge color="gray" size="2" variant="soft">
          {emails.length} emails
        </Badge>
        <Flex gap="2" align="center">
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleSync}
            disabled={syncing}
          >
            <UpdateIcon /> {syncing ? "Syncing…" : "Sync Resend"}
          </button>
          <button
            className={button({ variant: "ghost", size: "sm" })}
            onClick={handleImport}
            disabled={importing}
          >
            <ReloadIcon /> {importing ? "Importing…" : "Import from Resend"}
          </button>
          <button className={button({ variant: "ghost", size: "sm" })} onClick={load}>
            <ReloadIcon /> Refresh
          </button>
        </Flex>
      </Flex>
      {importSummary && (
        <Text size="1" color="gray">
          {importSummary}
        </Text>
      )}
      {emails.map((email) => (
        <Card key={email.id}>
          <Flex justify="between" align="start" gap="4">
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Flex gap="2" align="center" mb="1" wrap="wrap">
                <EnvelopeClosedIcon />
                <Text size="2" weight="bold" style={{ flex: 1 }}>
                  {email.subject || "(no subject)"}
                </Text>
                {email.last_event && (
                  <Badge
                    color={statusColor(email.last_event)}
                    size="1"
                    variant="soft"
                  >
                    {email.last_event}
                  </Badge>
                )}
              </Flex>
              <Text size="1" color="gray">
                To: {email.to?.join(", ")}
              </Text>
              <Text size="1" color="gray" as="div">
                {new Date(email.created_at).toLocaleString()}
              </Text>
            </Box>
            <a
              href={`https://resend.com/emails/${email.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={button({ variant: "ghost", size: "sm" })}
              style={{ flexShrink: 0 }}
            >
              Resend <ExternalLinkIcon />
            </a>
          </Flex>
        </Card>
      ))}
    </Flex>
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
    return <Text color="gray" size="2">Loading…</Text>;
  }

  if (error) {
    return (
      <Card>
        <Flex gap="2" align="center">
          <ExclamationTriangleIcon color="red" />
          <Text color="red" size="2">{error.message}</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="center" mb="2">
        <Flex gap="2" align="center">
          <Badge color="gray" size="2" variant="soft">{totalCount} emails</Badge>
          <button
            className={button({ variant: showArchived ? "solid" : "ghost", size: "sm" })}
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "Show Inbox" : "Show Archived"}
          </button>
        </Flex>
        <button className={button({ variant: "ghost", size: "sm" })} onClick={() => refetch()}>
          <ReloadIcon /> Refresh
        </button>
      </Flex>
      {emails.length === 0 ? (
        <Card>
          <Text color="gray" size="2">
            {showArchived ? "No archived emails." : "No received emails found."}
          </Text>
        </Card>
      ) : (
        emails.map((email) => (
          <Card key={email.id}>
            <Flex justify="between" align="start" gap="4">
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Flex gap="2" align="center" mb="1">
                  <EnvelopeOpenIcon />
                  <Text size="2" weight="bold" style={{ flex: 1 }}>
                    {email.subject || "(no subject)"}
                  </Text>
                </Flex>
                <Text size="1" color="gray">From: {email.fromEmail}</Text>
                <Text size="1" color="gray" as="div">
                  {new Date(email.receivedAt).toLocaleString()}
                </Text>
              </Box>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => showArchived ? handleUnarchive(email.id) : handleArchive(email.id)}
              >
                {showArchived ? "Unarchive" : "Archive"}
              </button>
            </Flex>
          </Card>
        ))
      )}
    </Flex>
  );
}

const CAMPAIGN_STATUS_COLORS: Record<string, "gray" | "blue" | "green" | "red" | "orange"> = {
  draft: "gray",
  pending: "blue",
  running: "orange",
  completed: "green",
  failed: "red",
  stopped: "gray",
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

  if (loading) return <Text color="gray" size="2">Loading…</Text>;

  return (
    <Flex direction="column" gap="3">
      <Flex justify="between" align="center">
        <Badge color="gray" size="2" variant="soft">{campaigns.length} campaigns</Badge>
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Trigger>
            <button className={button({ variant: "ghost", size: "sm" })}><PlusIcon /> New Campaign</button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="400px">
            <Dialog.Title>New Campaign</Dialog.Title>
            <form onSubmit={handleCreate}>
              <Flex direction="column" gap="3" mt="3">
                <TextField.Root name="name" placeholder="Campaign name *" required />
                <TextField.Root name="fromEmail" placeholder="From email" type="email" />
                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close><button className={button({ variant: "ghost" })}>Cancel</button></Dialog.Close>
                  <button className={button({ variant: "ghost" })} type="submit" disabled={creating}>{creating ? "Creating…" : "Create"}</button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
      {campaigns.length === 0 ? (
        <Card><Text color="gray" size="2">No campaigns yet.</Text></Card>
      ) : (
        campaigns.map((c) => (
          <Card key={c.id}>
            <Flex justify="between" align="center" gap="3">
              <Box style={{ flex: 1 }}>
                <Flex align="center" gap="2" mb="1">
                  <Text size="2" weight="bold">{c.name}</Text>
                  <Badge color={CAMPAIGN_STATUS_COLORS[c.status] ?? "gray"} size="1" variant="soft">{c.status}</Badge>
                </Flex>
                <Flex gap="3" wrap="wrap">
                  <Text size="1" color="gray">Sent: {c.emailsSent}/{c.totalRecipients}</Text>
                  {c.emailsFailed > 0 && <Text size="1" color="red">Failed: {c.emailsFailed}</Text>}
                  <Text size="1" color="gray">{new Date(c.createdAt).toLocaleDateString()}</Text>
                </Flex>
              </Box>
              <Flex gap="1">
                <button className={button({ variant: "ghost", size: "sm" })} onClick={() => setEditingCampaignId(c.id)}><Pencil1Icon /></button>
                <button className={button({ variant: "ghost", size: "sm" })} onClick={() => handleDelete(c.id)}><TrashIcon /></button>
              </Flex>
            </Flex>
          </Card>
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
    </Flex>
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

  if (loading) return <Text color="gray" size="2">Loading…</Text>;

  return (
    <Flex direction="column" gap="3">
      <Flex justify="between" align="center">
        <Badge color="gray" size="2" variant="soft">{templates.length} templates</Badge>
        <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
          <Dialog.Trigger>
            <button className={button({ variant: "ghost", size: "sm" })}><PlusIcon /> New Template</button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="500px">
            <Dialog.Title>New Email Template</Dialog.Title>
            <form onSubmit={handleCreate}>
              <Flex direction="column" gap="3" mt="3">
                <TextField.Root name="name" placeholder="Template name *" required />
                <TextField.Root name="subject" placeholder="Subject line" />
                <TextField.Root name="category" placeholder="Category (e.g. outreach, follow-up)" />
                <TextArea name="textContent" placeholder="Email body text" rows={6} />
                <Flex gap="3" justify="end" mt="2">
                  <Dialog.Close><button className={button({ variant: "ghost" })}>Cancel</button></Dialog.Close>
                  <button className={button({ variant: "ghost" })} type="submit" disabled={creating}>{creating ? "Creating…" : "Create"}</button>
                </Flex>
              </Flex>
            </form>
          </Dialog.Content>
        </Dialog.Root>
      </Flex>
      {templates.length === 0 ? (
        <Card><Text color="gray" size="2">No templates yet.</Text></Card>
      ) : (
        templates.map((t) => (
          <Card key={t.id}>
            <Flex justify="between" align="center" gap="3">
              <Box style={{ flex: 1 }}>
                <Flex align="center" gap="2" mb="1">
                  <Text size="2" weight="bold">{t.name}</Text>
                  {t.category && <Badge color="gray" variant="surface" size="1">{t.category}</Badge>}
                  {!t.isActive && <Badge color="red" variant="soft" size="1">inactive</Badge>}
                </Flex>
                {t.subject && <Text size="1" color="gray" as="p">Subject: {t.subject}</Text>}
                <Text size="1" color="gray" as="p">{new Date(t.createdAt).toLocaleDateString()}</Text>
              </Box>
              <Flex align="center" gap="2">
                <Switch checked={t.isActive} onCheckedChange={() => handleToggleActive(t.id, t.isActive)} />
                <button className={button({ variant: "ghost", size: "sm" })} onClick={() => handleDelete(t.id)}><TrashIcon /></button>
              </Flex>
            </Flex>
          </Card>
        ))
      )}
    </Flex>
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
    <Container size="4" p="8" style={{ maxWidth: "1100px" }}>
      <Flex justify="between" align="center" mb="6">
        <Box>
          <Heading size="7">Emails</Heading>
          <Text color="gray" size="2">
            Sent and received emails via Resend
          </Text>
        </Box>
        <Flex gap="2" align="center">
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
        </Flex>
      </Flex>

      <BatchEmailModal
        open={batchModalOpen}
        onOpenChange={setBatchModalOpen}
        recipients={subscribers}
      />

      <Tabs.Root value={tab} onValueChange={handleTabChange}>
        <Tabs.List mb="4">
          <Tabs.Trigger value="received">
            <EnvelopeOpenIcon />
            &nbsp;Received
          </Tabs.Trigger>
          <Tabs.Trigger value="sent">
            <EnvelopeClosedIcon />
            &nbsp;Sent
          </Tabs.Trigger>
          <Tabs.Trigger value="campaigns">
            <RocketIcon />
            &nbsp;Campaigns
          </Tabs.Trigger>
          <Tabs.Trigger value="templates">
            <FileTextIcon />
            &nbsp;Templates
          </Tabs.Trigger>
          <Tabs.Trigger value="compose">
            <LinkedInLogoIcon />
            &nbsp;Compose
          </Tabs.Trigger>
          <Tabs.Trigger value="stats">
            <BarChartIcon />
            &nbsp;Stats
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="sent">
          <SentList />
        </Tabs.Content>

        <Tabs.Content value="received">
          <ReceivedList />
        </Tabs.Content>

        <Tabs.Content value="campaigns">
          <CampaignsList />
        </Tabs.Content>

        <Tabs.Content value="templates">
          <EmailTemplatesList />
        </Tabs.Content>

        <Tabs.Content value="compose">
          <ComposeFromLinkedIn />
        </Tabs.Content>

        <Tabs.Content value="stats">
          <EmailStatsDashboard />
        </Tabs.Content>
      </Tabs.Root>
    </Container>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="4">
            <ExclamationTriangleIcon width="32" height="32" color="red" />
            <Heading size="5">Access denied</Heading>
            <Text color="gray">This page is restricted to administrators.</Text>
            <Link href="/" className={button({ variant: "ghost" })}>← Back to Jobs</Link>
          </Flex>
        </Card>
      </Container>
    );
  }

  return <>{children}</>;
}

export default function EmailsPage() {
  return (
    <AdminGuard>
      <Suspense
        fallback={
          <Container size="3" p="8">
            <Text color="gray">Loading…</Text>
          </Container>
        }
      >
        <EmailsPageContent />
      </Suspense>
    </AdminGuard>
  );
}
