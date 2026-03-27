"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Badge, Box, Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { sendChatMessage } from "./actions";

type Message = { role: "user" | "assistant"; content: string };

const STARTER_QUESTIONS = [
  "What does a TG/HDL ratio above 3.5 indicate?",
  "How do statins affect my ratios?",
  "What is the De Ritis ratio?",
];

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPending]);

  function send(text: string) {
    if (!text.trim()) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    startTransition(async () => {
      const answer = await sendChatMessage(next);
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    });
  }

  return (
    <Box py="8" style={{ maxWidth: 800, margin: "0 auto" }}>
      <Flex direction="column" gap="4" style={{ height: "calc(100vh - 180px)" }}>
        {/* Message list */}
        <Flex
          direction="column"
          gap="3"
          flexGrow="1"
          style={{ overflowY: "auto", paddingRight: 4 }}
        >
          {messages.length === 0 && (
            <Flex direction="column" gap="3" align="center" style={{ marginTop: 48 }}>
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
            <Flex
              key={i}
              justify={msg.role === "user" ? "end" : "start"}
            >
              <Card
                style={{
                  maxWidth: "75%",
                  backgroundColor:
                    msg.role === "user"
                      ? "var(--blue-9)"
                      : "var(--gray-a3)",
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

          {isPending && (
            <Flex justify="start">
              <Card style={{ backgroundColor: "var(--gray-a3)" }}>
                <Text size="2" color="gray">
                  Thinking…
                </Text>
              </Card>
            </Flex>
          )}

          <div ref={bottomRef} />
        </Flex>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <Flex gap="2">
            <Box flexGrow="1">
              <TextField.Root
                placeholder="Ask about your blood markers…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isPending}
              />
            </Box>
            <Button type="submit" disabled={isPending || !input.trim()}>
              Send
            </Button>
          </Flex>
        </form>
      </Flex>
    </Box>
  );
}
