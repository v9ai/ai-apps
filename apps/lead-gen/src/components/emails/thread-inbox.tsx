"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge, Box, Flex, Spinner, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { useGetEmailThreadsQuery, useGetReceivedEmailsQuery } from "@/__generated__/hooks";
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

function UnmatchedEmailList({
  selectedId,
  onSelect,
}: {
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const { data, loading, error } = useGetReceivedEmailsQuery({
    variables: { limit: 100, archived: false },
    fetchPolicy: "cache-and-network",
  });

  const unmatched = (data?.receivedEmails?.emails ?? []).filter(
    (e) => !e.matchedContactId,
  );

  if (loading && !data) {
    return (
      <Flex justify="center" py="8">
        <Spinner size="3" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex p="4">
        <Text size="2" color="red">{error.message}</Text>
      </Flex>
    );
  }

  if (unmatched.length === 0) {
    return (
      <Flex p="4" justify="center">
        <Text size="2" color="gray">No unmatched emails.</Text>
      </Flex>
    );
  }

  return (
    <>
      <Flex px="3" py="2" style={{ borderBottom: "1px solid var(--gray-4)" }}>
        <Text size="1" color="gray">
          {unmatched.length} unmatched email{unmatched.length !== 1 ? "s" : ""}
        </Text>
      </Flex>
      <Box style={{ flex: 1, overflowY: "auto" }}>
        {unmatched.map((email) => (
          <Box
            key={email.id}
            onClick={() => onSelect(email.id)}
            className={css({
              padding: "12px 16px",
              cursor: "pointer",
              borderBottom: "1px solid var(--gray-3)",
              backgroundColor: selectedId === email.id ? "var(--accent-3)" : "transparent",
              _hover: { backgroundColor: selectedId === email.id ? "var(--accent-3)" : "var(--gray-2)" },
            })}
          >
            <Flex justify="between" align="start" gap="2">
              <Text size="2" weight="medium" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {email.fromEmail || "Unknown sender"}
              </Text>
              <Text size="1" color="gray" style={{ whiteSpace: "nowrap", flexShrink: 0 }}>
                {email.receivedAt
                  ? new Date(email.receivedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </Text>
            </Flex>
            <Text size="2" color="gray" style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {email.subject || "(no subject)"}
            </Text>
            {email.classification && (
              <Badge
                size="1"
                mt="1"
                color={
                  email.classification === "interested"
                    ? "green"
                    : email.classification === "info_request"
                      ? "blue"
                      : email.classification === "not_interested"
                        ? "red"
                        : "gray"
                }
              >
                {email.classification.replace("_", " ")}
              </Badge>
            )}
          </Box>
        ))}
      </Box>
    </>
  );
}

function UnmatchedEmailDetail({ emailId }: { emailId: number }) {
  const { data, loading } = useGetReceivedEmailsQuery({
    variables: { limit: 100, archived: false },
    fetchPolicy: "cache-and-network",
  });

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

  return (
    <Flex direction="column" style={{ height: "100%", overflow: "auto" }} p="5">
      <Flex direction="column" gap="1" mb="4">
        <Text size="4" weight="bold">{email.subject || "(no subject)"}</Text>
        <Flex gap="2" align="center">
          <Text size="2">From: <strong>{email.fromEmail}</strong></Text>
          {email.classification && (
            <Badge
              size="1"
              color={
                email.classification === "interested"
                  ? "green"
                  : email.classification === "info_request"
                    ? "blue"
                    : email.classification === "not_interested"
                      ? "red"
                      : "gray"
              }
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

  const [classification, setClassification] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"priority" | "recent">("priority");
  const [viewMode, setViewMode] = useState<"matched" | "unmatched">("matched");
  const [selectedUnmatched, setSelectedUnmatched] = useState<number | null>(null);

  const { data, loading, error, refetch } = useGetEmailThreadsQuery({
    variables: {
      classification: classification || undefined,
      search: search || undefined,
      sortBy,
      limit: 100,
    },
    fetchPolicy: "cache-and-network",
    skip: viewMode === "unmatched",
  });

  const threads = data?.emailThreads?.threads ?? [];
  const totalCount = data?.emailThreads?.totalCount ?? 0;

  const handleSelectThread = (contactId: number) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("thread", String(contactId));
    router.push(`/admin/emails?${params.toString()}`);
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
        {/* View mode toggle */}
        <Flex gap="1" p="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <button
            className={button({ variant: viewMode === "matched" ? "solid" : "ghost", size: "sm" })}
            onClick={() => { setViewMode("matched"); setSelectedUnmatched(null); }}
            style={{ fontSize: "var(--font-size-1)", flex: 1 }}
          >
            Matched
          </button>
          <button
            className={button({ variant: viewMode === "unmatched" ? "solid" : "ghost", size: "sm" })}
            onClick={() => setViewMode("unmatched")}
            style={{ fontSize: "var(--font-size-1)", flex: 1 }}
          >
            Unmatched
          </button>
        </Flex>

        {viewMode === "matched" ? (
          <>
            {/* Search */}
            <Box p="3" style={{ borderBottom: "1px solid var(--gray-4)" }}>
              <TextField.Root
                placeholder="Search contacts, companies..."
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
                {totalCount} conversation{totalCount !== 1 ? "s" : ""}
                {threads.filter((t) => t.hasPendingDraft).length > 0 && (
                  <Badge size="1" color="green" ml="2">
                    {threads.filter((t) => t.hasPendingDraft).length} drafts
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
              ) : threads.length === 0 ? (
                <Flex p="4" justify="center">
                  <Text size="2" color="gray">No conversations found.</Text>
                </Flex>
              ) : (
                threads.map((thread) => (
                  <ThreadListItem
                    key={thread.contactId}
                    thread={thread}
                    selected={selectedThread === thread.contactId}
                    onClick={() => handleSelectThread(thread.contactId)}
                  />
                ))
              )}
            </Box>
          </>
        ) : (
          <UnmatchedEmailList
            selectedId={selectedUnmatched}
            onSelect={setSelectedUnmatched}
          />
        )}
      </Flex>

      {/* Right panel: thread detail or unmatched email detail */}
      <Box style={{ flex: 1, overflow: "hidden" }}>
        {viewMode === "unmatched" && selectedUnmatched ? (
          <UnmatchedEmailDetail emailId={selectedUnmatched} />
        ) : viewMode === "matched" && selectedThread ? (
          <ThreadDetail
            contactId={selectedThread}
            onArchive={() => {
              const params = new URLSearchParams(searchParams?.toString() || "");
              params.delete("thread");
              router.push(`/admin/emails?${params.toString()}`);
              refetch();
            }}
          />
        ) : (
          <Flex justify="center" align="center" style={{ height: "100%" }}>
            <Flex direction="column" align="center" gap="2">
              <Text size="4" color="gray" weight="medium">
                {viewMode === "unmatched" ? "Select an email" : "Select a conversation"}
              </Text>
              <Text size="2" color="gray">
                {viewMode === "unmatched"
                  ? "Choose an unmatched email from the left to view its content"
                  : "Choose a thread from the left to view the full conversation"}
              </Text>
            </Flex>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
