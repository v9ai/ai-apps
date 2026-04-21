"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Box,
  Container,
  Dialog,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import {
  TrashIcon,
  CubeIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductsQuery,
  useDeleteProductMutation,
  useAnalyzeProductIcpMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

type Criterion = {
  score: number;
  confidence: number;
  justification: string;
  evidence: string[];
};
type Segment = {
  name: string;
  industry?: string;
  stage?: string;
  geo?: string;
  fit: number;
  reasoning: string;
};
type Persona = {
  title: string;
  seniority?: string;
  department?: string;
  pain: string;
  channel?: string;
};
type DealBreaker = {
  name: string;
  severity: "low" | "medium" | "high";
  reason: string;
};
type IcpAnalysis = {
  criteria_scores: Record<string, Criterion>;
  weighted_total: number;
  segments: Segment[];
  personas: Persona[];
  anti_icp: string[];
  deal_breakers: DealBreaker[];
};

const CRITERION_LABELS: Record<string, string> = {
  segment_clarity: "Segment Clarity",
  buyer_persona_specificity: "Buyer Persona Specificity",
  pain_solution_fit: "Pain–Solution Fit",
  distribution_gtm_signal: "Distribution / GTM Signal",
  anti_icp_clarity: "Anti-ICP Clarity",
};

function severityColor(
  s: DealBreaker["severity"],
): "red" | "orange" | "yellow" {
  if (s === "high") return "red";
  if (s === "medium") return "orange";
  return "yellow";
}

function IcpAnalysisView({ data }: { data: IcpAnalysis }) {
  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="3">
        <Heading size="3">Weighted fit</Heading>
        <Badge color="indigo" size="2">
          {(data.weighted_total * 100).toFixed(0)}%
        </Badge>
      </Flex>

      <Box>
        <Heading size="3" mb="2">
          Criteria
        </Heading>
        <Flex direction="column" gap="2">
          {Object.entries(data.criteria_scores).map(([key, c]) => (
            <Box
              key={key}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex justify="between" align="center" gap="2">
                <Text weight="bold" size="2">
                  {CRITERION_LABELS[key] ?? key}
                </Text>
                <Flex gap="2" align="center">
                  <Badge color="gray" size="1">
                    conf {(c.confidence * 100).toFixed(0)}%
                  </Badge>
                  <Badge color="indigo" size="1">
                    {(c.score * 100).toFixed(0)}%
                  </Badge>
                </Flex>
              </Flex>
              {c.justification && (
                <Text color="gray" size="2" as="p" mt="1">
                  {c.justification}
                </Text>
              )}
              {c.evidence?.length > 0 && (
                <ul
                  className={css({
                    mt: "2",
                    pl: "4",
                    color: "gray.11",
                    fontSize: "xs",
                    listStyle: "disc",
                  })}
                >
                  {c.evidence.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      <Separator size="4" />

      <Box>
        <Heading size="3" mb="2">
          Segments ({data.segments.length})
        </Heading>
        <Flex direction="column" gap="2">
          {data.segments.map((s, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex justify="between" gap="2" align="center">
                <Text weight="bold" size="2">
                  {s.name}
                </Text>
                <Badge color="indigo" size="1">
                  fit {(s.fit * 100).toFixed(0)}%
                </Badge>
              </Flex>
              <Flex gap="2" mt="1" wrap="wrap">
                {s.industry && (
                  <Badge color="gray" size="1">
                    {s.industry}
                  </Badge>
                )}
                {s.stage && (
                  <Badge color="gray" size="1">
                    {s.stage}
                  </Badge>
                )}
                {s.geo && (
                  <Badge color="gray" size="1">
                    {s.geo}
                  </Badge>
                )}
              </Flex>
              {s.reasoning && (
                <Text color="gray" size="2" as="p" mt="1">
                  {s.reasoning}
                </Text>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      <Box>
        <Heading size="3" mb="2">
          Personas ({data.personas.length})
        </Heading>
        <Flex direction="column" gap="2">
          {data.personas.map((p, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Text weight="bold" size="2">
                {p.title}
              </Text>
              <Flex gap="2" mt="1" wrap="wrap">
                {p.seniority && (
                  <Badge color="gray" size="1">
                    {p.seniority}
                  </Badge>
                )}
                {p.department && (
                  <Badge color="gray" size="1">
                    {p.department}
                  </Badge>
                )}
                {p.channel && (
                  <Badge color="indigo" size="1">
                    via {p.channel}
                  </Badge>
                )}
              </Flex>
              {p.pain && (
                <Text color="gray" size="2" as="p" mt="1">
                  Pain: {p.pain}
                </Text>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      <Box>
        <Heading size="3" mb="2">
          Anti-ICP (who it is NOT for)
        </Heading>
        <ul
          className={css({
            pl: "4",
            color: "gray.11",
            fontSize: "sm",
            listStyle: "disc",
          })}
        >
          {data.anti_icp.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </Box>

      {data.deal_breakers.length > 0 && (
        <Box>
          <Heading size="3" mb="2">
            Deal-breakers
          </Heading>
          <Flex direction="column" gap="2">
            {data.deal_breakers.map((d, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Flex justify="between" gap="2" align="center">
                  <Text weight="bold" size="2">
                    {d.name}
                  </Text>
                  <Badge color={severityColor(d.severity)} size="1">
                    {d.severity}
                  </Badge>
                </Flex>
                {d.reason && (
                  <Text color="gray" size="2" as="p" mt="1">
                    {d.reason}
                  </Text>
                )}
              </Box>
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}

export function ProductsList() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductsQuery({
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  const [deleteProduct] = useDeleteProductMutation();
  const [analyzeIcp, analyzeState] = useAnalyzeProductIcpMutation();

  const [openIcpProductId, setOpenIcpProductId] = useState<number | null>(null);
  const [icpError, setIcpError] = useState<string | null>(null);

  if (authLoading) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Please sign in to view products.</Text>
      </Container>
    );
  }

  const rows = data?.products ?? [];

  async function onAnalyze(id: number) {
    setIcpError(null);
    setOpenIcpProductId(id);
    try {
      await analyzeIcp({ variables: { id } });
      await refetch();
    } catch (err) {
      setIcpError(err instanceof Error ? err.message : String(err));
    }
  }

  const openProduct = rows.find((p) => p.id === openIcpProductId) ?? null;
  const openAnalysis = (openProduct?.icpAnalysis ?? null) as IcpAnalysis | null;

  return (
    <Container size="4" p="6">
      <Flex align="center" gap="3" mb="5">
        <span
          className={css({
            color: "accent.11",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            bg: "accent.3",
            borderRadius: "md",
            p: "2",
          })}
        >
          <CubeIcon width="20" height="20" />
        </span>
        <Heading size="6">Products</Heading>
      </Flex>

      {error && (
        <Text color="red" as="p" mb="3">
          {error.message}
        </Text>
      )}

      {loading && rows.length === 0 && <Text color="gray">Loading…</Text>}

      {!loading && rows.length === 0 && (
        <Text color="gray">No products yet.</Text>
      )}

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
          gap: "3",
        })}
      >
        {rows.map((p) => {
          const icp = p.icpAnalysis as IcpAnalysis | null;
          return (
            <div
              key={p.id}
              className={css({
                bg: "ui.surface",
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "md",
                p: "4",
                transition: "border-color 150ms, transform 150ms",
                _hover: {
                  borderColor: "accent.8",
                  transform: "translateY(-1px)",
                },
              })}
            >
              <Flex justify="between" align="start" gap="3">
                <Flex
                  direction="column"
                  gap="2"
                  className={css({ flex: 1, minWidth: 0 })}
                >
                  <Link
                    href={`/products/${p.slug}`}
                    className={css({
                      color: "inherit",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2",
                    })}
                  >
                    <span className={css({ color: "accent.11" })}>
                      <CubeIcon />
                    </span>
                    <Text
                      weight="bold"
                      size="4"
                      className={css({
                        _hover: { textDecoration: "underline" },
                      })}
                    >
                      {p.name}
                    </Text>
                    <span className={css({ color: "gray.10", ml: "1" })}>
                      <ArrowRightIcon />
                    </span>
                  </Link>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={css({
                      color: "gray.11",
                      fontSize: "sm",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "1",
                      _hover: {
                        textDecoration: "underline",
                        color: "accent.11",
                      },
                    })}
                  >
                    <ExternalLinkIcon />
                    <span
                      className={css({
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      })}
                    >
                      {p.domain ?? p.url}
                    </span>
                  </a>
                  {p.description && (
                    <Text
                      color="gray"
                      size="2"
                      className={css({ lineHeight: "1.5" })}
                    >
                      {p.description}
                    </Text>
                  )}
                  {icp && (
                    <Flex gap="2" wrap="wrap" mt="1">
                      <Badge color="indigo" size="1">
                        ICP {(icp.weighted_total * 100).toFixed(0)}%
                      </Badge>
                      <Badge color="gray" size="1">
                        {icp.segments?.length ?? 0} segments
                      </Badge>
                      <Badge color="gray" size="1">
                        {icp.personas?.length ?? 0} personas
                      </Badge>
                    </Flex>
                  )}
                </Flex>
                <Flex direction="column" gap="2" align="end">
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={() => onAnalyze(p.id)}
                        disabled={
                          analyzeState.loading && openIcpProductId === p.id
                        }
                        className={button({ variant: "solid", size: "sm" })}
                        aria-label="Analyze ICP"
                      >
                        <MagicWandIcon />
                        <span className={css({ ml: "1" })}>
                          {icp ? "Re-analyze" : "Analyze ICP"}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Delete product "${p.name}"?`))
                            return;
                          await deleteProduct({ variables: { id: p.id } });
                          await refetch();
                        }}
                        className={button({ variant: "ghost", size: "sm" })}
                        aria-label="Delete product"
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                  {!isAdmin && icp && (
                    <button
                      type="button"
                      onClick={() => setOpenIcpProductId(p.id)}
                      className={button({ variant: "outline", size: "sm" })}
                    >
                      View ICP
                    </button>
                  )}
                </Flex>
              </Flex>
            </div>
          );
        })}
      </div>

      <Dialog.Root
        open={openIcpProductId !== null}
        onOpenChange={(o) => {
          if (!o) {
            setOpenIcpProductId(null);
            setIcpError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="720px">
          <Dialog.Title>
            ICP — {openProduct?.name ?? `product ${openIcpProductId}`}
          </Dialog.Title>
          <Dialog.Description size="2" color="gray" mb="3">
            Product-market ICP analysis. 5 weighted criteria + segments,
            personas, anti-ICP, deal-breakers.
          </Dialog.Description>

          {analyzeState.loading && (
            <Text color="gray">Running deep ICP analysis…</Text>
          )}
          {icpError && (
            <Text color="red" as="p" mb="3">
              {icpError}
            </Text>
          )}
          {!analyzeState.loading && !icpError && openAnalysis && (
            <IcpAnalysisView data={openAnalysis} />
          )}
          {!analyzeState.loading && !icpError && !openAnalysis && (
            <Text color="gray">No analysis yet. Click "Analyze ICP".</Text>
          )}

          <Flex justify="end" mt="4">
            <Dialog.Close>
              <button
                type="button"
                className={button({ variant: "outline", size: "sm" })}
              >
                Close
              </button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Container>
  );
}
