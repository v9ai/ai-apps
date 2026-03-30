"use client";

import { useState, useRef, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Button,
  IconButton,
  TextArea,
  Spinner,
  AlertDialog,
  Separator,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, PaperPlaneIcon } from "@radix-ui/react-icons";
import {
  useGetConversationsForIssueQuery,
  useCreateConversationMutation,
  useSendConversationMessageMutation,
  useDeleteConversationMutation,
} from "@/app/__generated__/hooks";

interface Props {
  issueId: number;
}

interface Message {
  id: number;
  role: string;
  content: string;
  createdAt: string;
}

interface Conversation {
  id: number;
  title: string | null | undefined;
  messages: Message[];
  createdAt: string;
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <Flex justify={isUser ? "end" : "start"} mb="2">
      <Box
        style={{
          maxWidth: "80%",
          background: isUser ? "var(--indigo-9)" : "var(--gray-3)",
          color: isUser ? "white" : "var(--gray-12)",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          padding: "10px 14px",
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
        }}
      >
        <Text size="2">{message.content}</Text>
      </Box>
    </Flex>
  );
}

function ConversationThread({ conversation, issueId }: { conversation: Conversation; issueId: number }) {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [sendMessage, { loading: sending }] = useSendConversationMessageMutation({
    refetchQueries: ["GetConversationsForIssue"],
  });

  const [deleteConversation, { loading: deleting }] = useDeleteConversationMutation({
    refetchQueries: ["GetConversationsForIssue"],
  });

  useEffect(() => {
    if (expanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [expanded, conversation.messages.length]);

  async function handleSend() {
    const msg = input.trim();
    if (!msg || sending) return;
    setInput("");
    await sendMessage({ variables: { conversationId: conversation.id, message: msg } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const lastMessage = conversation.messages[conversation.messages.length - 1];

  return (
    <Card variant="surface">
      <Flex direction="column" gap="0">
        {/* Header */}
        <Flex
          justify="between"
          align="center"
          p="3"
          style={{ cursor: "pointer" }}
          onClick={() => setExpanded((v) => !v)}
        >
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="2" weight="medium">
              {conversation.title || "Conversation"}
            </Text>
            {!expanded && lastMessage && (
              <Text size="1" color="gray" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>
                {lastMessage.role === "assistant" ? "AI: " : "You: "}
                {lastMessage.content}
              </Text>
            )}
            <Text size="1" color="gray">
              {new Date(conversation.createdAt).toLocaleDateString()} · {conversation.messages.length} message{conversation.messages.length !== 1 ? "s" : ""}
            </Text>
          </Flex>
          <Flex gap="2" align="center">
            <IconButton
              size="1"
              variant="ghost"
              color="red"
              onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
            >
              <TrashIcon />
            </IconButton>
            {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Flex>
        </Flex>

        {/* Messages */}
        {expanded && (
          <>
            <Separator size="4" />
            <Box p="3" style={{ maxHeight: 400, overflowY: "auto" }}>
              {conversation.messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {sending && (
                <Flex justify="start" mb="2">
                  <Box
                    style={{
                      background: "var(--gray-3)",
                      borderRadius: "12px 12px 12px 2px",
                      padding: "10px 14px",
                    }}
                  >
                    <Spinner size="1" />
                  </Box>
                </Flex>
              )}
              <div ref={messagesEndRef} />
            </Box>
            <Separator size="4" />
            <Flex gap="2" p="3" align="end">
              <TextArea
                style={{ flex: 1, resize: "none" }}
                placeholder="Ask about this issue… (Enter to send, Shift+Enter for newline)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                rows={2}
              />
              <IconButton size="2" disabled={!input.trim() || sending} onClick={handleSend}>
                <PaperPlaneIcon />
              </IconButton>
            </Flex>
          </>
        )}
      </Flex>

      {/* Delete Dialog */}
      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Content style={{ maxWidth: 400 }}>
          <AlertDialog.Title>Delete Conversation</AlertDialog.Title>
          <AlertDialog.Description>
            This will permanently delete the conversation and all its messages.
          </AlertDialog.Description>
          <Flex gap="3" justify="end" mt="4">
            <AlertDialog.Cancel>
              <Button variant="soft" color="gray">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button
                color="red"
                disabled={deleting}
                onClick={() => deleteConversation({ variables: { id: conversation.id } })}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
    </Card>
  );
}

export function ConversationsSection({ issueId }: Props) {
  const [newMessage, setNewMessage] = useState("");
  const [startOpen, setStartOpen] = useState(false);

  const { data, loading } = useGetConversationsForIssueQuery({
    variables: { issueId },
  });

  const [createConversation, { loading: creating }] = useCreateConversationMutation({
    refetchQueries: ["GetConversationsForIssue"],
    onCompleted: () => {
      setNewMessage("");
      setStartOpen(false);
    },
  });

  const conversations = (data?.conversationsForIssue ?? []) as Conversation[];

  async function handleStart() {
    const msg = newMessage.trim();
    if (!msg || creating) return;
    await createConversation({ variables: { issueId, message: msg } });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleStart();
    }
  }

  return (
    <Card>
      <Flex direction="column" gap="4" p="4">
        <Flex justify="between" align="start" wrap="wrap" gap="3">
          <Box>
            <Heading size="3" mb="1">Conversations ({conversations.length})</Heading>
            <Text size="2" color="gray">
              Discuss this issue with an AI therapeutic advisor.
            </Text>
          </Box>
          <Button onClick={() => setStartOpen((v) => !v)} variant={startOpen ? "soft" : "solid"}>
            <PlusIcon />
            {startOpen ? "Cancel" : "Start Conversation"}
          </Button>
        </Flex>

        {startOpen && (
          <Flex gap="2" align="end">
            <TextArea
              style={{ flex: 1, resize: "none" }}
              placeholder="What would you like to discuss about this issue? (Enter to send)"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={creating}
              rows={3}
              autoFocus
            />
            <Button disabled={!newMessage.trim() || creating} onClick={handleStart}>
              {creating ? <Spinner /> : <PaperPlaneIcon />}
              {creating ? "Starting..." : "Send"}
            </Button>
          </Flex>
        )}

        {loading && <Spinner />}

        {conversations.length === 0 && !loading && !startOpen && (
          <Text size="2" color="gray">No conversations yet. Start one to discuss this issue with an AI advisor.</Text>
        )}

        <Flex direction="column" gap="3">
          {conversations.map((c) => (
            <ConversationThread key={c.id} conversation={c} issueId={issueId} />
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}
