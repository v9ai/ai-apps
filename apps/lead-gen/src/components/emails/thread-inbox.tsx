"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge, Box, Flex, Spinner, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon, ArchiveIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { compareDesc, parseISO, isValid } from "date-fns";
import { button } from "@/recipes/button";
import {
  useGetEmailThreadsQuery,
  useGetReceivedEmailsQuery,
  useArchiveEmailMutation,
} from "@/__generated__/hooks";
import { ThreadListItem } from "./thread-list-item";
import { ThreadDetail } from "./thread-detail";

const FILTER_OPTIONS = [
  { value: null, label: "All" },
  { value: "interested", label: "Interested" },
  { value: "not_interested", label: "Not interested" },
  { value: "info_request", label: "Info request" },
  { value: "auto_reply", label: "Auto reply" },
  { value: "bounced", label: "Bounced" },
  { value: "unsubscribe", label: "Unsubscribe" },
] as const;

const CLASSIFICATION_COLORS: Record<string, "green" | "red" | "orange" | "blue" | "gray" | "purple"> = {
  interested: "green",
  not_interested: "red",
  auto_reply: "gray",
  bounced: "orange",
  info_request: "blue",
  unsubscribe: "purple",
};

type UnmatchedEmail = {
  id: number;
  fromEmail?: string | null;
  subject?: string | null;
  receivedAt?: string | null;
  classification?: string | null;
  matchedContactId?: number | null;
  toEmails?: string[] | null;
  htmlContent?: string | null;
  textContent?: string | null;
};

function UnmatchedRow({
  email,
  selected,
  onClick,
}: {
  email: UnmatchedEmail;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      onClick={onClick}
      className={css({
        cursor: "pointer",
        padding: "10px 12px",
        borderLeft: selected ? "3px solid var(--accent-9)" : "3px solid transparent",
        background: selected ? "var(--accent-3)" : "transparent",
        _hover: { background: selected ? "var(--accent-3)" : "var(--gray-3)" },
        transition: "background 0.15s ease",
        borderBottom: "1px solid var(--gray-4)",
      })}
    >
      <Flex justify="between" align="start" gap="2">
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Flex gap="2" align="center" mb="1">
            <Text
              size="2"
              weight="medium"
              style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {email.fromEmail || "Unknown sender"}
            </Text>
            <Badge color="gray" size="1" variant="surface">inbox</Badge>
          </Flex>
          <Text
            size="1"
            color="gray"
            style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {email.subject || "(no subject)"}
          </Text>
        </Box>
        <Flex direction="column" align="end" gap="1" flexShrink="0">
          <Text size="1" color="gray">
            {email.receivedAt
              ? new Date(email.receivedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })
              : ""}
          </Text>
          {email.classification && (
            <Badge
              color={CLASSIFICATION_COLORS[email.classification] ?? "gray"}
              size="1"
              variant="soft"
            >
              {email.classification.replace("_", " ")}
            </Badge>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

function UnmatchedEmailDetail({
  emailId,
  onArchive,
}: {
  emailId: number;
  onArchive?: () => void;
}) {
  const { data, loading, refetch } = useGetReceivedEmailsQuery({
    variables: { limit: 100, archived: false },
    fetchPolicy: "cache-and-network",
  });
  const [archiveEmail, { loading: archiving }] = useArchiveEmailMutation();

  const email = (data?.receivedEmails?.emails ?? []).find((e) => e.id === emailId);

  if (loading && !email) {
    return (
      <Flex justify="center" align="center" style={{ height: "100%" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (!email) {
    return (
      <Flex justify="center" align="center" style={{ height: "100%" }}>
        <Text size="2" color="gray">Email not found.</Text>
      </Flex>
    );
  }

  const handleArchive = async () => {
    await archiveEmail({ variables: { id: emailId } });
    await refetch();
    onArchive?.();
  };

  return (
    <Flex direction="column" style={{ height: "100%", overflow: "auto" }} p="5">
      <Flex justify="between" align="start" gap="3" mb="4">
        <Flex direction="column" gap="1" style={{ flex: 1, minWidth: 0 }}>
          <Text size="4" weight="bold">{email.subject || "(no subject)"}</Text>
          <Flex gap="2" align="center">
            <Text size="2">From: <strong>{email.fromEmail}</strong></Text>
            {email.classification && (
              <Badge
                size="1"
                color={CLASSIFICATION_COLORS[email.classification] ?? "gray"}
              >
                {email.classification.replace("_", " ")}
              </Badge>
            )}
          </Flex>
          <Text size="1" color="gray">
            To: {email.toEmails?.join(", ")}
          </Text>
          <Text size="1" color="gray">
            Received: {email.receivedAt ? new Date(email.receivedAt).toLocaleString() : "Unknown"}
          </Text>
        </Flex>
        <button
          className={button({ variant: "ghost", size: "sm" })}
          onClick={handleArchive}
          disabled={archiving}
          style={{ flexShrink: 0 }}
        >
          <ArchiveIcon /> {archiving ? "Archiving…" : "Archive"}
        </button>
      </Flex>

      <Box
        className={css({
          padding: "16px",
          backgroundColor: "var(--gray-2)",
          borderRadius: "8px",
          fontSize: "var(--font-size-2)",
          lineHeight: "1.6",
          "& a": { color: "var(--accent-11)" },
        })}
      >
        {email.htmlContent ? (
          <div dangerouslySetInnerHTML={{ __html: email.htmlContent }} />
        ) : (
          <Text style={{ whiteSpace: "pre-wrap" }}>{email.textContent || "(empty)"}</Text>
        )}
      </Box>
    </Flex>
  );
}

export function ThreadInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedThread = searchParams?.get("thread") ? parseInt(searchParams.get("thread")!) : null;
  const selectedUnmatched = searchParams?.get("unmatched") ? parseInt(searchParams.get("unmatched")!) : null;

  const [classification, setClassification] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"priority" | "recent">("priority");

  const { data, loading, error, refetch } = useGetEmailThreadsQuery({
    variables: {
      classification: classification || undefined,
      search: search || undefined,
      sortBy,
      limit: 100,
    },
    fetchPolicy: "cache-and-network",
  });

  const { data: receivedData } = useGetReceivedEmailsQuery({
    variables: { limit: 100, archived: false, classification: classification || undefined },
    fetchPolicy: "cache-and-network",
  });

  const threads = data?.emailThreads?.threads ?? [];
  const unmatchedEmails = (receivedData?.receivedEmails?.emails ?? []).filter(
    (e) => !e.matchedContactId,
  );

  const searchLower = search.trim().toLowerCase();
  const filteredUnmatched = searchLower
    ? unmatchedEmails.filter(
        (e) =>
          (e.fromEmail?.toLowerCase() ?? "").includes(searchLower) ||
          (e.subject?.toLowerCase() ?? "").includes(searchLower),
      )
    : unmatchedEmails;

  const toDate = (s: string | null | undefined): Date | null => {
    if (!s) return null;
    const d = parseISO(s);
    return isValid(d) ? d : null;
  };
  const EPOCH = new Date(0);

  type CombinedItem =
    | { kind: "matched"; date: Date; thread: (typeof threads)[number] }
    | { kind: "unmatched"; date: Date; email: (typeof unmatchedEmails)[number] };

  const combined: CombinedItem[] = [
    ...threads.map((t): CombinedItem => ({
      kind: "matched",
      date: toDate(t.lastMessageAt) ?? EPOCH,
      thread: t,
    })),
    ...filteredUnmatched.map((e): CombinedItem => ({
      kind: "unmatched",
      date: toDate(e.receivedAt) ?? EPOCH,
      email: e,
    })),
  ];

  // Always sort chronologically (newest first). Priority mode promotes drafts to the top.
  combined.sort((a, b) => compareDesc(a.date, b.date));

  if (sortBy === "priority") {
    combined.sort((a, b) => {
      const aPriority = a.kind === "matched" && a.thread.hasPendingDraft ? 1 : 0;
      const bPriority = b.kind === "matched" && b.thread.hasPendingDraft ? 1 : 0;
      return bPriority - aPriority;
    });
  }

  const totalCount = combined.length;
  const draftCount = threads.filter((t) => t.hasPendingDraft).length;

  const handleSelectThread = (contactId: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("thread", String(contactId));
    params.delete("unmatched");
    router.push(`/emails?${params.toString()}`);
  };

  const handleSelectUnmatched = (emailId: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("unmatched", String(emailId));
    params.delete("thread");
    router.push(`/emails?${params.toString()}`);
  };

  return (
    <Flex style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      {/* Left panel: thread list */}
      <Flex
        direction="column"
        className={css({
          width: "380px",
          minWidth: "380px",
          borderRight: "1px solid var(--gray-5)",
          overflow: "hidden",
        })}
      >
        {/* Search */}
        <Box p="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <TextField.Root
            placeholder="Search contacts, companies, senders..."
            size="2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="14" width="14" />
            </TextField.Slot>
          </TextField.Root>
        </Box>

        {/* Filter chips */}
        <Flex gap="1" p="3" wrap="wrap" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={button({
                variant: classification === opt.value ? "solid" : "ghost",
                size: "sm",
              })}
              onClick={() => setClassification(opt.value)}
              style={{ fontSize: "var(--font-size-1)" }}
            >
              {opt.label}
            </button>
          ))}
        </Flex>

        {/* Count + Sort toggle */}
        <Flex px="3" py="2" align="center" justify="between" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Text size="1" color="gray">
            {totalCount} item{totalCount !== 1 ? "s" : ""}
            {draftCount > 0 && (
              <Badge size="1" color="green" ml="2">
                {draftCount} drafts
              </Badge>
            )}
          </Text>
          <Flex gap="1">
            <button
              className={button({ variant: sortBy === "priority" ? "solid" : "ghost", size: "sm" })}
              onClick={() => setSortBy("priority")}
              style={{ fontSize: "var(--font-size-1)" }}
            >
              Priority
            </button>
            <button
              className={button({ variant: sortBy === "recent" ? "solid" : "ghost", size: "sm" })}
              onClick={() => setSortBy("recent")}
              style={{ fontSize: "var(--font-size-1)" }}
            >
              Recent
            </button>
          </Flex>
        </Flex>

        {/* Thread list */}
        <Box style={{ flex: 1, overflowY: "auto" }}>
          {loading && !data ? (
            <Flex justify="center" py="8">
              <Spinner size="3" />
            </Flex>
          ) : error ? (
            <Flex p="4">
              <Text size="2" color="red">{error.message}</Text>
            </Flex>
          ) : combined.length === 0 ? (
            <Flex p="4" justify="center">
              <Text size="2" color="gray">No emails found.</Text>
            </Flex>
          ) : (
            combined.map((item) =>
              item.kind === "matched" ? (
                <ThreadListItem
                  key={`t-${item.thread.contactId}`}
                  thread={item.thread}
                  selected={selectedThread === item.thread.contactId}
                  onClick={() => handleSelectThread(item.thread.contactId)}
                />
              ) : (
                <UnmatchedRow
                  key={`u-${item.email.id}`}
                  email={item.email}
                  selected={selectedUnmatched === item.email.id}
                  onClick={() => handleSelectUnmatched(item.email.id)}
                />
              ),
            )
          )}
        </Box>
      </Flex>

      {/* Right panel */}
      <Box style={{ flex: 1, overflow: "hidden" }}>
        {selectedUnmatched ? (
          <UnmatchedEmailDetail
            emailId={selectedUnmatched}
            onArchive={() => {
              const params = new URLSearchParams(searchParams?.toString() || "");
              params.delete("unmatched");
              router.push(`/emails?${params.toString()}`);
            }}
          />
        ) : selectedThread ? (
          <ThreadDetail
            contactId={selectedThread}
            onArchive={() => {
              const params = new URLSearchParams(searchParams?.toString() || "");
              params.delete("thread");
              router.push(`/emails?${params.toString()}`);
              refetch();
            }}
          />
        ) : (
          <Flex justify="center" align="center" style={{ height: "100%" }}>
            <Flex direction="column" align="center" gap="2">
              <Text size="4" color="gray" weight="medium">
                Select a conversation
              </Text>
              <Text size="2" color="gray">
                Choose a thread from the left to view the full conversation
              </Text>
            </Flex>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
