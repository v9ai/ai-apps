/**
 * OpenRouter Agent Helpers
 *
 * Agent templates that delegate to the LangGraph Python server.
 */

import { adminChat } from "@/lib/langgraph-client";
import type { OpenRouterOptions } from "./config";
import { GOAL_CONTEXT_LINE } from "@/constants/goal";

/**
 * Agent configuration options
 */
export interface AgentConfig {
  id?: string;
  name: string;
  instructions: string;
  model?: "chat" | "r1" | "r1DistillQwen32B" | "r1DistillLlama70B" | "coder";
  openrouterOptions?: OpenRouterOptions;
}

/**
 * Create a general-purpose agent via LangGraph
 */
export function createChatAgent(config: AgentConfig) {
  return {
    id: config.id || `chat-agent-${Date.now()}`,
    name: config.name,
    async generate(prompt: string) {
      const result = await adminChat(prompt, config.instructions);
      return { text: result.response };
    },
  };
}

/**
 * Create a reasoning agent via LangGraph
 */
export function createReasoningAgent(config: Omit<AgentConfig, "model">) {
  return {
    id: config.id || `reasoning-agent-${Date.now()}`,
    name: config.name,
    async generate(prompt: string) {
      const result = await adminChat(prompt, config.instructions);
      return { text: result.response };
    },
  };
}

/**
 * Create a coding agent via LangGraph
 */
export function createCodingAgent(config: Omit<AgentConfig, "model">) {
  return {
    id: config.id || `coding-agent-${Date.now()}`,
    name: config.name,
    async generate(prompt: string) {
      const result = await adminChat(prompt, config.instructions);
      return { text: result.response };
    },
  };
}

/**
 * Pre-configured agent templates
 */
export const agentTemplates = {
  assistant: (instructions?: string) =>
    createChatAgent({
      name: "Assistant",
      instructions:
        instructions || `${GOAL_CONTEXT_LINE} You are a helpful assistant.`,
      model: "chat",
    }),

  reasoning: (instructions?: string) =>
    createReasoningAgent({
      name: "Reasoning Assistant",
      instructions:
        instructions ||
        `${GOAL_CONTEXT_LINE} You are a reasoning assistant. Think through problems step by step.`,
    }),

  coder: (instructions?: string) =>
    createCodingAgent({
      name: "Coding Assistant",
      instructions:
        instructions ||
        `${GOAL_CONTEXT_LINE} You are an expert coding assistant specialized in software development.`,
    }),
} as const;
