"use client";

import { Badge, Box, Container, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { useProductBySlugQuery } from "@/__generated__/hooks";
import {
  LoadingShell,
  ErrorShell,
  ProductNotFound,
  SectionCard,
  SectionHeading,
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

const listResetStyle = css({ listStyle: "none", p: 0, m: 0 });

const eyebrowStyle = css({
  color: "accent.11",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: "medium",
  fontSize: "xs",
});

const ordinalChipStyle = css({
  color: "accent.11",
  bg: "accent.3",
  border: "1px solid",
  borderColor: "accent.6",
  px: "2",
  py: "1",
  borderRadius: "sm",
  flexShrink: 0,
  fontVariantNumeric: "tabular-nums",
  minWidth: "28px",
  textAlign: "center",
  fontWeight: "bold",
  fontSize: "xs",
});

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
    <Flex direction="column" gap="7">
      {/* Hero: positioning statement is the punchline of the whole view */}
      <Box
        className={css({
          bg: "accent.2",
          border: "1px solid",
          borderColor: "accent.6",
          borderRadius: "lg",
          p: "6",
          position: "relative",
          overflow: "hidden",
          _before: {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "4px",
            bg: "accent.9",
          },
        })}
      >
        <Flex direction="column" gap="3">
          <Flex align="center" gap="2" wrap="wrap">
            <Text className={eyebrowStyle}>Positioning statement</Text>
            {category && (
              <Badge color="indigo" variant="solid" size="1" radius="full">
                {category}
              </Badge>
            )}
          </Flex>
          <Text
            size="5"
            as="p"
            className={css({
              lineHeight: "1.55",
              color: "gray.12",
              fontWeight: "medium",
              letterSpacing: "-0.01em",
            })}
          >
            {statement || (
              <Text size="3" color="gray" className={css({ fontStyle: "italic", fontWeight: "regular" })}>
                Empty — positioning graph has not run yet.
              </Text>
            )}
          </Text>
        </Flex>
      </Box>

      {/* Differentiators — ranked, the most actionable evidence */}
      {differentiators.length > 0 && (
        <Box>
          <SectionHeading
            eyebrow="Why we win"
            title="Differentiators"
            count={differentiators.length}
            description="What this product does that competitors do not — ranked by salience."
          />
          <Flex direction="column" gap="2">
            {differentiators.map((d, i) => (
              <SectionCard key={i} emphasized={i === 0}>
                <Flex align="start" gap="3">
                  <Text size="1" className={ordinalChipStyle}>
                    {i + 1}
                  </Text>
                  <Text size="3" className={css({ lineHeight: "1.6", color: "gray.12" })}>
                    {d}
                  </Text>
                </Flex>
              </SectionCard>
            ))}
          </Flex>
        </Box>
      )}

      {/* Two-up: white space (opportunity) + axes (tradeoffs) */}
      {(whiteSpace.length > 0 || axes.length > 0) && (
        <Box
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
            gap: "5",
          })}
        >
          {whiteSpace.length > 0 && (
            <Box>
              <SectionHeading
                eyebrow="Opportunity"
                title="White space"
                count={whiteSpace.length}
                description="Unoccupied positions this product could credibly own."
              />
              <ul className={listResetStyle}>
                {whiteSpace.map((w, i) => (
                  <li
                    key={i}
                    className={css({
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "3",
                      py: "2",
                      borderBottom: "1px solid",
                      borderColor: "ui.border",
                      _last: { borderBottom: "none" },
                    })}
                  >
                    <span
                      aria-hidden="true"
                      className={css({
                        color: "accent.10",
                        mt: "1",
                        fontSize: "xs",
                        flexShrink: 0,
                      })}
                    >
                      ◆
                    </span>
                    <Text size="2" className={css({ lineHeight: "1.55", color: "gray.12" })}>
                      {w}
                    </Text>
                  </li>
                ))}
              </ul>
            </Box>
          )}

          {axes.length > 0 && (
            <Box>
              <SectionHeading
                eyebrow="Tradeoffs"
                title="Positioning axes"
                count={axes.length}
                description="Dimensions on which competitors split."
              />
              <Flex gap="2" wrap="wrap">
                {axes.map((a, i) => (
                  <Badge key={i} color="gray" size="2" variant="surface" radius="full">
                    {a}
                  </Badge>
                ))}
              </Flex>
            </Box>
          )}
        </Box>
      )}

      {/* Competitor frame — supporting evidence, dense badges */}
      <Box>
        <SectionHeading
          eyebrow="In the same conversation"
          title="Competitor frame"
          count={competitorFrame.length || undefined}
        />
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

      {/* Narrative hooks — pull-quote treatment, demoted below evidence */}
      {hooks.length > 0 && (
        <Box>
          <SectionHeading
            eyebrow="Lines to use"
            title="Narrative hooks"
            count={hooks.length}
            description="Headline phrases the team can lift verbatim into copy."
          />
          <Flex direction="column" gap="3">
            {hooks.map((h, i) => (
              <Box
                key={i}
                className={css({
                  borderLeft: "3px solid",
                  borderColor: "accent.9",
                  pl: "4",
                  py: "2",
                  bg: "accent.2",
                  borderRadius: "0 sm sm 0",
                })}
              >
                <Text
                  size="3"
                  as="p"
                  className={css({
                    fontStyle: "italic",
                    lineHeight: "1.55",
                    color: "gray.12",
                  })}
                >
                  &ldquo;{h}&rdquo;
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {/* Category conventions — collapsible context */}
      {conventions.length > 0 && (
        <details
          className={css({
            border: "1px solid",
            borderColor: "ui.border",
            borderRadius: "md",
            p: "3",
            bg: "ui.surface",
          })}
        >
          <summary
            className={css({
              cursor: "pointer",
              fontSize: "sm",
              fontWeight: "medium",
              color: "gray.12",
              _hover: { color: "accent.11" },
            })}
          >
            Category conventions ({conventions.length})
          </summary>
          <ul className={css({ listStyle: "none", p: 0, m: 0, mt: "3" })}>
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
                <span aria-hidden="true" className={css({ color: "gray.10", mt: "1" })}>
                  •
                </span>
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
                _hover: { color: "gray.12" },
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
          <SubpageHero productName={product.name} currentLabel="Positioning" />

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
              <Box
                className={css({
                  bg: "ui.surface",
                  border: "1px dashed",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  p: "6",
                  textAlign: "center",
                })}
              >
                <Heading size="3" mb="2">
                  No positioning analysis yet
                </Heading>
                <Text color="gray" size="2" as="p">
                  An admin needs to dispatch the positioning graph first
                  (see <code>POST /dispatch/positioning-all</code>).
                </Text>
              </Box>
            )}
          </div>
        </Flex>
      </main>
    </Container>
  );
}
