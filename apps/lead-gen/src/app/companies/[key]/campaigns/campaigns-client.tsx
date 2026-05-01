"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertDialog,
  Badge,
  Box,
  Callout,
  Card,
  Checkbox,
  Flex,
  Grid,
  Heading,
  IconButton,
  Select,
  Spinner,
  Table,
  Text,
  TextField,
  Tooltip,
} from "@radix-ui/themes";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretSortIcon,
  CopyIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  Pencil1Icon,
  PlusIcon,
  RocketIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import {
  useCreateDraftCampaignMutation,
  useDeleteCampaignMutation,
  useGetCompanyQuery,
  useGetEmailCampaignsQuery,
  useLaunchEmailCampaignMutation,
} from "@/__generated__/hooks";
import { EditCampaignDialog } from "@/components/admin/EditCampaignDialog";

type CampaignRow = {
  id: string;
  companyId?: number | null;
  name: string;
  status: string;
  mode?: string | null;
  fromEmail?: string | null;
  totalRecipients: number;
  emailsSent: number;
  emailsScheduled: number;
  emailsFailed: number;
  createdAt: string;
  updatedAt: string;
};

const statusColors: Record<string, "green" | "yellow" | "blue" | "red" | "gray"> = {
  draft: "gray",
  pending: "yellow",
  running: "blue",
  completed: "green",
  failed: "red",
  stopped: "red",
};

const STATUS_KEYS = [
  "draft",
  "pending",
  "running",
  "completed",
  "failed",
  "stopped",
] as const;

type SortKey = "name" | "status" | "recipients" | "sent" | "created";
type SortDir = "asc" | "desc";

function sendRate(c: CampaignRow): number {
  if (!c.totalRecipients) return 0;
  return Math.round((c.emailsSent / c.totalRecipients) * 100);
}

function compare(a: CampaignRow, b: CampaignRow, key: SortKey): number {
  switch (key) {
    case "name":
      return a.name.localeCompare(b.name);
    case "status":
      return a.status.localeCompare(b.status);
    case "recipients":
      return a.totalRecipients - b.totalRecipients;
    case "sent":
      return a.emailsSent - b.emailsSent;
    case "created":
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }
}

export function CampaignsClient({ companyKey }: { companyKey: string }) {
  const searchParams = useSearchParams();
  const [editCampaignId, setEditCampaignId] = useState<string | null>(
    () => searchParams.get("edit"),
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    data: companyData,
    loading: companyLoading,
    error: companyError,
  } = useGetCompanyQuery({
    variables: { key: companyKey },
  });

  const company = companyData?.company;

  const {
    data,
    loading,
    error: campaignsError,
    refetch,
  } = useGetEmailCampaignsQuery({
    variables: { limit: 100 },
  });

  const [createCampaign, { loading: creating }] = useCreateDraftCampaignMutation();
  const [launchCampaign] = useLaunchEmailCampaignMutation();
  const [deleteCampaignMutation] = useDeleteCampaignMutation();

  const allCampaigns: CampaignRow[] = useMemo(() => {
    return ((data?.emailCampaigns?.campaigns ?? []) as CampaignRow[]).filter(
      (c) => c.companyId === company?.id,
    );
  }, [data, company?.id]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of allCampaigns) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  }, [allCampaigns]);

  const modes = useMemo(() => {
    const set = new Set<string>();
    for (const c of allCampaigns) if (c.mode) set.add(c.mode);
    return Array.from(set).sort();
  }, [allCampaigns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCampaigns.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (modeFilter !== "all" && (c.mode ?? "") !== modeFilter) return false;
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allCampaigns, search, statusFilter, modeFilter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(() => {
    let recipients = 0;
    let sent = 0;
    let failed = 0;
    for (const c of allCampaigns) {
      recipients += c.totalRecipients;
      sent += c.emailsSent;
      failed += c.emailsFailed;
    }
    const rate = recipients > 0 ? Math.round((sent / recipients) * 100) : 0;
    return { recipients, sent, failed, rate };
  }, [allCampaigns]);

  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("desc");
      }
    },
    [sortKey],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allVisibleSelected =
    sorted.length > 0 && sorted.every((c) => selected.has(c.id));

  const toggleSelectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (sorted.every((c) => next.has(c.id))) {
        for (const c of sorted) next.delete(c.id);
      } else {
        for (const c of sorted) next.add(c.id);
      }
      return next;
    });
  }, [sorted]);

  if (companyLoading || loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: "400px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (companyError || campaignsError) {
    const message =
      companyError?.message ?? campaignsError?.message ?? "Unknown error";
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>Failed to load campaigns: {message}</Callout.Text>
      </Callout.Root>
    );
  }

  if (!company) {
    return <Text color="red">Company not found</Text>;
  }

  const handleCreate = async () => {
    await createCampaign({
      variables: {
        input: {
          name: `${company.name} Campaign ${new Date().toLocaleDateString()}`,
          companyId: company.id,
        },
      },
    });
    refetch();
  };

  const handleClone = async (c: CampaignRow) => {
    setActionError(null);
    setActionBusy(c.id);
    try {
      await createCampaign({
        variables: {
          input: {
            name: `${c.name} (copy)`,
            companyId: company.id,
            mode: c.mode ?? undefined,
            fromEmail: c.fromEmail ?? undefined,
          },
        },
      });
      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Clone failed",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleLaunch = async (c: CampaignRow) => {
    setActionError(null);
    setActionBusy(c.id);
    try {
      await launchCampaign({ variables: { id: c.id } });
      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Launch failed",
      );
    } finally {
      setActionBusy(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkBusy(true);
    setActionError(null);
    try {
      const ids = Array.from(selected);
      for (const id of ids) {
        await deleteCampaignMutation({ variables: { id } });
      }
      setSelected(new Set());
      await refetch();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Bulk delete failed",
      );
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Flex direction="column" gap="4">
      {/* ── Feature 1: KPI summary strip ────────────────────────── */}
      <Grid columns={{ initial: "2", sm: "4" }} gap="3">
        <KpiTile label="Campaigns" value={allCampaigns.length.toLocaleString()} />
        <KpiTile
          label="Recipients"
          value={totals.recipients.toLocaleString()}
        />
        <KpiTile
          label="Emails sent"
          value={totals.sent.toLocaleString()}
          hint={totals.failed > 0 ? `${totals.failed} failed` : undefined}
          tone={totals.failed > 0 ? "amber" : "gray"}
        />
        <KpiTile
          label="Send rate"
          value={`${totals.rate}%`}
          tone={
            totals.rate >= 70 ? "green" : totals.rate >= 30 ? "amber" : "gray"
          }
        />
      </Grid>

      {/* Header + create */}
      <Flex justify="between" align="center" wrap="wrap" gap="3">
        <Box>
          <Heading size="5">Campaigns</Heading>
          <Text size="2" color="gray">
            {sorted.length} of {allCampaigns.length} shown
          </Text>
        </Box>
        <button
          className={button({ variant: "ghost" })}
          onClick={handleCreate}
          disabled={creating}
        >
          <PlusIcon /> New Campaign
        </button>
      </Flex>

      {actionError && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{actionError}</Callout.Text>
        </Callout.Root>
      )}

      {/* ── Features 2, 3, 4: Status chips + Search + Mode filter ── */}
      <Card>
        <Box p="3">
          <Flex direction="column" gap="3">
            <Flex gap="2" wrap="wrap" align="center">
              <FilterChip
                label={`All · ${allCampaigns.length}`}
                active={statusFilter === null}
                onClick={() => setStatusFilter(null)}
                color="gray"
              />
              {STATUS_KEYS.map((s) => {
                const n = statusCounts[s] ?? 0;
                if (n === 0) return null;
                return (
                  <FilterChip
                    key={s}
                    label={`${s} · ${n}`}
                    active={statusFilter === s}
                    onClick={() => setStatusFilter(s)}
                    color={statusColors[s] ?? "gray"}
                  />
                );
              })}
            </Flex>

            <Flex gap="3" wrap="wrap" align="center">
              <Box className={css({ flex: "1 1 240px", minWidth: "200px" })}>
                <TextField.Root
                  placeholder="Search campaign name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  size="2"
                >
                  <TextField.Slot>
                    <MagnifyingGlassIcon />
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              {modes.length > 0 && (
                <Flex align="center" gap="2">
                  <Text size="2" color="gray">
                    Mode
                  </Text>
                  <Select.Root value={modeFilter} onValueChange={setModeFilter}>
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Item value="all">All modes</Select.Item>
                      {modes.map((m) => (
                        <Select.Item key={m} value={m}>
                          {m}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Box>
      </Card>

      {/* ── Feature 10: Bulk action bar ─────────────────────────── */}
      {selected.size > 0 && (
        <Card>
          <Box p="3">
            <Flex justify="between" align="center" gap="3" wrap="wrap">
              <Text size="2" weight="medium">
                {selected.size} selected
              </Text>
              <Flex gap="2">
                <button
                  type="button"
                  className={button({ variant: "ghost", size: "sm" })}
                  onClick={() => setSelected(new Set())}
                  disabled={bulkBusy}
                >
                  Clear
                </button>
                <BulkDeleteButton
                  count={selected.size}
                  onConfirm={handleBulkDelete}
                  busy={bulkBusy}
                />
              </Flex>
            </Flex>
          </Box>
        </Card>
      )}

      {sorted.length === 0 ? (
        <Text color="gray">
          {allCampaigns.length === 0
            ? "No campaigns yet for this company."
            : "No campaigns match these filters."}
        </Text>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell width="36px">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={toggleSelectAllVisible}
                  aria-label="Select all visible campaigns"
                />
              </Table.ColumnHeaderCell>
              <SortableHeader
                label="Name"
                sortKey="name"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHeader
                label="Status"
                sortKey="status"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <Table.ColumnHeaderCell>Mode</Table.ColumnHeaderCell>
              <SortableHeader
                label="Recipients"
                sortKey="recipients"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <SortableHeader
                label="Sent"
                sortKey="sent"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <Table.ColumnHeaderCell>Progress</Table.ColumnHeaderCell>
              <SortableHeader
                label="Created"
                sortKey="created"
                activeKey={sortKey}
                dir={sortDir}
                onClick={toggleSort}
              />
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sorted.map((campaign) => {
              const rate = sendRate(campaign);
              const isBusy = actionBusy === campaign.id;
              const canLaunch =
                campaign.status === "draft" || campaign.status === "stopped";
              return (
                <Table.Row key={campaign.id}>
                  <Table.Cell>
                    <Checkbox
                      checked={selected.has(campaign.id)}
                      onCheckedChange={() => toggleSelect(campaign.id)}
                      aria-label={`Select ${campaign.name}`}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      href={`/companies/${companyKey}/campaigns/${campaign.id}`}
                      className={css({
                        color: "indigo.11",
                        textDecoration: "none",
                        _hover: { textDecoration: "underline" },
                      })}
                    >
                      <Text weight="medium">{campaign.name}</Text>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={statusColors[campaign.status] ?? "gray"}>
                      {campaign.status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    {campaign.mode ? (
                      <Badge variant="surface" color="gray">
                        {campaign.mode}
                      </Badge>
                    ) : (
                      <Text size="1" color="gray">
                        —
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>{campaign.totalRecipients}</Table.Cell>
                  <Table.Cell>
                    <Flex align="center" gap="2">
                      <Text>{campaign.emailsSent}</Text>
                      {campaign.emailsScheduled > 0 && (
                        <Tooltip content={`${campaign.emailsScheduled} scheduled`}>
                          <Badge color="blue" variant="soft" size="1">
                            +{campaign.emailsScheduled}
                          </Badge>
                        </Tooltip>
                      )}
                      {campaign.emailsFailed > 0 && (
                        <Tooltip content={`${campaign.emailsFailed} failed`}>
                          <Badge color="red" variant="soft" size="1">
                            ✕{campaign.emailsFailed}
                          </Badge>
                        </Tooltip>
                      )}
                    </Flex>
                  </Table.Cell>
                  <Table.Cell>
                    <ProgressBar percent={rate} />
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="1" color="gray">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Flex gap="1" align="center">
                      {canLaunch && (
                        <Tooltip content="Launch campaign">
                          <IconButton
                            variant="ghost"
                            size="1"
                            color="green"
                            onClick={() => handleLaunch(campaign)}
                            disabled={isBusy}
                            aria-label={`Launch ${campaign.name}`}
                          >
                            {isBusy ? <Spinner size="1" /> : <RocketIcon />}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip content="Clone">
                        <IconButton
                          variant="ghost"
                          size="1"
                          onClick={() => handleClone(campaign)}
                          disabled={isBusy}
                          aria-label={`Clone ${campaign.name}`}
                        >
                          <CopyIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip content="Edit">
                        <IconButton
                          variant="ghost"
                          size="1"
                          onClick={() => setEditCampaignId(campaign.id)}
                          aria-label={`Edit ${campaign.name}`}
                        >
                          <Pencil1Icon />
                        </IconButton>
                      </Tooltip>
                      <DeleteCampaignButton
                        campaignId={campaign.id}
                        campaignName={campaign.name}
                        onDeleted={() => {
                          if (editCampaignId === campaign.id)
                            setEditCampaignId(null);
                          setSelected((prev) => {
                            const next = new Set(prev);
                            next.delete(campaign.id);
                            return next;
                          });
                          refetch();
                        }}
                      />
                    </Flex>
                  </Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      {editCampaignId && (
        <EditCampaignDialog
          campaignId={editCampaignId}
          open={editCampaignId !== null}
          onOpenChange={(open) => {
            if (!open) setEditCampaignId(null);
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </Flex>
  );
}

function KpiTile({
  label,
  value,
  hint,
  tone = "gray",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "gray" | "green" | "amber" | "red";
}) {
  return (
    <Card>
      <Box p="3">
        <Text
          size="1"
          color="gray"
          weight="medium"
          className={css({ letterSpacing: "0.08em" })}
        >
          {label.toUpperCase()}
        </Text>
        <Box mt="1">
          <Text
            size="6"
            weight="bold"
            color={tone === "gray" ? undefined : tone}
            className={css({ display: "block", lineHeight: 1.1 })}
          >
            {value}
          </Text>
        </Box>
        {hint && (
          <Box mt="1">
            <Text size="1" color="gray">
              {hint}
            </Text>
          </Box>
        )}
      </Box>
    </Card>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color = "gray",
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: "green" | "yellow" | "blue" | "red" | "gray";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={css({
        cursor: "pointer",
        background: "transparent",
        border: "none",
        padding: 0,
      })}
    >
      <Badge
        color={color}
        variant={active ? "solid" : "soft"}
        size="2"
        className={css({ textTransform: "capitalize" })}
      >
        {label}
      </Badge>
    </button>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeKey,
  dir,
  onClick,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const active = activeKey === sortKey;
  const Arrow = !active ? CaretSortIcon : dir === "asc" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Table.ColumnHeaderCell>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={css({
          display: "inline-flex",
          alignItems: "center",
          gap: "1",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          font: "inherit",
          color: active ? "indigo.11" : "inherit",
        })}
      >
        {label}
        <Arrow />
      </button>
    </Table.ColumnHeaderCell>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const tone =
    clamped >= 70 ? "var(--green-9)" : clamped >= 30 ? "var(--amber-9)" : "var(--gray-9)";
  return (
    <Flex align="center" gap="2" className={css({ minWidth: "120px" })}>
      <Box
        className={css({
          flex: 1,
          height: "6px",
          borderRadius: "full",
          background: "var(--gray-a4)",
          overflow: "hidden",
        })}
      >
        <Box
          style={{
            width: `${clamped}%`,
            height: "100%",
            background: tone,
            transition: "width 0.2s ease",
          }}
        />
      </Box>
      <Text size="1" color="gray" className={css({ minWidth: "32px", textAlign: "right" })}>
        {clamped}%
      </Text>
    </Flex>
  );
}

function BulkDeleteButton({
  count,
  onConfirm,
  busy,
}: {
  count: number;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <button
          type="button"
          className={button({ variant: "ghost", size: "sm" })}
          disabled={busy}
        >
          <TrashIcon /> Delete {count}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="400px">
        <AlertDialog.Title>Delete {count} campaigns</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Remove the selected campaigns? This cannot be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <button type="button" className={button({ variant: "ghost" })}>
              Cancel
            </button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <button
              type="button"
              className={button({ variant: "ghost" })}
              onClick={onConfirm}
              disabled={busy}
            >
              {busy ? "Removing…" : "Remove"}
            </button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}

function DeleteCampaignButton({
  campaignId,
  campaignName,
  onDeleted,
}: {
  campaignId: string;
  campaignName: string;
  onDeleted: () => void;
}) {
  const [deleteCampaign, { loading }] = useDeleteCampaignMutation();

  const handleDelete = useCallback(async () => {
    const { data } = await deleteCampaign({ variables: { id: campaignId } });
    if (data?.deleteCampaign?.success) {
      onDeleted();
    }
  }, [deleteCampaign, campaignId, onDeleted]);

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <Tooltip content="Delete">
          <IconButton
            variant="ghost"
            size="1"
            color="red"
            aria-label={`Delete ${campaignName}`}
          >
            <TrashIcon />
          </IconButton>
        </Tooltip>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="400px">
        <AlertDialog.Title>Delete campaign</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Remove &ldquo;{campaignName}&rdquo;? This cannot be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <button type="button" className={button({ variant: "ghost" })}>
              Cancel
            </button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <button
              type="button"
              className={button({ variant: "ghost" })}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Removing…" : "Remove"}
            </button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
