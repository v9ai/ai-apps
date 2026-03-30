"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Badge, Box, Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { css } from "styled-system/css";
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
    <Box
      px="4"
      className={css({
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
      })}
    >
      {/* Message list */}
      <Flex
        direction="column"
        gap="3"
        flexGrow="1"
        className={css({ overflow: "auto", paddingRight: "4px", paddingTop: "24px" })}
      >
        {messages.length === 0 && (
          <Flex
            direction="column"
            gap="3"
            align="center"
            className={css({ marginTop: "48px" })}
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
                  className={css({ cursor: "pointer", userSelect: "none" })}
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
              className={css({
                maxWidth: "75%",
                backgroundColor:
                  msg.role === "user" ? "var(--blue-9)" : "var(--gray-a3)",
              })}
            >
              <Text
                size="2"
                className={css({
                  whiteSpace: "pre-wrap",
                  color: msg.role === "user" ? "white" : undefined,
                })}
              >
                {msg.content}
              </Text>
            </Card>
          </Flex>
        ))}

        {isPending && (
          <Flex justify="start">
            <Card className={css({ backgroundColor: "var(--gray-a3)" })}>
              <Text size="2" color="gray">
                Thinking…
              </Text>
            </Card>
          </Flex>
        )}

        <div ref={bottomRef} />
      </Flex>

      {/* Input bar */}
      <Box
        pt="3"
        pb="4"
        className={css({
          borderTop: "1px solid var(--gray-a5)",
          backgroundColor: "var(--color-background)",
        })}
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
                disabled={isPending}
              />
            </Box>
            <Button size="3" type="submit" disabled={isPending || !input.trim()}>
              Send
            </Button>
          </Flex>
        </form>
      </Box>
    </Box>
  );
}
