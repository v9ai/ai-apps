"use client";

import { useState, useTransition } from "react";
import { Badge, Button, Card, Flex, Text, Tooltip } from "@radix-ui/themes";
import { getTrajectoryInsights } from "./actions";
import type { TrajectoryMetricDetail, TrajectoryVelocity } from "./actions";

function riskColor(
  risk: string
): "green" | "yellow" | "red" | "blue" {
  if (risk === "optimal") return "green";
  if (risk === "borderline") return "yellow";
  if (risk === "elevated") return "red";
  return "blue";
}

export function TrajectoryInsights() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    answer: string;
    stateCount: number;
    currentTest: string | null;
    riskSummary: TrajectoryMetricDetail[];
    velocities: TrajectoryVelocity[];
  } | null>(null);

  function handleAnalyze() {
    startTransition(async () => {
      const res = await getTrajectoryInsights();
      setResult(res);
    });
  }

  return (
    <>
      <Button onClick={handleAnalyze} disabled={isPending}>
        {isPending ? "Analyzing..." : "Analyze My Trajectory"}
      </Button>

      {result && (
        <Flex direction="column" gap="3">
          {result.riskSummary.length > 0 && (
            <Card>
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  Latest State — Risk Classification
                </Text>
                <Flex gap="2" wrap="wrap">
                  {result.riskSummary.map((m) => (
                    <Tooltip
                      key={m.key}
                      content={`${m.description}. Ref: ${m.reference}`}
                    >
                      <Badge color={riskColor(m.risk)} variant="soft" size="1">
                        {m.label}: {m.value.toFixed(2)} ({m.risk})
                      </Badge>
                    </Tooltip>
                  ))}
                </Flex>
                <Text size="1" color="gray">
                  Hover over a metric to see the clinical reference and source
                  paper.
                </Text>
              </Flex>
            </Card>
          )}

          {result.velocities.length > 0 && (
            <Card>
              <Flex direction="column" gap="2">
                <Text size="2" weight="bold">
                  Rate of Change (Velocity)
                </Text>
                <Text size="1" color="gray">
                  Per-day change between consecutive blood panels. Based on
                  longitudinal biomarker monitoring (Sacks DB et al. Clin Chem.
                  2011;57(6):e1-e47).
                </Text>
                {result.velocities.map((v, i) => {
                  const significantDeltas = Object.entries(v.deltas).filter(
                    ([, d]) => d != null && Math.abs(d as number) > 0.0001
                  );
                  if (significantDeltas.length === 0) return null;
                  return (
                    <Flex key={i} direction="column" gap="1">
                      <Text size="1" weight="bold">
                        {v.fromDate} → {v.toDate} ({v.daysBetween}d)
                      </Text>
                      <Flex gap="2" wrap="wrap">
                        {significantDeltas.map(([key, delta]) => {
                          const d = delta as number;
                          const improving = d < 0; // for most ratios, decreasing = improving
                          return (
                            <Badge
                              key={key}
                              variant="outline"
                              size="1"
                              color={improving ? "green" : "orange"}
                            >
                              {key}: {d > 0 ? "+" : ""}
                              {d.toFixed(5)}/d
                            </Badge>
                          );
                        })}
                      </Flex>
                    </Flex>
                  );
                })}
              </Flex>
            </Card>
          )}

          <Card>
            <Text size="2" style={{ whiteSpace: "pre-wrap" }}>
              {result.answer}
            </Text>
          </Card>
        </Flex>
      )}
    </>
  );
}
