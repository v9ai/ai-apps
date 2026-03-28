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
import { button } from "@/recipes/button";
import {
  Badge,
  Box,
  Callout,
  Card,
  Container,
  Dialog,
  Flex,
  Select,
  Separator,
  Spinner,
  Text,
} from "@radix-ui/themes";
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

const statusColor: Record<string, "green" | "red" | "blue" | "gray"> = {
  sent: "green",
  delivered: "green",
  opened: "green",
  clicked: "green",
  bounced: "red",
  complained: "red",
  failed: "red",
  queued: "blue",
  scheduled: "blue",
};

type StatusFilter = "all" | "delivered" | "bounced" | "sent" | "scheduled";

// ─── Email Row Type ───────────────────────────────────────────────────────────

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

// ─── Sequence Badge ───────────────────────────────────────────────────────────

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
    <Badge color="purple" variant="soft" size="1">
      {label}
    </Badge>
  );
}

// ─── Email Detail Dialog ─────────────────────────────────────────────────────

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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Card style={{ cursor: "pointer" }}>
          <Box p="3">
            <Flex justify="between" align="start" gap="2" wrap="wrap">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Text
                  size="2"
                  weight="medium"
                  as="p"
                  style={{ wordBreak: "break-word" }}
                >
                  {email.subject}
                </Text>
                <Flex gap="2" align="center" wrap="wrap" mt="1">
                  <Text size="1" color="gray">
                    {contactName}
                    {email.contactPosition
                      ? ` · ${email.contactPosition}`
                      : ""}
                  </Text>
                  {email.scheduledAt ? (
                    <Text size="1" color="blue">
                      Scheduled:{" "}
                      {new Date(email.scheduledAt).toLocaleString()}
                    </Text>
                  ) : (
                    <Text size="1" color="gray">
                      {email.sentAt
                        ? new Date(email.sentAt).toLocaleString()
                        : new Date(email.createdAt).toLocaleString()}
                    </Text>
                  )}
                </Flex>
                <Flex gap="2" align="center" wrap="wrap" mt="1">
                  <SequenceBadge
                    sequenceType={email.sequenceType}
                    sequenceNumber={email.sequenceNumber}
                  />
                  {email.replyReceived && (
                    <Badge color="green" variant="soft" size="1">
                      Replied
                    </Badge>
                  )}
                </Flex>
              </Box>
              <Badge
                color={statusColor[email.status] ?? "gray"}
                variant="soft"
                size="1"
              >
                {email.status}
              </Badge>
            </Flex>
          </Box>
        </Card>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="580px">
        <Dialog.Title>{email.subject}</Dialog.Title>

        {loading ? (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        ) : detail ? (
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">
                <Text weight="medium">From:</Text> {detail.from}
              </Text>
              <Text size="1" color="gray">
                <Text weight="medium">To:</Text> {detail.to.join(", ")}
              </Text>
              {detail.cc && detail.cc.length > 0 && (
                <Text size="1" color="gray">
                  <Text weight="medium">CC:</Text> {detail.cc.join(", ")}
                </Text>
              )}
              <Text size="1" color="gray">
                <Text weight="medium">Sent:</Text>{" "}
                {new Date(detail.createdAt).toLocaleString()}
              </Text>
              {detail.scheduledAt && (
                <Text size="1" color="blue">
                  <Text weight="medium">Scheduled for:</Text>{" "}
                  {new Date(detail.scheduledAt).toLocaleString()}
                </Text>
              )}
              {detail.lastEvent && (
                <Flex align="center" gap="2">
                  <Text size="1" color="gray" weight="medium">
                    Status:
                  </Text>
                  <Badge
                    color={
                      detail.lastEvent === "delivered"
                        ? "green"
                        : detail.lastEvent === "bounced"
                          ? "red"
                          : detail.lastEvent === "opened"
                            ? "teal"
                            : "blue"
                    }
                    variant="soft"
                    size="1"
                  >
                    {detail.lastEvent}
                  </Badge>
                </Flex>
              )}
              {email.replyReceived && (
                <Flex align="center" gap="2">
                  <Badge color="green" variant="soft" size="1">
                    Replied
                  </Badge>
                </Flex>
              )}
              {(email.sequenceType || email.sequenceNumber) && (
                <Flex align="center" gap="2">
                  <Text size="1" color="gray" weight="medium">
                    Sequence:
                  </Text>
                  <SequenceBadge
                    sequenceType={email.sequenceType}
                    sequenceNumber={email.sequenceNumber}
                  />
                </Flex>
              )}
            </Flex>

            <Separator size="4" />

            {detail.text ? (
              <Box
                style={{
                  background: "var(--gray-2)",
                  borderRadius: "var(--radius-3)",
                  padding: "var(--space-4)",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6",
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                <Text size="2">{detail.text}</Text>
              </Box>
            ) : (
              <Text size="2" color="gray">
                No body content.
              </Text>
            )}

            {/* Scheduled email actions */}
            {isScheduled && (
              <>
                <Separator size="4" />
                <Flex gap="2" wrap="wrap">
                  <button
                    className={button({ variant: "ghost", size: "sm" })}
                    onClick={handleSendNow}
                    disabled={sendingNow || cancellingEmail}
                  >
                    {sendingNow ? <Spinner size="1" /> : null}
                    Send Now
                  </button>
                  <button
                    className={button({ variant: "ghost", size: "sm" })}
                    onClick={handleCancelEmail}
                    disabled={sendingNow || cancellingEmail}
                  >
                    {cancellingEmail ? <Spinner size="1" /> : null}
                    Cancel
                  </button>
                </Flex>
              </>
            )}

            {actionResult && (
              <Callout.Root
                color={actionResult.success ? "green" : "red"}
                size="1"
              >
                <Callout.Icon>
                  {actionResult.success ? (
                    <InfoCircledIcon />
                  ) : (
                    <ExclamationTriangleIcon />
                  )}
                </Callout.Icon>
                <Callout.Text>{actionResult.message}</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        ) : (
          <Callout.Root color="red" size="1">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>Failed to load email from Resend.</Callout.Text>
          </Callout.Root>
        )}

        <Flex justify="end" mt="4">
          <Dialog.Close>
            <button className={button({ variant: "ghost" })}>
              Close
            </button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Cancel All Scheduled Dialog ─────────────────────────────────────────────

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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <button className={button({ variant: "ghost", size: "sm" })}>
          <TrashIcon />
          Cancel Scheduled
        </button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Cancel All Scheduled Emails?</Dialog.Title>
        <Dialog.Description size="2" color="gray">
          This will cancel all scheduled emails for this company that have not
          yet been sent. This action cannot be undone.
        </Dialog.Description>

        {result && (
          <Callout.Root
            color={result.success ? "green" : "red"}
            size="1"
            mt="3"
          >
            <Callout.Icon>
              {result.success ? (
                <InfoCircledIcon />
              ) : (
                <ExclamationTriangleIcon />
              )}
            </Callout.Icon>
            <Callout.Text>{result.message}</Callout.Text>
          </Callout.Root>
        )}

        <Flex gap="2" justify="end" mt="4">
          <Dialog.Close>
            <button className={button({ variant: "ghost" })} disabled={loading}>
              {result ? "Close" : "Cancel"}
            </button>
          </Dialog.Close>
          {!result && (
            <button
              className={button({ variant: "solid" })}
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? <Spinner size="1" /> : null}
              Confirm Cancel All
            </button>
          )}
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

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
      <Container size="3" p="8">
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Access denied. Admin only.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  if (companyLoading) {
    return (
      <Container size="3" p="8">
        <Flex justify="center">
          <Spinner size="3" />
        </Flex>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="3" p="8">
        <Callout.Root color="gray">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>Company not found.</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  return (
    <Container size="3" p={{ initial: "4", md: "6" }}>
      <Flex direction="column" gap="5">
        {/* Header */}
        <Box>
          <Link
            href={`/companies/${companyKey}`}
            style={{ textDecoration: "none" }}
          >
            <Flex align="center" gap="1" mb="3">
              <ArrowLeftIcon />
              <Text size="2" color="gray">
                {company.name}
              </Text>
            </Flex>
          </Link>

          {/* Tab navigation */}
          <div className="rt-TabsRoot" style={{ marginBottom: "var(--space-4)" }}>
            <div className="rt-TabsList" style={{ display: "flex", gap: 0 }}>
              <Link href={`/companies/${companyKey}`} className="rt-reset rt-TabsTrigger" style={{ textDecoration: "none" }}>
                Overview
              </Link>
              <Link href={`/companies/${companyKey}/contacts`} className="rt-reset rt-TabsTrigger" style={{ textDecoration: "none" }}>
                Contacts
              </Link>
              <Link href={`/companies/${companyKey}/emails`} className="rt-reset rt-TabsTrigger" data-state="active" style={{ textDecoration: "none" }}>
                Emails
              </Link>
            </div>
          </div>
        </Box>

        {/* Toolbar */}
        <Flex align="center" gap="3" wrap="wrap">
          <Text size="2" color="gray">
            {companyEmails.length} email
            {companyEmails.length !== 1 ? "s" : ""}
          </Text>
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
            {syncing ? <Spinner size="1" /> : <UpdateIcon />}
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
        </Flex>

        {/* Sync result feedback */}
        {syncResult && (
          <Callout.Root color="blue" size="1" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{syncResult}</Callout.Text>
          </Callout.Root>
        )}

        {/* Email list */}
        {emailsError ? (
          <Callout.Root color="red" variant="soft">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              Failed to load emails: {emailsError.message}
            </Callout.Text>
          </Callout.Root>
        ) : emailsLoading ? (
          <Flex justify="center">
            <Spinner size="3" />
          </Flex>
        ) : companyEmails.length === 0 ? (
          <Callout.Root color="gray" variant="soft">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              No emails sent to contacts at this company yet.
            </Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="3">
            {/* Filters */}
            <Flex align="center" gap="2" wrap="wrap">
              <Select.Root
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as StatusFilter)
                }
              >
                <Select.Trigger variant="soft" />
                <Select.Content>
                  <Select.Item value="all">All statuses</Select.Item>
                  <Select.Item value="delivered">Delivered</Select.Item>
                  <Select.Item value="scheduled">Scheduled</Select.Item>
                  <Select.Item value="bounced">Bounced</Select.Item>
                  <Select.Item value="sent">Sent</Select.Item>
                </Select.Content>
              </Select.Root>
              <button
                className={button({ variant: "ghost", size: "sm" })}
                onClick={() => refetchEmails()}
              >
                <ReloadIcon />
                Refresh
              </button>
              {statusFilter !== "all" && (
                <Text size="1" color="gray">
                  {filteredEmails.length} of {companyEmails.length}
                </Text>
              )}
            </Flex>

            {/* Email cards */}
            <Flex direction="column" gap="2">
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
            </Flex>
          </Flex>
        )}
      </Flex>

      <BatchEmailModal open={batchEmailOpen} onOpenChange={setBatchEmailOpen} recipients={batchEmailRecipients} />
      <GenerateAndSendBatchEmailModal
        open={generateBatchOpen}
        onOpenChange={setGenerateBatchOpen}
        companyId={company.id}
        companyName={company.name ?? undefined}
        contacts={generateBatchContacts}
        onSuccess={() => void refetchEmails()}
      />
    </Container>
  );
}
