"use client";

import {
  Badge,
  Box,
  Container,
  Flex,
  Heading,
  Separator,
  Text,
} from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useRunFullProductIntelAsyncMutation,
  usePublicIntelRunsQuery,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { ProductIntelReportResult } from "@/lib/langgraph-client";
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

export type IntelReport = ProductIntelReportResult;

const TERMINAL_STATUSES = new Set(["success", "error", "timeout"]);

export function IntelReportView({
  data,
  productId,
  isAdmin,
}: {
  data: IntelReport;
  productId: number;
  isAdmin: boolean;
}) {
  const [runIntel, runIntelState] = useRunFullProductIntelAsyncMutation();

  async function onRerun() {
    const res = await runIntel({ variables: { id: productId } });
    const runId = res.data?.runFullProductIntelAsync?.runId;
    if (runId) {
      console.log("[intel] rerun started runId=", runId);
    }
  }

  const priorities = data.top_3_priorities ?? [];
  const risks = data.key_risks ?? [];
  const wins = data.quick_wins ?? [];
  const profile = data.product_profile;

  return (
    <Flex direction="column" gap="5">
      {data.tldr && (
        <Box
          className={css({
            bg: "accent.3",
            border: "1px solid",
            borderColor: "accent.8",
            borderRadius: "md",
            p: "4",
          })}
        >
          <Text weight="bold" size="2" as="div" mb="1">
            TL;DR
          </Text>
          <Text size="3" as="p" className={css({ lineHeight: "1.6" })}>
            {data.tldr}
          </Text>
        </Box>
      )}

      {isAdmin && (
        <Flex gap="2" align="center">
          <button
            type="button"
            onClick={onRerun}
            disabled={runIntelState.loading}
            className={button({ variant: "solid", size: "sm" })}
          >
            <MagicWandIcon aria-hidden />
            <span className={css({ ml: "1" })}>
              {runIntelState.loading ? "Starting…" : "Re-run full pipeline"}
            </span>
          </button>
          {runIntelState.data?.runFullProductIntelAsync?.runId && (
            <Badge color="gray" size="1">
              run {runIntelState.data.runFullProductIntelAsync.runId.slice(0, 8)}
            </Badge>
          )}
        </Flex>
      )}

      {runIntelState.error && (
        <Text color="red" as="p" role="alert">
          {runIntelState.error.message}
        </Text>
      )}

      {priorities.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Top 3 priorities
          </Heading>
          <Flex direction="column" gap="2">
            {priorities.map((p, i) => (
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
                  {p}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}

      {risks.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Key risks
          </Heading>
          <Flex direction="column" gap="2">
            {risks.map((r, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Flex gap="2" align="start">
                  <Badge color="orange" size="1">
                    risk
                  </Badge>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {r}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {wins.length > 0 && (
        <Box>
          <Heading size="4" mb="2">
            Quick wins
          </Heading>
          <Flex direction="column" gap="2">
            {wins.map((w, i) => (
              <Box
                key={i}
                className={css({
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "sm",
                  p: "3",
                })}
              >
                <Flex gap="2" align="start">
                  <Badge color="green" size="1">
                    win
                  </Badge>
                  <Text size="2" as="p" className={css({ lineHeight: "1.5" })}>
                    {w}
                  </Text>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      )}

      {profile && (
        <>
          <Separator size="4" />
          <Box>
            <Heading size="4" mb="2">
              Product profile
            </Heading>
            <Flex direction="column" gap="2">
              {profile.one_liner && (
                <Text size="3" as="p" className={css({ lineHeight: "1.5" })}>
                  {profile.one_liner}
                </Text>
              )}
              <Flex gap="2" wrap="wrap">
                {profile.category && (
                  <Badge color="indigo" size="1">
                    {profile.category}
                  </Badge>
                )}
                {profile.stated_audience && (
                  <Badge color="gray" size="1">
                    {profile.stated_audience}
                  </Badge>
                )}
                {profile.visible_pricing && (
                  <Badge color="gray" size="1">
                    {profile.visible_pricing}
                  </Badge>
                )}
              </Flex>
              {profile.core_jobs?.length > 0 && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Core jobs
                  </Text>
                  <ul
                    className={css({
                      pl: "4",
                      color: "gray.12",
                      fontSize: "sm",
                      listStyle: "disc",
                    })}
                  >
                    {profile.core_jobs.map((j, i) => (
                      <li key={i}>{j}</li>
                    ))}
                  </ul>
                </Box>
              )}
              {profile.key_features?.length > 0 && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Key features
                  </Text>
                  <Flex gap="1" wrap="wrap" mt="1">
                    {profile.key_features.map((f, i) => (
                      <Badge key={i} color="gray" size="1">
                        {f}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
              {profile.tech_signals?.length > 0 && (
                <Box mt="2">
                  <Text size="1" color="gray" weight="bold" as="div">
                    Tech signals
                  </Text>
                  <Flex gap="1" wrap="wrap" mt="1">
                    {profile.tech_signals.map((s, i) => (
                      <Badge key={i} color="gray" size="1">
                        {s}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
            </Flex>
          </Box>
        </>
      )}
    </Flex>
  );
}

export function ProductIntelPage({ slug }: { slug: string }) {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  const productId = data?.productBySlug?.id ?? 0;

  const { data: runsData, stopPolling } = usePublicIntelRunsQuery({
    variables: { productId, kind: "product_intel" },
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

  const report = (product.intelReport ?? null) as IntelReport | null;
  const analyzedAt = product.intelReportAt ? new Date(product.intelReportAt) : null;

  return (
    <Container size="4" p="6" asChild>
      <main>
      <SubpageBreadcrumb
        productSlug={product.slug}
        productName={product.name}
        currentLabel="Intel"
      />

      <Flex direction="column" gap="3">
        <SubpageHero
          productName={product.name}
          currentLabel="Intel"
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
              Updated {analyzedAt.toLocaleString()}
            </Text>
          )}
        </Flex>

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
          {report ? (
            <IntelReportView
              data={report}
              productId={product.id}
              isAdmin={isAdmin}
            />
          ) : latestRun && !terminal ? (
            <Text color="gray" role="status" aria-live="polite">
              Running full intel pipeline…
            </Text>
          ) : (
            <Text color="gray">
              No intel report yet.
              {isAdmin
                ? " An admin must run the full intel pipeline from the product listing."
                : " An admin needs to run the pipeline first."}
            </Text>
          )}
        </div>
      </Flex>
      </main>
    </Container>
  );
}
