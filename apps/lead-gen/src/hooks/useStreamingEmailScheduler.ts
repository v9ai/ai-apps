"use client";

/**
 * Hook for using the streaming email scheduler
 * Processes emails one-by-one with real-time progress updates
 */
import { useState, useCallback } from "react";

interface ProgressUpdate {
  stage: string;
  current?: number;
  total?: number;
  contact?: {
    email: string;
    name: string;
    subject?: string;
  };
  message: string;
}

interface CompletionData {
  successCount: number;
  errorCount: number;
  totalContacts: number;
  businessDays: number;
  emailIds: string[];
  message: string;
}

interface UseStreamingSchedulerResult {
  isStreaming: boolean;
  progress: ProgressUpdate[];
  error: string | null;
  completion: CompletionData | null;
  scheduleEmails: (companyId: number) => Promise<void>;
  reset: () => void;
}

export function useStreamingEmailScheduler(): UseStreamingSchedulerResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<CompletionData | null>(null);

  const scheduleEmails = useCallback(async (companyId: number) => {
    setIsStreaming(true);
    setProgress([]);
    setError(null);
    setCompletion(null);

    try {
      const response = await fetch("/api/emails/schedule-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
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

              if (data.type === "progress") {
                setProgress((prev) => [...prev, data.data]);
              } else if (data.type === "error") {
                setError(data.data.message);
                setProgress((prev) => [...prev, data.data]);
              } else if (data.type === "complete") {
                setCompletion(data.data);
                setProgress((prev) => [...prev, data.data]);
              }
            } catch {
              // ignore parse errors for individual SSE messages
            }
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
    } finally {
      setIsStreaming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setProgress([]);
    setError(null);
    setCompletion(null);
    setIsStreaming(false);
  }, []);

  return {
    isStreaming,
    progress,
    error,
    completion,
    scheduleEmails,
    reset,
  };
}
