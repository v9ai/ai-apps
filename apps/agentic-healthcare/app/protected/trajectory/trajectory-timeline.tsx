import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, Card, Flex, Text, Tooltip } from "@radix-ui/themes";
import { METRIC_REFERENCES, classifyMetricRisk } from "@/lib/embeddings";
import type { TrajectoryState, MetricRisk } from "./actions";

function similarityColor(sim: number): "green" | "yellow" | "orange" | "red" {
  if (sim >= 0.95) return "green";
  if (sim >= 0.85) return "yellow";
  if (sim >= 0.7) return "orange";
  return "red";
}

function riskColor(
  risk: MetricRisk
): "green" | "yellow" | "orange" | "red" | "blue" {
  if (risk === "optimal") return "green";
  if (risk === "borderline") return "yellow";
  if (risk === "elevated") return "red";
  return "blue"; // low
}

const METRIC_LABELS: Record<string, string> = {
  hdl_ldl_ratio: "HDL/LDL",
  total_cholesterol_hdl_ratio: "TC/HDL",
  triglyceride_hdl_ratio: "TG/HDL",
  glucose_triglyceride_index: "TyG Index",
  neutrophil_lymphocyte_ratio: "NLR",
  bun_creatinine_ratio: "BUN/Cr",
  ast_alt_ratio: "De Ritis",
};

export async function TrajectoryTimeline() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data } = await supabase.rpc(
    "get_health_trajectory_with_similarity"
  );

  const trajectory = (data ?? []) as TrajectoryState[];

  if (trajectory.length === 0) {
    return (
      <Text size="2" color="gray">
        No health states yet. Upload blood tests to start building your
        trajectory.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="3">
      {trajectory.map((state, i) => {
        const date = state.test_date
          ? new Date(state.test_date).toLocaleDateString()
          : new Date(state.created_at).toLocaleDateString();
        const isLatest = i === trajectory.length - 1;
        const metrics = Object.entries(state.derived_metrics).filter(
          ([, v]) => v != null
        );

        return (
          <Card key={state.id}>
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Flex align="center" gap="2">
                  <Text size="2" weight="bold">
                    {state.file_name}
                  </Text>
                  <Text size="1" color="gray">
                    {date}
                  </Text>
                  {isLatest && (
                    <Badge color="blue" variant="soft" size="1">
                      Latest
                    </Badge>
                  )}
                </Flex>
                {state.similarity_to_latest != null && !isLatest && (
                  <Badge
                    color={similarityColor(state.similarity_to_latest)}
                    variant="soft"
                    size="1"
                  >
                    {(state.similarity_to_latest * 100).toFixed(1)}% similar
                  </Badge>
                )}
              </Flex>

              {metrics.length > 0 && (
                <Flex gap="2" wrap="wrap">
                  {metrics.map(([key, val]) => {
                    const v = val as number;
                    const risk = classifyMetricRisk(key, v);
                    const ref = METRIC_REFERENCES[key];
                    return (
                      <Tooltip
                        key={key}
                        content={
                          ref
                            ? `${ref.description}. Ref: ${ref.reference}`
                            : key
                        }
                      >
                        <Badge
                          variant="soft"
                          size="1"
                          color={riskColor(risk)}
                        >
                          {METRIC_LABELS[key] ?? key}: {v.toFixed(2)}
                        </Badge>
                      </Tooltip>
                    );
                  })}
                </Flex>
              )}
            </Flex>
          </Card>
        );
      })}
    </Flex>
  );
}
