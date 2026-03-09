import { Eval } from "braintrust";
import { Factuality, Relevance } from "autoevals";
import { trajectoryCases, type TrajectoryCase } from "./datasets/trajectory-cases";
import {
  classifyMetricRisk,
  computeDerivedMetrics,
  computeMetricVelocity,
  METRIC_REFERENCES,
  type MarkerInput,
} from "../lib/embeddings";
import { clinicalFactuality } from "./scorers/clinical-factuality";
import { riskClassification } from "./scorers/risk-classification";
import { trajectoryDirection } from "./scorers/trajectory-direction";

/**
 * Braintrust eval runner for trajectory analysis.
 *
 * Tests the LLM's ability to:
 * 1. Correctly classify metric risk levels
 * 2. Identify trajectory direction (improving/stable/deteriorating)
 * 3. Make factually correct clinical threshold claims
 * 4. Generate factually grounded trajectory summaries
 */

// ---------------------------------------------------------------------------
// Helpers: build the trajectory analysis prompt (mirrors getTrajectoryInsights)
// ---------------------------------------------------------------------------

function buildReferenceContext(): string {
  return Object.entries(METRIC_REFERENCES)
    .map(
      ([, ref]) =>
        `- ${ref.label}: optimal ${ref.optimal[0]}–${ref.optimal[1] === Infinity ? "∞" : ref.optimal[1]}, borderline ${ref.borderline[0]}–${ref.borderline[1]}. ${ref.description}. Ref: ${ref.reference}`
    )
    .join("\n");
}

function buildStateContext(
  markers: MarkerInput[],
  stateIndex: number,
  date: string,
  derivedMetrics: Record<string, number | null>,
  similarity: number | null
): string {
  const classified = Object.entries(derivedMetrics)
    .filter(([, v]) => v != null)
    .map(([k, v]) => {
      const val = v as number;
      const risk = classifyMetricRisk(k, val);
      const ref = METRIC_REFERENCES[k];
      return `${ref?.label ?? k}: ${val.toFixed(4)} [${risk}]`;
    })
    .join(", ");

  const simStr =
    similarity != null
      ? ` | similarity to latest: ${(similarity * 100).toFixed(1)}%`
      : "";

  const markerLines = markers
    .map(
      (m) =>
        `${m.name}: ${m.value} ${m.unit} (ref: ${m.reference_range || "N/A"}) [${m.flag}]`
    )
    .join("\n");

  return `--- State ${stateIndex + 1} (${date})${simStr} ---\nDerived metrics: ${classified || "none"}\n${markerLines}`;
}

function buildVelocityContext(
  velocity: Record<string, number | null>,
  fromDate: string,
  toDate: string,
  daysBetween: number
): string {
  const deltas = Object.entries(velocity)
    .filter(([, d]) => d != null)
    .map(([k, d]) => {
      const ref = METRIC_REFERENCES[k];
      return `${ref?.label ?? k}: ${(d as number).toFixed(6)}/day`;
    })
    .join(", ");

  return `${fromDate} -> ${toDate} (${daysBetween}d): ${deltas || "no common metrics"}`;
}

const SYSTEM_PROMPT = `You are a health trajectory analyst grounded in clinical research. You analyze how a person's overall health state evolves over multiple blood tests.

Use the following evidence-based thresholds for your analysis:
${buildReferenceContext()}

Focus on:
1. Risk classification of each derived metric at each time point (optimal/borderline/elevated)
2. Trajectory direction: improving, stable, or deteriorating — use the rate-of-change data
3. Cosine similarity between states as a measure of overall health stability
4. Clinically significant shifts that may warrant follow-up

When citing a threshold or classification, note the source paper briefly (e.g., "per McLaughlin et al., TG/HDL >3.5 suggests insulin resistance").

Be concise and factual. Remind the user to consult their doctor for medical advice.`;

// ---------------------------------------------------------------------------
// Task function: simulates getTrajectoryInsights
// ---------------------------------------------------------------------------

async function trajectoryTask(
  testCase: TrajectoryCase
): Promise<string> {
  const { markers, daysBetween } = testCase;

  const prevDerived = computeDerivedMetrics(markers.prev);
  const currDerived = computeDerivedMetrics(markers.curr);

  // Build state contexts
  const prevDate = "2025-06-15";
  const currDate =
    daysBetween > 0
      ? new Date(
          new Date(prevDate).getTime() + daysBetween * 24 * 60 * 60 * 1000
        )
          .toISOString()
          .slice(0, 10)
      : prevDate;

  const stateCount = daysBetween > 0 ? 2 : 1;

  const states: string[] = [];
  if (daysBetween > 0) {
    states.push(
      buildStateContext(markers.prev, 0, prevDate, prevDerived, 0.85)
    );
    states.push(
      buildStateContext(markers.curr, 1, currDate, currDerived, 1.0)
    );
  } else {
    states.push(
      buildStateContext(markers.curr, 0, currDate, currDerived, 1.0)
    );
  }

  const context = states.join("\n\n");

  let velocityContext = "";
  if (daysBetween > 0) {
    const velocity = computeMetricVelocity(prevDerived, currDerived, daysBetween);
    velocityContext =
      "\n\nRate of change (per day) between consecutive states:\n" +
      buildVelocityContext(velocity, prevDate, currDate, daysBetween);
  }

  const userContent = `Analyze this health trajectory with ${stateCount} states:\n\n${context}${velocityContext}`;

  // Call the LLM via the @repo/qwen client
  const { QwenClient } = await import("@repo/qwen");
  const qwen = new QwenClient({
    apiKey: process.env.DASHSCOPE_API_KEY!,
    baseURL: process.env.DASHSCOPE_BASE_URL,
  });

  const completion = await qwen.chat({
    model: "qwen-plus",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    temperature: 0.3,
    max_completion_tokens: 1500,
  });

  return completion.choices[0]?.message.content ?? "";
}

// ---------------------------------------------------------------------------
// Run the eval
// ---------------------------------------------------------------------------

Eval("trajectory-analysis", {
  data: () =>
    trajectoryCases.map((tc) => ({
      input: tc,
      expected: tc.groundTruthSummary,
      metadata: {
        id: tc.id,
        description: tc.description,
        daysBetween: tc.daysBetween,
      },
    })),

  task: async (input: TrajectoryCase) => {
    return trajectoryTask(input);
  },

  scores: [
    // Autoeval: factuality — does the output match ground truth facts?
    async (args: { input: TrajectoryCase; output: string; expected: string }) => {
      const result = await Factuality({
        input: args.input.description,
        output: args.output,
        expected: args.expected,
      });
      return {
        name: "Factuality",
        score: result.score ?? 0,
        metadata: result.metadata,
      };
    },

    // Autoeval: relevance — is the output relevant to the trajectory question?
    async (args: { input: TrajectoryCase; output: string; expected: string }) => {
      const result = await Relevance({
        input: `Based on the blood test trajectory, what are the risk levels and direction of change for the derived biomarker ratios?`,
        output: args.output,
        expected: args.expected,
      });
      return {
        name: "Relevance",
        score: result.score ?? 0,
        metadata: result.metadata,
      };
    },

    // Custom: clinical factuality (threshold claims)
    (args: { input: TrajectoryCase; output: string; expected: string }) => {
      return clinicalFactuality({ output: args.output, expected: args.expected });
    },

    // Custom: risk classification accuracy
    (args: { input: TrajectoryCase; output: string; expected: string }) => {
      return riskClassification({
        output: args.output,
        input: {
          markers: args.input.markers,
          expectedRisks: args.input.expectedRisks,
        },
      });
    },

    // Custom: trajectory direction accuracy
    (args: { input: TrajectoryCase; output: string; expected: string }) => {
      return trajectoryDirection({
        output: args.output,
        input: {
          markers: args.input.markers,
          daysBetween: args.input.daysBetween,
          expectedDirection: args.input.expectedDirection,
        },
      });
    },
  ],
});
