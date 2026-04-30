"use client";

import { useEffect, useState } from "react";
import {
  AlertDialog,
  Badge,
  Box,
  Callout,
  Flex,
  SegmentedControl,
  Spinner,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { Button, IconButton } from "@/components/ui";
import {
  CheckIcon,
  Cross2Icon,
  ExclamationTriangleIcon,
  Pencil1Icon,
  PaperPlaneIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import {
  useGetReplyDraftsQuery,
  useGetDraftSummaryQuery,
  useApproveAndSendDraftMutation,
  useDismissDraftMutation,
  useApproveAllDraftsMutation,
  useDismissAllDraftsMutation,
  useGenerateDraftsForPendingMutation,
  useGenerateFollowUpDraftsMutation,
} from "@/__generated__/hooks";

const CLASSIFICATION_COLORS: Record<string, "green" | "red" | "blue" | "gray"> = {
  interested: "green",
  not_interested: "red",
  info_request: "blue",
};

const STATUS_FILTERS = ["pending", "sent", "dismissed"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function pluralize(n: number, one: string, many: string = `${one}s`): string {
  return n === 1 ? one : many;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

const draftCardCss = css({
  position: "relative",
  border: "1px solid var(--gray-5)",
  borderRadius: "var(--radius-3)",
  padding: "16px",
  transition: "border-color 120ms ease, background-color 120ms ease",
  _hover: {
    borderColor: "var(--gray-7)",
    backgroundColor: "var(--gray-a2)",
  },
});

const bodyCollapsedCss = css({
  position: "relative",
  display: "block",
  whiteSpace: "pre-wrap",
  maxHeight: "120px",
  overflow: "hidden",
  marginBottom: "8px",
  _after: {
    content: '""',
    position: "absolute",
    insetX: 0,
    bottom: 0,
    height: "36px",
    background:
      "linear-gradient(to bottom, transparent, var(--color-panel-solid))",
    pointerEvents: "none",
  },
});

const bodyExpandedCss = css({
  display: "block",
  whiteSpace: "pre-wrap",
  marginBottom: "8px",
});

export function DraftReviewPanel() {
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [pendingActionId, setPendingActionId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data, loading, refetch } = useGetReplyDraftsQuery({
    variables: { status: statusFilter, limit: 50 },
    fetchPolicy: "cache-and-network",
  });

  const { data: summaryData, refetch: refetchSummary } = useGetDraftSummaryQuery({
    fetchPolicy: "cache-and-network",
  });

  const [approveDraft] = useApproveAndSendDraftMutation();
  const [dismissDraft] = useDismissDraftMutation();
  const [approveAll, { loading: approvingAll }] = useApproveAllDraftsMutation();
  const [dismissAll, { loading: dismissingAll }] = useDismissAllDraftsMutation();
  const [generatePending, { loading: generating }] = useGenerateDraftsForPendingMutation();
  const [generateFollowUps, { loading: generatingFollowUps }] = useGenerateFollowUpDraftsMutation();

  const drafts = data?.replyDrafts?.drafts ?? [];
  const summary = summaryData?.draftSummary;
  const pendingCount = summary?.pending ?? 0;

  const pendingDraftIds = drafts.filter((d) => d.status === "pending").map((d) => d.id);

  // Reset edit state if user switches filter mid-edit
  useEffect(() => {
    setEditingDraftId(null);
    setEditedBody("");
  }, [statusFilter]);

  const refetchAll = () => {
    refetch();
    refetchSummary();
  };

  const reportError = (e: unknown, fallback: string) => {
    const msg = e instanceof Error ? e.message : fallback;
    setErrorMessage(msg);
  };

  const handleApprove = async (draftId: number) => {
    setErrorMessage(null);
    setPendingActionId(draftId);
    try {
      const body = editingDraftId === draftId ? editedBody : undefined;
      await approveDraft({ variables: { draftId, editedBody: body } });
      setEditingDraftId(null);
      refetchAll();
    } catch (e) {
      reportError(e, "Failed to send draft.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleDismiss = async (draftId: number) => {
    setErrorMessage(null);
    setPendingActionId(draftId);
    try {
      await dismissDraft({ variables: { draftId } });
      refetchAll();
    } catch (e) {
      reportError(e, "Failed to dismiss draft.");
    } finally {
      setPendingActionId(null);
    }
  };

  const handleApproveAll = async () => {
    setErrorMessage(null);
    try {
      await approveAll({ variables: { draftIds: pendingDraftIds } });
      refetchAll();
    } catch (e) {
      reportError(e, "Failed to send drafts.");
    }
  };

  const handleDismissAll = async () => {
    setErrorMessage(null);
    try {
      await dismissAll({ variables: { draftIds: pendingDraftIds } });
      refetchAll();
    } catch (e) {
      reportError(e, "Failed to dismiss drafts.");
    }
  };

  const handleGeneratePending = async () => {
    setErrorMessage(null);
    try {
      await generatePending();
      refetchAll();
    } catch (e) {
      reportError(e, "Failed to generate reply drafts.");
    }
  };

  const handleGenerateFollowUps = async () => {
    setErrorMessage(null);
    try {
      await generateFollowUps();
      refetchAll();
    } catch (e) {
      reportError(e, "Failed to generate follow-ups.");
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showBulkActions = statusFilter === "pending";

  return (
    <Box>
      {/* Summary bar */}
      {summary && (
        <Flex gap="3" mb="4" wrap="wrap" align="center">
          <Flex gap="2" align="center">
            <Badge size="2" color="orange" variant="soft">
              {summary.pending} pending
            </Badge>
            <Badge size="2" color="green" variant="soft">
              {summary.sent} sent
            </Badge>
            <Badge size="2" color="gray" variant="soft">
              {summary.dismissed} dismissed
            </Badge>
          </Flex>
          {summary.byClassification.length > 0 && (
            <>
              <Box
                className={css({
                  width: "1px",
                  alignSelf: "stretch",
                  backgroundColor: "var(--gray-6)",
                })}
              />
              <Flex gap="2" align="center" wrap="wrap">
                {summary.byClassification.map((c) => (
                  <Badge
                    key={c.classification}
                    size="1"
                    color={CLASSIFICATION_COLORS[c.classification] ?? "gray"}
                    variant="soft"
                  >
                    {titleCase(c.classification)}: {c.count}
                  </Badge>
                ))}
              </Flex>
            </>
          )}
          <Box flexGrow="1" />
          <IconButton
            size="md"
            variant="ghost"
            label="Refresh drafts"
            onClick={refetchAll}
          >
            <ReloadIcon />
          </IconButton>
        </Flex>
      )}

      {/* Error surface */}
      {errorMessage && (
        <Callout.Root color="red" role="alert" mb="3">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {errorMessage}{" "}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              Dismiss
            </Button>
          </Callout.Text>
        </Callout.Root>
      )}

      {/* Actions */}
      <Flex gap="2" mb="4" wrap="wrap" align="center">
        {showBulkActions && (
          <>
            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button
                  size="md"
                  variant="solidGreen"
                  disabled={pendingDraftIds.length === 0}
                  loading={approvingAll}
                >
                  <PaperPlaneIcon />
                  Send {pendingDraftIds.length}{" "}
                  {pluralize(pendingDraftIds.length, "draft")}
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content maxWidth="440px">
                <AlertDialog.Title>
                  Send {pendingDraftIds.length}{" "}
                  {pluralize(pendingDraftIds.length, "draft")}?
                </AlertDialog.Title>
                <AlertDialog.Description size="2">
                  This will deliver {pendingDraftIds.length}{" "}
                  {pluralize(pendingDraftIds.length, "email")} to real
                  prospects. This action cannot be undone.
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solidGreen" size="sm" onClick={handleApproveAll}>
                      Send {pluralize(pendingDraftIds.length, "draft")}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button
                  size="md"
                  variant="outline"
                  disabled={pendingDraftIds.length === 0}
                  loading={dismissingAll}
                >
                  Dismiss {pendingDraftIds.length}
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content maxWidth="440px">
                <AlertDialog.Title>
                  Dismiss {pendingDraftIds.length}{" "}
                  {pluralize(pendingDraftIds.length, "draft")}?
                </AlertDialog.Title>
                <AlertDialog.Description size="2">
                  Drafts will be archived without sending. You can regenerate
                  them later.
                </AlertDialog.Description>
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button variant="solidRed" size="sm" onClick={handleDismissAll}>
                      Dismiss
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>

            <Box flexGrow="1" />
          </>
        )}

        <Button
          size="md"
          variant="outline"
          loading={generating}
          onClick={handleGeneratePending}
        >
          Generate Reply Drafts
        </Button>
        <Button
          size="md"
          variant="outline"
          loading={generatingFollowUps}
          onClick={handleGenerateFollowUps}
        >
          Generate Follow-ups
        </Button>
      </Flex>

      {/* Status filter */}
      <Box mb="3">
        <SegmentedControl.Root
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          size="1"
        >
          {STATUS_FILTERS.map((s) => (
            <SegmentedControl.Item key={s} value={s}>
              {titleCase(s)}
              {s === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </SegmentedControl.Item>
          ))}
        </SegmentedControl.Root>
      </Box>

      {/* Draft list */}
      {loading && !data ? (
        <Flex justify="center" py="8">
          <Spinner size="3" />
        </Flex>
      ) : drafts.length === 0 ? (
        <Callout.Root color="gray">
          <Callout.Text>
            <Text as="div" weight="medium" mb="1">
              No {statusFilter} drafts.
            </Text>
            {statusFilter === "pending" && (
              <Flex gap="2" mt="2" wrap="wrap">
                <Button size="sm" variant="outline" onClick={handleGeneratePending} loading={generating}>
                  Generate Reply Drafts
                </Button>
                <Button size="sm" variant="outline" onClick={handleGenerateFollowUps} loading={generatingFollowUps}>
                  Generate Follow-ups
                </Button>
              </Flex>
            )}
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Flex direction="column" gap="3">
          {drafts.map((draft) => {
            const isEditing = editingDraftId === draft.id;
            const isExpanded = expandedIds.has(draft.id);
            const isThisRowPending = pendingActionId === draft.id;
            const classificationColor =
              CLASSIFICATION_COLORS[draft.classification ?? ""] ?? "gray";
            return (
              <Box
                key={draft.id}
                className={draftCardCss}
                style={{
                  opacity: isThisRowPending ? 0.6 : 1,
                  pointerEvents: isThisRowPending ? "none" : "auto",
                }}
              >
                <Flex justify="between" align="start" mb="2" gap="3">
                  <Box>
                    <Flex gap="2" align="center" mb="1" wrap="wrap">
                      <Text size="3" weight="bold">
                        {draft.contactName}
                      </Text>
                      {draft.classification && (
                        <Badge
                          size="1"
                          color={classificationColor}
                          variant="soft"
                        >
                          {titleCase(draft.classification)}
                          {draft.classificationConfidence != null &&
                            ` · ${Math.round(draft.classificationConfidence * 100)}%`}
                        </Badge>
                      )}
                      <Badge
                        size="1"
                        variant="outline"
                        color={draft.draftType === "follow_up" ? "orange" : "blue"}
                      >
                        {draft.draftType === "follow_up" ? "Follow-up" : "Reply"}
                      </Badge>
                    </Flex>
                    <Text size="1" color="gray">
                      {draft.contactEmail}
                      {draft.companyName ? ` · ${draft.companyName}` : ""}
                    </Text>
                  </Box>
                  <Text
                    size="1"
                    color="gray"
                    title={new Date(draft.createdAt).toLocaleString()}
                  >
                    <time dateTime={draft.createdAt}>
                      {relativeTime(draft.createdAt)}
                    </time>
                  </Text>
                </Flex>

                <Text size="2" weight="medium" mb="1" style={{ display: "block" }}>
                  {draft.subject}
                </Text>

                {isEditing ? (
                  <TextArea
                    size="2"
                    value={editedBody}
                    onChange={(e) => setEditedBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setEditingDraftId(null);
                      }
                    }}
                    aria-label={`Edit draft to ${draft.contactName}`}
                    style={{ minHeight: "160px", marginBottom: "8px" }}
                  />
                ) : (
                  <>
                    <Text
                      size="1"
                      color="gray"
                      className={isExpanded ? bodyExpandedCss : bodyCollapsedCss}
                    >
                      {draft.bodyText}
                    </Text>
                    {(draft.bodyText?.length ?? 0) > 200 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className={css({ marginBottom: "2" })}
                        onClick={() => toggleExpanded(draft.id)}
                      >
                        {isExpanded ? "Show less" : "Show full draft"}
                      </Button>
                    )}
                  </>
                )}

                {draft.status === "pending" && (
                  <Flex gap="2" wrap="wrap">
                    <Button
                      size="sm"
                      variant="solidGreen"
                      loading={isThisRowPending}
                      onClick={() => handleApprove(draft.id)}
                      aria-label={`Send draft to ${draft.contactName}`}
                    >
                      <CheckIcon />
                      Send
                    </Button>
                    {isEditing ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingDraftId(null)}
                        aria-label="Cancel edit"
                      >
                        Cancel edit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingDraftId(draft.id);
                          setEditedBody(draft.bodyText ?? "");
                        }}
                        aria-label={`Edit draft to ${draft.contactName}`}
                      >
                        <Pencil1Icon />
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="solidRed"
                      disabled={isThisRowPending}
                      onClick={() => handleDismiss(draft.id)}
                      aria-label={`Dismiss draft to ${draft.contactName}`}
                    >
                      <Cross2Icon />
                      Dismiss
                    </Button>
                  </Flex>
                )}
              </Box>
            );
          })}
        </Flex>
      )}
    </Box>
  );
}
