"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useSendHealthcareChatMessageMutation } from "@/app/__generated__/hooks";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_QUESTIONS = [
  "What does a TG/HDL ratio above 3.5 indicate?",
  "How do statins affect my ratios?",
  "What is the De Ritis ratio?",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sendChat, { loading }] = useSendHealthcareChatMessageMutation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setError(null);
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");

    try {
      const res = await sendChat({
        variables: { input: { messages: next } },
      });
      const answer = res.data?.sendHealthcareChatMessage.answer ?? "";
      const guardIssues =
        res.data?.sendHealthcareChatMessage.guardIssues ?? [];
      const annotated =
        guardIssues.length > 0
          ? `${answer}\n\n⚠️ ${guardIssues.join(" • ")}`
          : answer;
      setMessages((prev) => [...prev, { role: "assistant", content: annotated }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed");
      setMessages((prev) => prev.slice(0, -1));
    }
  }

  return (
    <Box
      px="4"
      style={{
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Flex
        direction="column"
        gap="3"
        flexGrow="1"
        style={{
          overflow: "auto",
          paddingRight: 4,
          paddingTop: 24,
        }}
      >
        {messages.length === 0 && (
          <Flex
            direction="column"
            gap="3"
            align="center"
            style={{ marginTop: 48 }}
          >
            <Text size="3" color="gray" align="center">
              Ask about your blood marker ratios and clinical context.
            </Text>
            <Flex gap="2" wrap="wrap" justify="center">
              {STARTER_QUESTIONS.map((q) => (
                <Badge
                  key={q}
                  color="blue"
                  variant="soft"
                  style={{ cursor: "pointer", userSelect: "none" }}
                  onClick={() => send(q)}
                >
                  {q}
                </Badge>
              ))}
            </Flex>
          </Flex>
        )}

        {messages.map((msg, i) => (
          <Flex key={i} justify={msg.role === "user" ? "end" : "start"}>
            <Card
              style={{
                maxWidth: "75%",
                backgroundColor:
                  msg.role === "user" ? "var(--blue-9)" : "var(--gray-a3)",
              }}
            >
              <Text
                size="2"
                style={{
                  whiteSpace: "pre-wrap",
                  color: msg.role === "user" ? "white" : undefined,
                }}
              >
                {msg.content}
              </Text>
            </Card>
          </Flex>
        ))}

        {loading && (
          <Flex justify="start">
            <Card style={{ backgroundColor: "var(--gray-a3)" }}>
              <Text size="2" color="gray">
                Thinking…
              </Text>
            </Card>
          </Flex>
        )}

        {error && (
          <Flex justify="start">
            <Card style={{ backgroundColor: "var(--red-a3)" }}>
              <Text size="2" color="red">
                {error}
              </Text>
            </Card>
          </Flex>
        )}

        <div ref={bottomRef} />
      </Flex>

      <Box
        pt="3"
        pb="4"
        style={{
          borderTop: "1px solid var(--gray-a5)",
          backgroundColor: "var(--color-background)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Flex gap="2">
            <Box flexGrow="1">
              <TextField.Root
                size="3"
                placeholder="Ask about your blood markers…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
              />
            </Box>
            <Button size="3" type="submit" disabled={loading || !input.trim()}>
              Send
            </Button>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}
