"use client";

import { Badge, Box, Container, Flex, Heading, Separator, Text } from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useAnalyzeProductGtmAsyncMutation,
  usePublicIntelRunsQuery,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { GTMStrategyResult } from "@/lib/langgraph-client";
import {
  LoadingShell,
  ErrorShell,
  SignInGate,
  ProductNotFound,
  SubpageBreadcrumb,
  SubpageHero,
  ProductExternalLink,
  StatusBadge,
} from "./view-chrome";

export type GTMAnalysis = GTMStrategyResult;

const TERMINAL_STATUSES = new Set(["success", "error", "timeout"]);

function effortColor(e: "low" | "medium" | "high"): "green" | "yellow" | "orange" {
  if (e === "low") return "green";
  if (e === "medium") return "yellow";
  return "orange";
}

export function GTMAnalysisView({ data }: { data: GTMAnalysis }) {
  const channels = data.channels ?? [];
  const pillars = data.messaging_pillars ?? [];
  const templates = data.outreach_templates ?? [];
  const playbook = data.sales_playbook;
  const first90 = data.first_90_days ?? [];

  return (
    <Flex direction="column" gap="5">
      <Box>
        <Heading size="4" mb="2">
          Channels ({channels.length})
        </Heading>
        <Flex direction="column" gap="2">
          {channels.map((c, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex justify="between" align="center" gap="2" wrap="wrap">
                <Text weight="bold" size="2">
                  {c.name}
                </Text>
                <Flex gap="2" align="center">
                  <Badge color={effortColor(c.effort)} size="1">
                    {c.effort} effort
                  </Badge>
                  {c.time_to_first_lead && (
                    <Badge color="gray" size="1">
                      {c.time_to_first_lead}
                    </Badge>
                  )}
                </Flex>
              </Flex>
              {c.why && (
                <Text color="gray" size="2" as="p" mt="1">
                  {c.why}
                </Text>
              )}
              {c.icp_presence && (
                <Text size="1" color="gray" as="div" mt="1">
                  ICP presence: {c.icp_presence}
                </Text>
              )}
              {c.tactics?.length > 0 && (
                <ul
                  className={css({
                    mt: "2",
                    pl: "4",
                    color: "gray.11",
                    fontSize: "xs",
                    listStyle: "disc",
                  })}
                >
                  {c.tactics.map((t, j) => (
                    <li key={j}>{t}</li>
                  ))}
                </ul>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      <Separator size="4" />

      <Box>
        <Heading size="4" mb="2">
          Messaging pillars ({pillars.length})
        </Heading>
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "3",
          })}
        >
          {pillars.map((p, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Text weight="bold" size="2" as="div">
                {p.theme}
              </Text>
              {p.proof_points?.length > 0 && (
                <ul
                  className={css({
                    mt: "2",
                    pl: "4",
                    color: "gray.11",
                    fontSize: "xs",
                    listStyle: "disc",
                  })}
                >
                  {p.proof_points.map((pp, j) => (
                    <li key={j}>{pp}</li>
                  ))}
                </ul>
              )}
              {p.when_to_use && (
                <Text size="1" color="gray" as="div" mt="2">
                  Use when: {p.when_to_use}
                </Text>
              )}
              {p.avoid_when && (
                <Text size="1" color="gray" as="div" mt="1">
                  Avoid when: {p.avoid_when}
                </Text>
              )}
            </Box>
          ))}
        </div>
      </Box>

      <Separator size="4" />

      <Box>
        <Heading size="4" mb="2">
          Outreach templates ({templates.length})
        </Heading>
        <Flex direction="column" gap="2">
          {templates.map((t, i) => (
            <Box
              key={i}
              className={css({
                border: "1px solid",
                borderColor: "ui.border",
                borderRadius: "sm",
                p: "3",
              })}
            >
              <Flex justify="between" align="center" gap="2" wrap="wrap">
                <Badge color="indigo" size="1">
                  {t.channel}
                </Badge>
                {t.persona && (
                  <Text size="1" color="gray">
                    {t.persona}
                  </Text>
                )}
              </Flex>
              {t.hook && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Hook
                  </Text>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {t.hook}
                  </Text>
                </Box>
              )}
              {t.body && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Body
                  </Text>
                  <Text
                    size="2"
                    as="p"
                    className={css({ lineHeight: "1.6", whiteSpace: "pre-wrap" })}
                  >
                    {t.body}
                  </Text>
                </Box>
              )}
              {t.cta && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    CTA
                  </Text>
                  <Text size="2" as="p" weight="bold">
                    {t.cta}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Flex>
      </Box>

      {playbook && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="4" mb="2">
              Sales playbook
            </Heading>
            <Flex direction="column" gap="3">
              {playbook.discovery_questions?.length > 0 && (
                <Box
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
                  <Text weight="bold" size="2" as="div" mb="2">
                    Discovery questions
                  </Text>
                  <ul
                    className={css({
                      pl: "4",
                      color: "gray.12",
                      fontSize: "sm",
                      listStyle: "decimal",
                      display: "flex",
                      flexDirection: "column",
                      gap: "1",
                    })}
                  >
                    {playbook.discovery_questions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </Box>
              )}
              {playbook.objections?.length > 0 && (
                <Box>
                  <Text weight="bold" size="2" as="div" mb="2">
                    Objections
                  </Text>
                  <Flex direction="column" gap="2">
                    {playbook.objections.map((o, i) => (
                      <Box
                        key={i}
                        className={css({
                          border: "1px solid",
                          borderColor: "ui.border",
                          borderRadius: "sm",
                          p: "3",
                        })}
                      >
                        <Text size="2" weight="bold" as="div">
                          &ldquo;{o.objection}&rdquo;
                        </Text>
                        {o.response && (
                          <Text
                            size="2"
                            as="p"
                            mt="1"
                            className={css({ lineHeight: "1.5" })}
                          >
                            {o.response}
                          </Text>
                        )}
                        {o.evidence_to_show?.length > 0 && (
                          <Flex gap="1" wrap="wrap" mt="2">
                            {o.evidence_to_show.map((e, j) => (
                              <Badge key={j} color="gray" size="1">
                                {e}
                              </Badge>
                            ))}
                          </Flex>
                        )}
                      </Box>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Box>
        </>
      )}

      {first90.length > 0 && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="4" mb="2">
              First 90 days
            </Heading>
            <Flex direction="column" gap="2">
              {first90.map((step, i) => (
                <Flex
                  key={i}
                  gap="3"
                  align="start"
                  className={css({
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "sm",
                    p: "3",
                  })}
                >
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
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {step}
                  </Text>
                </Flex>
              ))}
            </Flex>
          </Box>
        </>
      )}
    </Flex>
  );
}

export function ProductGtmPage({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  const [analyzeGtm, analyzeState] = useAnalyzeProductGtmAsyncMutation();

  const productId = data?.productBySlug?.id ?? 0;

  const { data: runsData, stopPolling } = usePublicIntelRunsQuery({
    variables: { productId, kind: "gtm" },
    pollInterval: 2000,
    skip: !productId,
    fetchPolicy: "cache-and-network",
  });

  const latestRun = runsData?.productIntelRuns?.[0];
  const terminal = latestRun ? TERMINAL_STATUSES.has(latestRun.status) : true;

  if (latestRun && terminal) {
    stopPolling();
  }

  if (authLoading) return <LoadingShell />;
  if (!user) return <SignInGate />;
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

      <Flex direction="column" gap="3">
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
            <Text size="2" color="gray">
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
            mt: "3",
            pt: "4",
            borderTop: "1px solid",
            borderColor: "ui.border",
          })}
        >
          {gtm ? (
            <GTMAnalysisView data={gtm} />
          ) : latestRun && !terminal ? (
            <Text color="gray" role="status" aria-live="polite">
              Running GTM analysis…
            </Text>
          ) : (
            <Text color="gray">
              No analysis yet.
              {isAdmin
                ? ' Click "Analyze GTM" to run the LangGraph pipeline.'
                : " An admin needs to run the analysis first."}
            </Text>
          )}
        </div>
      </Flex>
      </main>
    </Container>
  );
}
