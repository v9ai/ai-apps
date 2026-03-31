/**
 * Admin Assistant Agent
 *
 * Ops-grade agent for internal debugging, evidence inspection, and batch reprocessing.
 * Delegates to LangGraph Python server.
 */

import { adminChat } from "@/lib/langgraph-client";

export const adminAssistantAgent = {
  async generate(
    prompt: string,
  ): Promise<{ text: string; error?: never } | { text: null; error: string }> {
    try {
      const result = await adminChat(prompt);
      return { text: result.response };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error from admin agent";
      console.error("[adminAssistantAgent] generate failed:", message);
      return { text: null, error: message };
    }
  },
};
