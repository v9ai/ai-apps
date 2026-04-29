"use client";

import { Badge, Box, Container, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { useProductBySlugQuery } from "@/__generated__/hooks";
import {
  LoadingShell,
  ErrorShell,
  ProductNotFound,
  SubpageBreadcrumb,
  SubpageHero,
  ProductExternalLink,
} from "./view-chrome";

export interface PositioningAnalysis {
  category?: string;
  category_conventions?: string[];
  white_space?: string[];
  differentiators?: string[];
  positioning_axes?: string[];
  competitor_frame?: string[];
  narrative_hooks?: string[];
  positioning_statement?: string;
  critic_rounds?: number;
  graph_meta?: {
    graph?: string;
    model?: string;
    run_at?: string;
    version?: string;
    totals?: {
      total_tokens?: number;
      total_cost_usd?: number;
      total_input_tokens?: number;
      total_output_tokens?: number;
      total_latency_ms_llm?: number;
    };
  };
}

const cardStyle = css({
  bg: "ui.surface",
  border: "1px solid",
  borderColor: "ui.border",
  borderRadius: "md",
  p: "4",
});

const listResetStyle = css({ listStyle: "none", p: 0, m: 0 });

export function PositioningAnalysisView({ data }: { data: PositioningAnalysis }) {
  const statement = data.positioning_statement?.trim() ?? "";
  const category = data.category?.trim() ?? "";
  const differentiators = data.differentiators ?? [];
  const competitorFrame = data.competitor_frame ?? [];
  const whiteSpace = data.white_space ?? [];
  const axes = data.positioning_axes ?? [];
  const conventions = data.category_conventions ?? [];
  const hooks = data.narrative_hooks ?? [];
  const critic = data.critic_rounds ?? 0;
  const meta = data.graph_meta;

  return (
    <Flex direction="column" gap="6">
      {/* Hero: positioning statement + category */}
      <Box
        className={css({
          bg: "accent.2",
          border: "1px solid",
          borderColor: "accent.6",
          borderRadius: "md",
          p: "5",
        })}
      >
        {category && (
          <Badge color="blue" size="2" mb="3">
            {category}
          </Badge>
        )}
        <Heading size="5" mb="2">
          Positioning statement
        </Heading>
        <Text
          size="4"
          as="p"
          className={css({ lineHeight: "1.6", color: "gray.12" })}
        >
          {statement || "(empty — positioning graph has not run yet)"}
        </Text>
      </Box>

      {/* Differentiators */}
      {differentiators.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Differentiators ({differentiators.length})
          </Heading>
          <Flex direction="column" gap="2">
            {differentiators.map((d, i) => (
              <Box key={i} className={cardStyle}>
                <Flex align="start" gap="3">
                  <Text
                    size="1"
                    weight="bold"
                    className={css({
                      color: "accent.11",
                      bg: "accent.3",
                      px: "2",
                      py: "1",
                      borderRadius: "sm",
                      flexShrink: 0,
                    })}
                  >
                    {i + 1}
                  </Text>
                  <Text size="2" className={css({ lineHeight: "1.6" })}>
                    {d}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {/* Competitor frame */}
      <Box>
        <Heading size="3" mb="2">
          Competitor frame
        </Heading>
        {competitorFrame.length > 0 ? (
          <Flex gap="2" wrap="wrap">
            {competitorFrame.map((c, i) => (
              <Badge key={i} color="gray" size="2" variant="soft">
                {c}
              </Badge>
            ))}
          </Flex>
        ) : (
          <Text size="2" color="gray" as="p">
            Competitive snapshot was empty upstream — re-run the{" "}
            <code>competitors_team</code> graph to populate named competitors.
          </Text>
        )}
      </Box>

      {/* White space */}
      {whiteSpace.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            White space
          </Heading>
          <Text size="2" color="gray" mb="2" as="p">
            Unoccupied positions this product could credibly own.
          </Text>
          <ul className={listResetStyle}>
            {whiteSpace.map((w, i) => (
              <li
                key={i}
                className={css({
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "2",
                  py: "1",
                })}
              >
                <span aria-hidden="true" className={css({ color: "accent.11", mt: "1" })}>◆</span>
                <Text size="2" className={css({ lineHeight: "1.5" })}>
                  {w}
                </Text>
              </li>
            ))}
          </ul>
        </Box>
      )}

      {/* Positioning axes */}
      {axes.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Positioning axes
          </Heading>
          <Text size="2" color="gray" mb="2" as="p">
            Tradeoff dimensions on which competitors split.
          </Text>
          <Flex gap="2" wrap="wrap">
            {axes.map((a, i) => (
              <Badge key={i} color="gray" size="2" variant="soft">
                {a}
              </Badge>
            ))}
          </Flex>
        </Box>
      )}

      {/* Narrative hooks */}
      {hooks.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Narrative hooks
          </Heading>
          <Flex direction="column" gap="2">
            {hooks.map((h, i) => (
              <Box
                key={i}
                className={css({
                  borderLeft: "3px solid",
                  borderColor: "accent.9",
                  pl: "3",
                  py: "1",
                })}
              >
                <Text
                  size="3"
                  className={css({
                    fontStyle: "italic",
                    lineHeight: "1.5",
                  })}
                >
                  “{h}”
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {/* Category conventions — collapsible */}
      {conventions.length > 0 && (
        <details
          className={css({
            border: "1px solid",
            borderColor: "ui.border",
            borderRadius: "md",
            p: "3",
          })}
        >
          <summary
            className={css({
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "sm",
            })}
          >
            Category conventions ({conventions.length})
          </summary>
          <ul className={css({ listStyle: "none", p: 0, m: 0, mt: "2" })}>
            {conventions.map((c, i) => (
              <li
                key={i}
                className={css({
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "2",
                  py: "1",
                })}
              >
                <span aria-hidden="true" className={css({ color: "gray.10", mt: "1" })}>•</span>
                <Text size="2" color="gray">
                  {c}
                </Text>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Run info — collapsible footer */}
      {meta && (
        <>
          <Separator size="4" />
          <details>
            <summary
              className={css({
                cursor: "pointer",
                fontSize: "xs",
                color: "gray.10",
              })}
            >
              Run info
            </summary>
            <Flex direction="column" gap="1" mt="2">
              <Text size="1" color="gray">
                Model: <code>{meta.model ?? "unknown"}</code>
              </Text>
              {meta.run_at && (
                <Text size="1" color="gray">
                  Run at: {new Date(meta.run_at).toLocaleString()}
                </Text>
              )}
              <Text size="1" color="gray">
                Critic rounds: {critic}
              </Text>
              {meta.totals?.total_cost_usd !== undefined && (
                <Text size="1" color="gray">
                  Cost: ${meta.totals.total_cost_usd.toFixed(4)} ·{" "}
                  {meta.totals.total_tokens ?? 0} tokens ·{" "}
                  {Math.round((meta.totals.total_latency_ms_llm ?? 0) / 100) / 10}s
                  LLM latency
                </Text>
              )}
            </Flex>
          </details>
        </>
      )}
    </Flex>
  );
}

export function ProductPositioningPage({ slug }: { slug: string }) {
  const { data, loading, error } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  if (loading && !data) return <LoadingShell />;
  if (error) return <ErrorShell message={error.message} />;

  const product = data?.productBySlug;

  if (!product) return <ProductNotFound slug={slug} />;

  const positioning = (product.positioningAnalysis ?? null) as PositioningAnalysis | null;

  return (
    <Container size="4" p="6" asChild>
      <main>
      <SubpageBreadcrumb
        productSlug={product.slug}
        productName={product.name}
        currentLabel="Positioning"
      />

      <Flex direction="column" gap="4">
        <SubpageHero
          productName={product.name}
          currentLabel="Positioning"
        />

        <Flex gap="3" wrap="wrap" align="center">
          <ProductExternalLink
            url={product.url}
            domain={product.domain}
            productName={product.name}
          />
        </Flex>

        <div
          className={css({
            mt: "5",
            pt: "6",
            borderTop: "1px solid",
            borderColor: "ui.border",
          })}
        >
          {positioning ? (
            <PositioningAnalysisView data={positioning} />
          ) : (
            <Text color="gray">
              No positioning analysis yet. An admin needs to dispatch the
              positioning graph first (see{" "}
              <code>POST /dispatch/positioning-all</code>).
            </Text>
          )}
        </div>
      </Flex>
      </main>
    </Container>
  );
}
