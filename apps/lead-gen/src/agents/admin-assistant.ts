/**
 * Admin Assistant Agent
 *
 * Ops-grade agent for internal debugging, evidence inspection, and batch reprocessing.
 * Delegates to LangGraph Python server.
 */

import { adminChat } from "@/lib/langgraph-client";

export const adminAssistantAgent = {
  async generate(prompt: string) {
    const result = await adminChat(prompt);
    return { text: result.response };
  },
};
