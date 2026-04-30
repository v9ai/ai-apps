"use client";

import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Text,
} from "@radix-ui/themes";
import {
  ChatBubbleIcon,
  ClockIcon,
  MagicWandIcon,
  RocketIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useAnalyzeProductGtmAsyncMutation,
} from "@/__generated__/hooks";
import { useIntelRunLive } from "@/lib/use-intel-run-live";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { GTMStrategyResult } from "@/lib/langgraph-client";
import {
  LoadingShell,
  ErrorShell,
  ProductNotFound,
  SectionCard,
  SectionHeading,
  SubpageBreadcrumb,
  SubpageHero,
  ProductExternalLink,
  StatusBadge,
} from "./view-chrome";

export type GTMAnalysis = GTMStrategyResult;

const TERMINAL_STATUSES = new Set(["success", "error", "timeout"]);

const eyebrow = css({
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: "bold",
  fontSize: "xs",
  color: "gray.10",
});

const monoText = css({
  fontFamily: "mono",
  fontVariantNumeric: "tabular-nums",
});

function effortColor(e: "low" | "medium" | "high"): "green" | "yellow" | "orange" {
  if (e === "low") return "green";
  if (e === "medium") return "yellow";
  return "orange";
}

type Channel = NonNullable<GTMAnalysis["channels"]>[number];

function ChannelCard({ channel, index }: { channel: Channel; index: number }) {
  const c = channel;
  return (
    <SectionCard>
      <Flex direction="column" gap="3">
        <Flex justify="between" align="start" gap="3" wrap="wrap">
          <Flex align="center" gap="3">
            <span
              aria-hidden
              className={css({
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "7",
                height: "7",
                borderRadius: "sm",
                bg: "gray.3",
                color: "gray.11",
                border: "1px solid",
                borderColor: "ui.border",
                fontSize: "xs",
                fontWeight: "bold",
                fontFamily: "mono",
                fontVariantNumeric: "tabular-nums",
              })}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <Text size="3" weight="bold" className={css({ color: "gray.12" })}>
              {c.name}
            </Text>
          </Flex>
          <Flex gap="2" align="center" wrap="wrap">
            <Badge
              color={effortColor(c.effort)}
              size="1"
              variant="soft"
              aria-label={`Effort: ${c.effort}`}
            >
              {c.effort} effort
            </Badge>
            {c.time_to_first_lead && (
              <Badge color="gray" size="1" variant="soft">
                <ClockIcon
                  aria-hidden
                  width="10"
                  height="10"
                  className={css({ mr: "1" })}
                />
                <span className={monoText}>{c.time_to_first_lead}</span>
              </Badge>
            )}
          </Flex>
        </Flex>

        {c.why && (
          <Text
            size="2"
            as="p"
            className={css({ color: "gray.12", lineHeight: "1.55" })}
          >
            {c.why}
          </Text>
        )}

        {c.icp_presence && (
          <Flex gap="2" align="baseline">
            <Text className={eyebrow}>ICP presence</Text>
            <Text size="2" className={css({ color: "gray.12" })}>
              {c.icp_presence}
            </Text>
          </Flex>
        )}

        {c.tactics?.length > 0 && (
          <Box>
            <Text as="div" mb="1" className={eyebrow}>
              Tactics
            </Text>
            <ul
              className={css({
                pl: "4",
                color: "gray.12",
                fontSize: "sm",
                listStyle: "disc",
                lineHeight: "1.6",
                display: "flex",
                flexDirection: "column",
                gap: "1",
              })}
            >
              {c.tactics.map((t, j) => (
                <li key={j}>{t}</li>
              ))}
            </ul>
          </Box>
        )}
      </Flex>
    </SectionCard>
  );
}

type Pillar = NonNullable<GTMAnalysis["messaging_pillars"]>[number];

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <SectionCard>
      <Flex direction="column" gap="3">
        <Text size="3" weight="bold" className={css({ color: "gray.12" })}>
          {pillar.theme}
        </Text>

        {pillar.proof_points?.length > 0 && (
          <Box>
            <Text as="div" mb="1" className={eyebrow}>
              Proof points
            </Text>
            <ul
              className={css({
                pl: "4",
                color: "gray.12",
                fontSize: "sm",
                listStyle: "disc",
                lineHeight: "1.6",
                display: "flex",
                flexDirection: "column",
                gap: "1",
              })}
            >
              {pillar.proof_points.map((pp, j) => (
                <li key={j}>{pp}</li>
              ))}
            </ul>
          </Box>
        )}

        {(pillar.when_to_use || pillar.avoid_when) && (
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
              gap: "2",
              pt: "2",
              borderTop: "1px solid",
              borderColor: "ui.border",
            })}
          >
            {pillar.when_to_use && (
              <Box>
                <Text as="div" className={eyebrow}>
                  Use when
                </Text>
                <Text size="2" className={css({ color: "gray.12" })}>
                  {pillar.when_to_use}
                </Text>
              </Box>
            )}
            {pillar.avoid_when && (
              <Box>
                <Text
                  as="div"
                  className={css({
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: "bold",
                    fontSize: "xs",
                    color: "orange.10",
                  })}
                >
                  Avoid when
                </Text>
                <Text size="2" className={css({ color: "gray.12" })}>
                  {pillar.avoid_when}
                </Text>
              </Box>
            )}
          </div>
        )}
      </Flex>
    </SectionCard>
  );
}

type Template = NonNullable<GTMAnalysis["outreach_templates"]>[number];

function TemplateCard({
  template,
  defaultOpen,
}: {
  template: Template;
  defaultOpen: boolean;
}) {
  const t = template;
  const summary = t.hook ?? t.cta ?? "Open template";
  return (
    <details
      open={defaultOpen}
      className={css({
        border: "1px solid",
        borderColor: "ui.border",
        borderRadius: "md",
        bg: "ui.surface",
        overflow: "hidden",
        "&[open] > summary": {
          borderBottom: "1px solid",
          borderBottomColor: "ui.border",
        },
      })}
    >
      <summary
        className={css({
          display: "flex",
          gap: "3",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          cursor: "pointer",
          listStyle: "none",
          p: "3",
          color: "gray.12",
          _hover: { bg: "gray.2" },
          "&::-webkit-details-marker": { display: "none" },
        })}
      >
        <Flex gap="2" align="center" wrap="wrap">
          <Badge color="indigo" size="1" variant="soft">
            <ChatBubbleIcon
              aria-hidden
              width="10"
              height="10"
              className={css({ mr: "1" })}
            />
            {t.channel}
          </Badge>
          {t.persona && (
            <Text size="1" color="gray">
              {t.persona}
            </Text>
          )}
        </Flex>
        <Text
          size="2"
          className={css({
            color: "gray.11",
            maxWidth: { base: "100%", md: "60%" },
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          })}
        >
          {summary}
        </Text>
      </summary>

      <Box className={css({ p: "4", display: "flex", flexDirection: "column", gap: "3" })}>
        {t.hook && (
          <Box>
            <Text as="div" mb="1" className={eyebrow}>
              Hook
            </Text>
            <Text size="2" as="p" className={css({ lineHeight: "1.55", color: "gray.12" })}>
              {t.hook}
            </Text>
          </Box>
        )}
        {t.body && (
          <Box>
            <Text as="div" mb="1" className={eyebrow}>
              Body
            </Text>
            <Text
              size="2"
              as="p"
              className={css({
                lineHeight: "1.6",
                whiteSpace: "pre-wrap",
                color: "gray.12",
              })}
            >
              {t.body}
            </Text>
          </Box>
        )}
        {t.cta && (
          <Box>
            <Text as="div" mb="1" className={eyebrow}>
              CTA
            </Text>
            <Text size="2" as="p" weight="bold" className={css({ color: "accent.11" })}>
              {t.cta}
            </Text>
          </Box>
        )}
      </Box>
    </details>
  );
}

function TimelineStep({
  index,
  text,
  total,
}: {
  index: number;
  text: string;
  total: number;
}) {
  const isLast = index === total - 1;
  return (
    <li
      className={css({
        position: "relative",
        display: "flex",
        gap: "4",
        alignItems: "start",
        pb: isLast ? "0" : "4",
      })}
    >
      <div
        className={css({
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          flexShrink: 0,
        })}
      >
        <span
          aria-hidden
          className={css({
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "8",
            height: "8",
            borderRadius: "full",
            bg: "accent.3",
            color: "accent.11",
            border: "1px solid",
            borderColor: "accent.6",
            fontSize: "xs",
            fontWeight: "bold",
            fontFamily: "mono",
            fontVariantNumeric: "tabular-nums",
          })}
        >
          {index + 1}
        </span>
        {!isLast && (
          <span
            aria-hidden
            className={css({
              position: "absolute",
              top: "8",
              bottom: "-4",
              width: "1px",
              bg: "ui.border",
            })}
          />
        )}
      </div>
      <Text
        size="2"
        as="p"
        className={css({
          lineHeight: "1.55",
          color: "gray.12",
          pt: "1",
        })}
      >
        {text}
      </Text>
    </li>
  );
}

export function GTMAnalysisView({ data }: { data: GTMAnalysis }) {
  const channels = data.channels ?? [];
  const pillars = data.messaging_pillars ?? [];
  const templates = data.outreach_templates ?? [];
  const playbook = data.sales_playbook;
  const first90 = data.first_90_days ?? [];

  return (
    <Flex direction="column" gap="7">
      {channels.length > 0 && (
        <section aria-labelledby="channels-heading">
          <SectionHeading
            eyebrow="Distribution"
            title="Channels"
            count={channels.length}
            description="Ranked by recommended sequencing — start at the top, layer downward."
          />
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", lg: "repeat(2, 1fr)" },
              gap: "3",
            })}
          >
            {channels.map((c, i) => (
              <ChannelCard key={i} channel={c} index={i} />
            ))}
          </div>
        </section>
      )}

      {pillars.length > 0 && (
        <section aria-labelledby="pillars-heading">
          <SectionHeading
            eyebrow="Narrative"
            title="Messaging pillars"
            count={pillars.length}
          />
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
              gap: "3",
            })}
          >
            {pillars.map((p, i) => (
              <PillarCard key={i} pillar={p} />
            ))}
          </div>
        </section>
      )}

      {templates.length > 0 && (
        <section aria-labelledby="templates-heading">
          <SectionHeading
            eyebrow="Outbound"
            title="Outreach templates"
            count={templates.length}
            description="First template is expanded; tap any other to expand."
          />
          <Flex direction="column" gap="2">
            {templates.map((t, i) => (
              <TemplateCard key={i} template={t} defaultOpen={i === 0} />
            ))}
          </Flex>
        </section>
      )}

      {playbook && (
        <section aria-labelledby="playbook-heading">
          <SectionHeading eyebrow="Sales motion" title="Playbook" />
          <Flex direction="column" gap="3">
            {playbook.discovery_questions?.length > 0 && (
              <SectionCard>
                <Text as="div" mb="2" className={eyebrow}>
                  Discovery questions
                </Text>
                <ol
                  className={css({
                    pl: "4",
                    color: "gray.12",
                    fontSize: "sm",
                    listStyle: "decimal",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2",
                    lineHeight: "1.55",
                  })}
                >
                  {playbook.discovery_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </SectionCard>
            )}
            {playbook.objections?.length > 0 && (
              <Box>
                <Text as="div" mb="2" className={eyebrow}>
                  Objections &amp; responses
                </Text>
                <Flex direction="column" gap="2">
                  {playbook.objections.map((o, i) => (
                    <SectionCard key={i}>
                      <Text
                        size="2"
                        weight="bold"
                        as="div"
                        mb="1"
                        className={css({ color: "gray.12" })}
                      >
                        &ldquo;{o.objection}&rdquo;
                      </Text>
                      {o.response && (
                        <Text
                          size="2"
                          as="p"
                          className={css({
                            lineHeight: "1.55",
                            color: "gray.12",
                          })}
                        >
                          {o.response}
                        </Text>
                      )}
                      {o.evidence_to_show?.length > 0 && (
                        <Flex gap="1" wrap="wrap" mt="2">
                          {o.evidence_to_show.map((e, j) => (
                            <Badge key={j} color="gray" size="1" variant="soft">
                              {e}
                            </Badge>
                          ))}
                        </Flex>
                      )}
                    </SectionCard>
                  ))}
                </Flex>
              </Box>
            )}
          </Flex>
        </section>
      )}

      {first90.length > 0 && (
        <section aria-labelledby="first90-heading">
          <SectionHeading
            eyebrow="Execution"
            title="First 90 days"
            count={first90.length}
            trailing={
              <span
                aria-hidden
                className={css({ display: "inline-flex", color: "accent.11" })}
              >
                <RocketIcon width="18" height="18" />
              </span>
            }
          />
          <SectionCard>
            <ol
              className={css({
                listStyle: "none",
                p: 0,
                m: 0,
              })}
            >
              {first90.map((step, i) => (
                <TimelineStep
                  key={i}
                  index={i}
                  text={step}
                  total={first90.length}
                />
              ))}
            </ol>
          </SectionCard>
        </section>
      )}
    </Flex>
  );
}

export function ProductGtmPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const [analyzeGtm, analyzeState] = useAnalyzeProductGtmAsyncMutation();

  const productId = data?.productBySlug?.id ?? 0;

  const { data: runsData } = useIntelRunLive(productId, "gtm");

  const latestRun = runsData?.productIntelRuns?.[0];
  const terminal = latestRun ? TERMINAL_STATUSES.has(latestRun.status) : true;

  if (loading && !data) return <LoadingShell />;
  if (error) return <ErrorShell message={error.message} />;

  const product = data?.productBySlug;

  if (!product) return <ProductNotFound slug={slug} />;

  const gtm = (product.gtmAnalysis ?? null) as GTMAnalysis | null;
  const analyzedAt = product.gtmAnalyzedAt
    ? new Date(product.gtmAnalyzedAt)
    : null;

  async function onAnalyze() {
    const res = await analyzeGtm({ variables: { id: product!.id } });
    const runId = res.data?.analyzeProductGTMAsync?.runId;
    if (runId) console.log("[gtm] rerun started runId=", runId);
    await refetch();
  }

  return (
    <Container size="4" p="6" asChild>
      <main>
        <SubpageBreadcrumb
          productSlug={product.slug}
          productName={product.name}
          currentLabel="GTM"
        />

        <Flex direction="column" gap="4">
          <SubpageHero
            productName={product.name}
            currentLabel="GTM"
            trailing={
              latestRun && !terminal ? (
                <StatusBadge status={latestRun.status} />
              ) : null
            }
          />

          <Flex gap="3" wrap="wrap" align="center">
            <ProductExternalLink
              url={product.url}
              domain={product.domain}
              productName={product.name}
            />
            {analyzedAt && (
              <Text
                size="2"
                color="gray"
                className={css({ fontVariantNumeric: "tabular-nums" })}
              >
                Analyzed {analyzedAt.toLocaleString()}
              </Text>
            )}
            {isAdmin && (
              <button
                type="button"
                onClick={onAnalyze}
                disabled={analyzeState.loading || (latestRun && !terminal)}
                className={button({ variant: "solid", size: "sm" })}
              >
                <MagicWandIcon aria-hidden />
                <span className={css({ ml: "1" })}>
                  {analyzeState.loading
                    ? "Starting…"
                    : gtm
                      ? "Re-analyze"
                      : "Analyze GTM"}
                </span>
              </button>
            )}
          </Flex>

          {analyzeState.error && (
            <Text color="red" as="p" role="alert">
              {analyzeState.error.message}
            </Text>
          )}
          {latestRun?.error && (
            <Text color="red" as="p" role="alert">
              {latestRun.error}
            </Text>
          )}

          <div
            className={css({
              mt: "5",
              pt: "6",
              borderTop: "1px solid",
              borderColor: "ui.border",
            })}
          >
            {gtm ? (
              <GTMAnalysisView data={gtm} />
            ) : latestRun && !terminal ? (
              <Flex
                align="center"
                gap="3"
                className={css({
                  border: "1px dashed",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  p: "5",
                  bg: "ui.surface",
                })}
              >
                <span
                  aria-hidden
                  className={css({ display: "inline-flex", color: "accent.11" })}
                >
                  <MagicWandIcon width="18" height="18" />
                </span>
                <Text color="gray" role="status" aria-live="polite">
                  Running GTM analysis…
                </Text>
              </Flex>
            ) : (
              <Box
                className={css({
                  border: "1px dashed",
                  borderColor: "ui.border",
                  borderRadius: "lg",
                  p: "8",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "3",
                })}
              >
                <span
                  aria-hidden
                  className={css({
                    color: "accent.11",
                    display: "inline-flex",
                    bg: "accent.3",
                    borderRadius: "full",
                    p: "3",
                  })}
                >
                  <MagicWandIcon width="20" height="20" />
                </span>
                <Heading size="4">No GTM analysis yet</Heading>
                <Text color="gray" size="2">
                  {isAdmin
                    ? 'Click "Analyze GTM" to run the LangGraph pipeline.'
                    : "An admin needs to run the analysis first."}
                </Text>
              </Box>
            )}
          </div>
        </Flex>
      </main>
    </Container>
  );
}
