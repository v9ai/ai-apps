"use client";

import { useState } from "react";
import { Badge, Box, Button, Callout, Flex, Spinner, Text, TextArea } from "@radix-ui/themes";
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

export function DraftReviewPanel() {
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [editedBody, setEditedBody] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data, loading, refetch } = useGetReplyDraftsQuery({
    variables: { status: statusFilter, limit: 50 },
    fetchPolicy: "cache-and-network",
  });

  const { data: summaryData, refetch: refetchSummary } = useGetDraftSummaryQuery({
    fetchPolicy: "cache-and-network",
  });

  const [approveDraft, { loading: approving }] = useApproveAndSendDraftMutation();
  const [dismissDraft] = useDismissDraftMutation();
  const [approveAll, { loading: approvingAll }] = useApproveAllDraftsMutation();
  const [dismissAll] = useDismissAllDraftsMutation();
  const [generatePending, { loading: generating }] = useGenerateDraftsForPendingMutation();
  const [generateFollowUps, { loading: generatingFollowUps }] = useGenerateFollowUpDraftsMutation();

  const drafts = data?.replyDrafts?.drafts ?? [];
  const summary = summaryData?.draftSummary;

  const pendingDraftIds = drafts.filter((d) => d.status === "pending").map((d) => d.id);

  const handleApprove = async (draftId: number) => {
    const body = editingDraftId === draftId ? editedBody : undefined;
    await approveDraft({
      variables: { draftId, editedBody: body },
    });
    setEditingDraftId(null);
    refetch();
    refetchSummary();
  };

  const handleDismiss = async (draftId: number) => {
    await dismissDraft({ variables: { draftId } });
    refetch();
    refetchSummary();
  };

  const handleApproveAll = async () => {
    if (!confirm(`Send ${pendingDraftIds.length} drafts?`)) return;
    await approveAll({ variables: { draftIds: pendingDraftIds } });
    refetch();
    refetchSummary();
  };

  const handleDismissAll = async () => {
    if (!confirm(`Dismiss ${pendingDraftIds.length} drafts?`)) return;
    await dismissAll({ variables: { draftIds: pendingDraftIds } });
    refetch();
    refetchSummary();
  };

  const handleGeneratePending = async () => {
    await generatePending();
    refetch();
    refetchSummary();
  };

  const handleGenerateFollowUps = async () => {
    await generateFollowUps();
    refetch();
    refetchSummary();
  };

  return (
    <Box>
      {/* Summary bar */}
      {summary && (
        <Flex gap="3" mb="4" wrap="wrap" align="center">
          <Badge size="2" color="orange">{summary.pending} pending</Badge>
          <Badge size="2" color="green">{summary.sent} sent</Badge>
          <Badge size="2" color="gray">{summary.dismissed} dismissed</Badge>
          {summary.byClassification.map((c) => (
            <Badge
              key={c.classification}
              size="1"
              color={CLASSIFICATION_COLORS[c.classification] ?? "gray"}
              variant="soft"
            >
              {c.classification}: {c.count}
            </Badge>
          ))}
        </Flex>
      )}

      {/* Actions */}
      <Flex gap="2" mb="4" wrap="wrap">
        <Button
          size="2"
          variant="solid"
          color="green"
          disabled={pendingDraftIds.length === 0 || approvingAll}
          onClick={handleApproveAll}
        >
          {approvingAll ? <Spinner size="1" /> : null}
          Send All ({pendingDraftIds.length})
        </Button>
        <Button
          size="2"
          variant="soft"
          color="red"
          disabled={pendingDraftIds.length === 0}
          onClick={handleDismissAll}
        >
          Dismiss All
        </Button>
        <Button
          size="2"
          variant="soft"
          disabled={generating}
          onClick={handleGeneratePending}
        >
          {generating ? <Spinner size="1" /> : null}
          Generate Reply Drafts
        </Button>
        <Button
          size="2"
          variant="soft"
          disabled={generatingFollowUps}
          onClick={handleGenerateFollowUps}
        >
          {generatingFollowUps ? <Spinner size="1" /> : null}
          Generate Follow-ups
        </Button>
      </Flex>

      {/* Status filter */}
      <Flex gap="1" mb="3">
        {["pending", "sent", "dismissed"].map((s) => (
          <Button
            key={s}
            size="1"
            variant={statusFilter === s ? "solid" : "ghost"}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </Button>
        ))}
      </Flex>

      {/* Draft list */}
      {loading && !data ? (
        <Flex justify="center" py="8">
          <Spinner size="3" />
        </Flex>
      ) : drafts.length === 0 ? (
        <Callout.Root color="gray">
          <Callout.Text>No {statusFilter} drafts.</Callout.Text>
        </Callout.Root>
      ) : (
        <Flex direction="column" gap="3">
          {drafts.map((draft) => (
            <Box
              key={draft.id}
              className={css({
                border: "1px solid var(--gray-5)",
                borderRadius: "var(--radius-3)",
                padding: "16px",
              })}
            >
              <Flex justify="between" align="start" mb="2">
                <Box>
                  <Flex gap="2" align="center" mb="1">
                    <Text size="2" weight="bold">{draft.contactName}</Text>
                    {draft.classification && (
                      <Badge
                        size="1"
                        color={CLASSIFICATION_COLORS[draft.classification] ?? "gray"}
                        variant="soft"
                      >
                        {draft.classification}
                        {draft.classificationConfidence != null &&
                          ` ${Math.round(draft.classificationConfidence * 100)}%`}
                      </Badge>
                    )}
                    <Badge size="1" variant="surface" color={draft.draftType === "follow_up" ? "orange" : "blue"}>
                      {draft.draftType === "follow_up" ? "Follow-up" : "Reply"}
                    </Badge>
                  </Flex>
                  <Text size="1" color="gray">{draft.contactEmail}</Text>
                  {draft.companyName && (
                    <Text size="1" color="gray"> - {draft.companyName}</Text>
                  )}
                </Box>
                <Text size="1" color="gray">
                  {new Date(draft.createdAt).toLocaleDateString()}
                </Text>
              </Flex>

              <Text size="2" weight="medium" mb="1" style={{ display: "block" }}>
                {draft.subject}
              </Text>

              {editingDraftId === draft.id ? (
                <TextArea
                  size="2"
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  style={{ minHeight: "120px", marginBottom: "8px" }}
                />
              ) : (
                <Text
                  size="1"
                  color="gray"
                  className={css({
                    display: "block",
                    whiteSpace: "pre-wrap",
                    maxHeight: "120px",
                    overflow: "hidden",
                    marginBottom: "8px",
                  })}
                >
                  {draft.bodyText}
                </Text>
              )}

              {draft.status === "pending" && (
                <Flex gap="2">
                  <Button
                    size="1"
                    color="green"
                    disabled={approving}
                    onClick={() => handleApprove(draft.id)}
                  >
                    {approving ? <Spinner size="1" /> : null}
                    Send
                  </Button>
                  {editingDraftId === draft.id ? (
                    <Button
                      size="1"
                      variant="ghost"
                      onClick={() => setEditingDraftId(null)}
                    >
                      Cancel Edit
                    </Button>
                  ) : (
                    <Button
                      size="1"
                      variant="soft"
                      onClick={() => {
                        setEditingDraftId(draft.id);
                        setEditedBody(draft.bodyText);
                      }}
                    >
                      Edit
                    </Button>
                  )}
                  <Button
                    size="1"
                    variant="soft"
                    color="red"
                    onClick={() => handleDismiss(draft.id)}
                  >
                    Dismiss
                  </Button>
                </Flex>
              )}
            </Box>
          ))}
        </Flex>
      )}
    </Box>
  );
}
