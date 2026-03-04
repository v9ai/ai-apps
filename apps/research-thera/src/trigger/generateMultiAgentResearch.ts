/**
 * Multi-Agent Research Task — Trigger.dev
 *
 * Spawns 3 specialized research agents in parallel that search for papers
 * with different query focuses, then aggregates the results.
 *
 * Payload: { jobId, goalId, userId, userEmail }
 */

import { task, tasks, logger } from "@trigger.dev/sdk/v3";
import { generateTherapyResearchWorkflow } from "@/src/workflows/generateTherapyResearch.workflow";
import { d1Tools } from "@/src/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MultiAgentResearchPayload {
  jobId: string;
  goalId: number;
  userId: string;
  userEmail: string;
  parentJobId?: string;
}

interface AgentResult {
  agentType: string;
  success: boolean;
  paperCount: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Individual Agent Task
// ---------------------------------------------------------------------------

export const multiAgentResearchTask = task({
  id: "multi-agent-research",
  maxDuration: 900,
  retry: {
    maxAttempts: 1,
  },
  onFailure: async ({
    payload,
    error,
  }: {
    payload: MultiAgentResearchPayload & { agentType?: string };
    error: unknown;
  }) => {
    const message =
      error instanceof Error ? error.message : "Multi-agent research failed";
    logger.error("multi-agent-research.agent_failed", {
      jobId: payload.jobId,
      goalId: payload.goalId,
      agentType: payload.agentType,
      error: message,
    });

    if (payload.jobId) {
      await d1Tools
        .updateGenerationJob(payload.jobId, {
          status: "FAILED",
          error: JSON.stringify({ message, agentType: payload.agentType }),
        })
        .catch(() => {});
    }
  },
  run: async (payload: MultiAgentResearchPayload & { agentType?: string }) => {
    const { jobId, goalId, userEmail, parentJobId } = payload;

    logger.info("multi-agent-research.agent_started", {
      jobId,
      goalId,
      parentJobId,
    });

    // Run the standard research workflow
    const run = await generateTherapyResearchWorkflow.createRun();
    const result = await run.start({
      inputData: {
        userId: userEmail,
        goalId,
        jobId,
      },
    });

    if (result.status === "success") {
      const paperCount = result.result?.count ?? 0;

      logger.info("multi-agent-research.agent_succeeded", {
        jobId,
        goalId,
        paperCount,
      });

      await d1Tools.updateGenerationJob(jobId, {
        status: "SUCCEEDED",
        progress: 100,
        result: JSON.stringify({
          count: paperCount,
        }),
      });

      return {
        success: true,
        paperCount,
      };
    } else {
      const reason = `Workflow finished with status: ${result.status}`;
      logger.warn("multi-agent-research.agent_non_success", {
        jobId,
        goalId,
        status: result.status,
      });

      await d1Tools.updateGenerationJob(jobId, {
        status: "FAILED",
        error: JSON.stringify({ message: reason }),
      });

      throw new Error(reason);
    }
  },
});

// ---------------------------------------------------------------------------
// Aggregator Task
// ---------------------------------------------------------------------------

export const aggregateResearchResultsTask = task({
  id: "aggregate-research-results",
  maxDuration: 300,
  retry: {
    maxAttempts: 1,
  },
  run: async (payload: {
    parentJobId: string;
    agentJobIds: string[];
    goalId: number;
    userEmail: string;
  }) => {
    const { parentJobId, agentJobIds, goalId, userEmail } = payload;

    logger.info("aggregate-research-results.started", {
      parentJobId,
      agentJobIds,
      goalId,
    });

    // Collect results from all agents
    const agentResults: AgentResult[] = [];
    for (const agentJobId of agentJobIds) {
      try {
        const job = await d1Tools.getGenerationJob(agentJobId);
        if (job?.result) {
          const parsed = JSON.parse(job.result);
          agentResults.push({
            agentType: "research",
            success: job.status === "SUCCEEDED",
            paperCount: parsed.count || 0,
            error: job.error ? String(job.error.message) : undefined,
          });
        }
      } catch (err) {
        logger.error("aggregate-research-results.agent_result_error", {
          agentJobId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const totalPapers = agentResults.reduce(
      (sum, r) => sum + r.paperCount,
      0
    );

    const successfulAgents = agentResults.filter((r) => r.success).length;

    logger.info("aggregate-research-results.completed", {
      parentJobId,
      totalPapers,
      successfulAgents,
    });

    // Update parent job with aggregated results
    await d1Tools.updateGenerationJob(parentJobId, {
      status: "SUCCEEDED",
      progress: 100,
      result: JSON.stringify({
        multiAgent: true,
        agents: agentResults,
        totalPapers,
        successfulAgents,
        aggregatedAt: new Date().toISOString(),
      }),
    });

    return {
      success: true,
      totalPapers,
      successfulAgents,
    };
  },
});

// ---------------------------------------------------------------------------
// Orchestrator Task - Spawns all agents
// ---------------------------------------------------------------------------

export const orchestrateMultiAgentResearchTask = task({
  id: "orchestrate-multi-agent-research",
  maxDuration: 60,
  retry: {
    maxAttempts: 0,
  },
  run: async (payload: {
    jobId: string;
    goalId: number;
    userId: string;
    userEmail: string;
  }) => {
    const { jobId, goalId, userId, userEmail } = payload;

    logger.info("orchestrate-multi-agent-research.started", {
      jobId,
      goalId,
      userEmail,
    });

    // Update parent job to show orchestration started
    await d1Tools.updateGenerationJob(jobId, {
      status: "RUNNING",
      progress: 5,
      result: JSON.stringify({
        multiAgent: true,
        phase: "spawning_agents",
        agents: ["agent1", "agent2", "agent3"],
      }),
    });

    // Spawn 3 parallel research agents
    const agentJobIds: string[] = [];
    const agentPromises = [1, 2, 3].map(async (num) => {
      const agentJobId = crypto.randomUUID();
      agentJobIds.push(agentJobId);

      // Create individual agent job
      await d1Tools.createGenerationJob(
        agentJobId,
        userEmail,
        "RESEARCH",
        goalId
      );

      logger.info("orchestrate-multi-agent-research.spawning_agent", {
        agentNum: num,
        agentJobId,
        parentJobId: jobId,
      });

      // Trigger the agent task
      await tasks.trigger("multi-agent-research", {
        jobId: agentJobId,
        goalId,
        userId,
        userEmail,
        parentJobId: jobId,
      } as MultiAgentResearchPayload);
    });

    // Wait for all agents to be spawned
    await Promise.all(agentPromises);

    logger.info("orchestrate-multi-agent-research.agents_spawned", {
      jobId,
      agentJobIds,
      count: agentJobIds.length,
    });

    // Update parent job to show agents are running
    await d1Tools.updateGenerationJob(jobId, {
      progress: 10,
      result: JSON.stringify({
        multiAgent: true,
        phase: "agents_running",
        agentJobIds,
        agents: agentJobIds.map((id, idx) => ({
          num: idx + 1,
          jobId: id,
          status: "RUNNING",
        })),
      }),
    });

    return {
      success: true,
      agentJobIds,
      message: `Spawned ${agentJobIds.length} parallel research agents`,
    };
  },
});
