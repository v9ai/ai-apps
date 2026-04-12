"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge, Box, Flex, Spinner, Text, TextField } from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { useGetEmailThreadsQuery } from "@/__generated__/hooks";
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

export function ThreadInbox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedThread = searchParams?.get("thread") ? parseInt(searchParams.get("thread")!) : null;

  const [classification, setClassification] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data, loading, error, refetch } = useGetEmailThreadsQuery({
    variables: {
      classification: classification || undefined,
      search: search || undefined,
      limit: 100,
    },
    fetchPolicy: "cache-and-network",
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

        {/* Count */}
        <Flex px="3" py="2" align="center" style={{ borderBottom: "1px solid var(--gray-4)" }}>
          <Text size="1" color="gray">
            {totalCount} conversation{totalCount !== 1 ? "s" : ""}
          </Text>
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
      </Flex>

      {/* Right panel: thread detail */}
      <Box style={{ flex: 1, overflow: "hidden" }}>
        {selectedThread ? (
          <ThreadDetail contactId={selectedThread} />
        ) : (
          <Flex justify="center" align="center" style={{ height: "100%" }}>
            <Flex direction="column" align="center" gap="2">
              <Text size="4" color="gray" weight="medium">Select a conversation</Text>
              <Text size="2" color="gray">Choose a thread from the left to view the full conversation</Text>
            </Flex>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
