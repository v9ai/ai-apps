import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge, Card, Flex, Text, Tooltip } from "@radix-ui/themes";
import Link from "next/link";
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
  return "blue";
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

export async function TrajectoryPreview() {
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
      <Card>
        <Flex direction="column" gap="2" align="center" py="4">
          <Text size="2" color="gray">
            Upload your first blood test to start tracking
          </Text>
          <Link href="/protected/blood-tests">
            <Text size="2" color="blue">
              Go to Blood Tests →
            </Text>
          </Link>
        </Flex>
      </Card>
    );
  }

  const recent = trajectory.slice(-3).reverse();

  return (
    <Flex direction="column" gap="3">
      {recent.map((state, i) => {
        const date = state.test_date
          ? new Date(state.test_date).toLocaleDateString()
          : new Date(state.created_at).toLocaleDateString();
        const isLatest = i === 0;
        const metrics = Object.entries(state.derived_metrics)
          .filter(([, v]) => v != null)
          .slice(0, 4);

        return (
          <Card key={state.id} size="1">
            <Flex direction="column" gap="1">
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
                    {(state.similarity_to_latest * 100).toFixed(1)}%
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

      <Link href="/protected/trajectory">
        <Text size="2" color="blue">
          View full trajectory →
        </Text>
      </Link>
    </Flex>
  );
}
