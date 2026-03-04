import { createLogger } from "@mastra/core/logger";
import { Mastra } from "@mastra/core/mastra";
// import { LibSQLStore, LibSQLVector } from "@mastra/libsql"; // Disabled: Not compatible with D1

import { storyTellerAgent, therapeuticAgent } from "./agents";
import { generateTherapyResearchWorkflow } from "@/src/workflows";
import {
  CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_DATABASE_ID,
  CLOUDFLARE_D1_TOKEN,
} from "@/src/config/d1";

// Suppress AI SDK warnings (DeepSeek JSON schema compatibility mode)
if (typeof globalThis !== "undefined") {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
}

// TODO: Configure storage for message history, traces, and evals
// LibSQLStore is not compatible with D1. Need to implement D1-compatible storage adapter.
// const storage = new LibSQLStore({
//   id: "mastra-store",
//   url: "...",
//   authToken: "...",
// });
const storage = null as any; // Temporary: Storage disabled pending D1 adapter

// TODO: Configure vectors for RAG (goal context, research, notes)
// LibSQLVector is not compatible with D1. Need to implement D1-compatible vector solution.
// const vectors = {
//   goalContext: new LibSQLVector({
//     id: "goal-context-v1",
//     url: "...",
//     authToken: "...",
//   }),
// };
const vectors = {}; // Temporary: Vectors disabled pending D1 adapter

export const mastra = new Mastra({
  agents: {
    storyTellerAgent,
    therapeuticAgent,
  },
  storage,
  vectors,
  workflows: {
    generateTherapyResearchWorkflow,
  },
  logger: createLogger({
    name: "Mastra",
    level: "info",
  }),
});
