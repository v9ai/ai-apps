"use client";

import { useEffect, useState } from "react";
import { Card, Flex, Text, Badge, Table, Button, Separator } from "@radix-ui/themes";
import { ChevronDownIcon, ChevronUpIcon, DownloadIcon } from "@radix-ui/react-icons";
import type { OpportunityEvalReport } from "@/lib/ml/opportunity-features";

type MetricColor = "green" | "yellow" | "red" | "gray";

function metricColor(value: number): MetricColor {
  if (value >= 0.8) return "green";
  if (value >= 0.5) return "yellow";
  return "red";
}

function fmt(value: number): string {
  return (Math.round(value * 1000) / 1000).toFixed(3);
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function EvalStatsPanel() {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<OpportunityEvalReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || report) return;
    setLoading(true);
    fetch("/api/opportunities/eval")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setReport)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, report]);

  return (
    <Card size="1" mb="3">
      <Flex
        align="center"
        justify="between"
        style={{ cursor: "pointer" }}
        onClick={() => setOpen(!open)}
        p="2"
      >
        <Flex align="center" gap="2">
          <Text size="2" weight="medium">Golden Dataset Eval</Text>
          {report && (
            <Badge size="1" color="gray" variant="surface">
              {report.goldenCount} golden / {report.excludedCount} excluded
            </Badge>
          )}
        </Flex>
        {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </Flex>

      {open && (
        <Flex direction="column" gap="3" p="2" pt="0">
          <Separator size="4" />

          {loading && <Text size="2" color="gray">Loading eval metrics...</Text>}
          {error && <Text size="2" color="red">Error: {error}</Text>}

          {report && (
            <>
              {/* Class balance warning */}
              {Math.min(report.goldenCount, report.excludedCount) < 10 && (
                <Text size="1" color="orange">
                  Insufficient labels ({Math.min(report.goldenCount, report.excludedCount)} in smaller class) for reliable evaluation.
                </Text>
              )}

              {/* Null score warning */}
              {report.nullScoreCount > 0 && (
                <Text size="1" color="gray">
                  {report.nullScoreCount} opportunities have no score (defaulting to 0.5).
                </Text>
              )}

              {/* Scoring metrics */}
              <Flex gap="3" wrap="wrap">
                <MetricBadge label="Accuracy" value={report.scoring.accuracy} />
                <MetricBadge label="Precision" value={report.scoring.precision} />
                <MetricBadge label="Recall" value={report.scoring.recall} />
                <MetricBadge label="F1" value={report.scoring.f1} />
                <MetricBadge label="AUC-ROC" value={report.scoring.aucRoc} />
                <MetricBadge label="NDCG@10" value={report.scoring.ndcgAt10} />
              </Flex>

              {/* Source breakdown */}
              {report.sourceBreakdown.length > 0 && (
                <>
                  <Text size="2" weight="medium" mt="1">Source Quality</Text>
                  <Table.Root variant="surface" size="1">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeaderCell>Source</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Total</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Golden</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Excluded</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Precision</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Avg Score</Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {report.sourceBreakdown.map((s) => (
                        <Table.Row key={s.source}>
                          <Table.Cell><Text size="1">{s.source}</Text></Table.Cell>
                          <Table.Cell><Text size="1">{s.total}</Text></Table.Cell>
                          <Table.Cell><Text size="1" color="green">{s.positive}</Text></Table.Cell>
                          <Table.Cell><Text size="1" color="red">{s.negative}</Text></Table.Cell>
                          <Table.Cell>
                            <Badge size="1" color={metricColor(s.precision)}>{pct(s.precision)}</Badge>
                          </Table.Cell>
                          <Table.Cell><Text size="1">{s.avgScore}</Text></Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                </>
              )}

              {/* Export */}
              <Flex justify="end" mt="1">
                <Button
                  size="1"
                  variant="soft"
                  color="gray"
                  asChild
                >
                  <a href="/api/opportunities/eval?format=jsonl" download>
                    <DownloadIcon width={12} height={12} /> Export JSONL
                  </a>
                </Button>
              </Flex>
            </>
          )}
        </Flex>
      )}
    </Card>
  );
}

function MetricBadge({ label, value }: { label: string; value: number }) {
  return (
    <Flex direction="column" align="center" gap="1">
      <Text size="1" color="gray">{label}</Text>
      <Badge size="2" color={metricColor(value)}>{fmt(value)}</Badge>
    </Flex>
  );
}
