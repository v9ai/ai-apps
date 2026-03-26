import { classifyJob } from "@/lib/langgraph-client";

/**
 * Classify a job for Remote EU eligibility via LangGraph server.
 */
export async function classifyJobForRemoteEU(input: {
  title: string;
  location: string;
  description: string;
  userId?: string;
  sessionId?: string;
}) {
  const result = await classifyJob({
    title: input.title,
    location: input.location,
    description: input.description,
  });

  return {
    isRemoteEU: result.is_remote_eu,
    confidence: result.confidence as "high" | "medium" | "low",
    reason: result.reason,
  };
}

// Export SQL agent for database queries
export { sqlAgent } from "./sql";

// Export SQL generation agent for database operations
export { sqlGenerationAgent } from "./sql-generation-agent";

// Export admin assistant for ops control plane
export { adminAssistantAgent } from "./admin-assistant";

// Export strategy enforcer for optimization strategy validation
export {
  strategyEnforcerTool,
  enforceStrategy,
} from "./strategy-enforcer";
