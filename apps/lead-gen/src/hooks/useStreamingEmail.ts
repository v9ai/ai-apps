"use client";

import { useState, useCallback, useRef } from "react";
import { emailSchema, type EmailContent } from "@/lib/email/schema";

interface GenerateEmailInput {
  recipientName: string;
  recipientContext?: string;
  companyName?: string;
  instructions?: string;
  linkedinPostContent?: string;
}

interface UseStreamingEmailResult {
  content: EmailContent | null;
  // Pass-1 (draft) + pass-2 (refined) outputs from the LangGraph compose flow.
  // refinedContent mirrors content; draftContent powers the "Use draft instead"
  // toggle in the ComposeFromLinkedIn UI.
  draftContent: EmailContent | null;
  refinedContent: EmailContent | null;
  partialContent: string;
  isStreaming: boolean;
  error: string | null;
  generate: (input: GenerateEmailInput) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useStreamingEmail(): UseStreamingEmailResult {
  const [content, setContent] = useState<EmailContent | null>(null);
  const [draftContent, setDraftContent] = useState<EmailContent | null>(null);
  const [refinedContent, setRefinedContent] = useState<EmailContent | null>(null);
  const [partialContent, setPartialContent] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (input: GenerateEmailInput) => {
    setIsStreaming(true);
    setError(null);
    setContent(null);
    setDraftContent(null);
    setRefinedContent(null);
    setPartialContent("");

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/emails/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "chunk") {
                setPartialContent(data.accumulated);
              } else if (data.type === "draft") {
                const validated = emailSchema.parse(data.data);
                setDraftContent(validated);
              } else if (data.type === "refined") {
                const validated = emailSchema.parse(data.data);
                setRefinedContent(validated);
                setContent(validated);
                setPartialContent("");
              } else if (data.type === "complete") {
                const validated = emailSchema.parse(data.data);
                // The "complete" event carries the same final {subject, body}
                // as "refined" plus bookkeeping; ensure content is set even if
                // the "refined" event was missed (older server, fallback path).
                setContent(validated);
                setRefinedContent((prev) => prev ?? validated);
                setPartialContent("");
              } else if (data.type === "error") {
                setError(data.error);
              }
            } catch {
              // ignore parse errors for individual SSE messages
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setContent(null);
    setDraftContent(null);
    setRefinedContent(null);
    setPartialContent("");
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    content,
    draftContent,
    refinedContent,
    partialContent,
    isStreaming,
    error,
    generate,
    stop,
    reset,
  };
}
