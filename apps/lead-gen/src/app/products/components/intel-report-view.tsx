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
import {
  ExclamationTriangleIcon,
  LightningBoltIcon,
  MagicWandIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useRunFullProductIntelAsyncMutation,
} from "@/__generated__/hooks";
import { useIntelRunLive } from "@/lib/use-intel-run-live";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import type { ProductIntelReportResult } from "@/lib/langgraph-client";
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

export type IntelReport = ProductIntelReportResult;

const TERMINAL_STATUSES = new Set(["success", "error", "timeout"]);

const eyebrow = css({
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: "bold",
  fontSize: "xs",
  color: "gray.10",
});

function TldrCallout({ text }: { text: string }) {
  return (
    <Box
      role="region"
      aria-label="Executive summary"
      className={css({
        position: "relative",
        bg: "accent.2",
        border: "1px solid",
        borderColor: "accent.6",
        borderLeft: "3px solid",
        borderLeftColor: "accent.9",
        borderRadius: "md",
        p: { base: "4", md: "5" },
      })}
    >
      <Text as="div" mb="2" className={eyebrow}>
        TL;DR
      </Text>
      <Text
        as="p"
        size={{ initial: "3", md: "4" }}
        className={css({
          lineHeight: "1.55",
          color: "gray.12",
          fontWeight: "medium",
        })}
      >
        {text}
      </Text>
    </Box>
  );
}

function PriorityCard({ index, text }: { index: number; text: string }) {
  return (
    <SectionCard emphasized={index === 1}>
      <Flex gap="4" align="start">
        <span
          aria-hidden
          className={css({
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "9",
            height: "9",
            borderRadius: "md",
            bg: index === 1 ? "accent.9" : "accent.3",
            color: index === 1 ? "white" : "accent.11",
            border: "1px solid",
            borderColor: index === 1 ? "accent.9" : "accent.6",
            flexShrink: 0,
          })}
        >
          <Text
            size="3"
            weight="bold"
            className={css({
              fontFamily: "mono",
              fontVariantNumeric: "tabular-nums",
              lineHeight: "1",
            })}
          >
            {index}
          </Text>
        </span>
        <Text
          as="p"
          size={{ initial: "2", md: "3" }}
          className={css({
            lineHeight: "1.55",
            color: "gray.12",
            pt: "1",
          })}
        >
          {text}
        </Text>
      </Flex>
    </SectionCard>
  );
}

function EvidenceRow({
  kind,
  text,
}: {
  kind: "risk" | "win";
  text: string;
}) {
  const isRisk = kind === "risk";
  return (
    <li
      className={css({
        display: "flex",
        gap: "3",
        alignItems: "start",
        py: "3",
        borderBottom: "1px solid",
        borderColor: "ui.border",
        _last: { borderBottom: "none" },
      })}
    >
      <span
        aria-hidden
        className={css({
          color: isRisk ? "orange.10" : "green.10",
          mt: "0.5",
          flexShrink: 0,
          display: "inline-flex",
        })}
      >
        {isRisk ? (
          <ExclamationTriangleIcon width="16" height="16" />
        ) : (
          <LightningBoltIcon width="16" height="16" />
        )}
      </span>
      <Text
        size="2"
        as="p"
        className={css({ lineHeight: "1.55", color: "gray.12" })}
      >
        {text}
      </Text>
    </li>
  );
}

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
    <Flex direction="column" gap="6">
      {data.tldr && <TldrCallout text={data.tldr} />}

      {isAdmin && (
        <Flex gap="2" align="center" wrap="wrap">
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
            <Badge color="gray" size="1" variant="soft">
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
        <section aria-labelledby="priorities-heading">
          <SectionHeading
            eyebrow="Action plan"
            title="Top priorities"
            count={priorities.length}
            description="Ordered by expected impact. The top item is the next single thing to ship."
          />
          <Flex direction="column" gap="2">
            {priorities.map((p, i) => (
              <PriorityCard key={i} index={i + 1} text={p} />
            ))}
          </Flex>
        </section>
      )}

      {(risks.length > 0 || wins.length > 0) && (
        <div
          className={css({
            display: "grid",
            gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
            gap: "5",
          })}
        >
          {risks.length > 0 && (
            <section aria-labelledby="risks-heading">
              <SectionHeading
                eyebrow="Watch list"
                title="Key risks"
                count={risks.length}
                trailing={
                  <span
                    aria-hidden
                    className={css({
                      display: "inline-flex",
                      color: "orange.10",
                    })}
                  >
                    <ExclamationTriangleIcon width="18" height="18" />
                  </span>
                }
              />
              <ul
                className={css({
                  listStyle: "none",
                  p: 0,
                  m: 0,
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  px: "4",
                  bg: "ui.surface",
                })}
              >
                {risks.map((r, i) => (
                  <EvidenceRow key={i} kind="risk" text={r} />
                ))}
              </ul>
            </section>
          )}

          {wins.length > 0 && (
            <section aria-labelledby="wins-heading">
              <SectionHeading
                eyebrow="Momentum"
                title="Quick wins"
                count={wins.length}
                trailing={
                  <span
                    aria-hidden
                    className={css({
                      display: "inline-flex",
                      color: "green.10",
                    })}
                  >
                    <LightningBoltIcon width="18" height="18" />
                  </span>
                }
              />
              <ul
                className={css({
                  listStyle: "none",
                  p: 0,
                  m: 0,
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  px: "4",
                  bg: "ui.surface",
                })}
              >
                {wins.map((w, i) => (
                  <EvidenceRow key={i} kind="win" text={w} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {profile && (
        <>
          <Separator size="4" />
          <section aria-labelledby="profile-heading">
            <SectionHeading
              eyebrow="Reference"
              title="Product profile"
              description={profile.one_liner ?? undefined}
            />
            <SectionCard>
              <Flex direction="column" gap="4">
                <Flex gap="2" wrap="wrap">
                  {profile.category && (
                    <Badge color="indigo" size="1" variant="soft">
                      {profile.category}
                    </Badge>
                  )}
                  {profile.stated_audience && (
                    <Badge color="gray" size="1" variant="soft">
                      {profile.stated_audience}
                    </Badge>
                  )}
                  {profile.visible_pricing && (
                    <Badge color="gray" size="1" variant="soft">
                      {profile.visible_pricing}
                    </Badge>
                  )}
                </Flex>

                {profile.core_jobs?.length > 0 && (
                  <Box>
                    <Text as="div" mb="2" className={eyebrow}>
                      Core jobs
                    </Text>
                    <ul
                      className={css({
                        pl: "4",
                        color: "gray.12",
                        fontSize: "sm",
                        listStyle: "disc",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1",
                        lineHeight: "1.55",
                      })}
                    >
                      {profile.core_jobs.map((j, i) => (
                        <li key={i}>{j}</li>
                      ))}
                    </ul>
                  </Box>
                )}

                {profile.key_features?.length > 0 && (
                  <Box>
                    <Text as="div" mb="2" className={eyebrow}>
                      Key features
                    </Text>
                    <Flex gap="1" wrap="wrap">
                      {profile.key_features.map((f, i) => (
                        <Badge key={i} color="gray" size="1" variant="soft">
                          {f}
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                )}

                {profile.tech_signals?.length > 0 && (
                  <Box>
                    <Text as="div" mb="2" className={eyebrow}>
                      Tech signals
                    </Text>
                    <Flex gap="1" wrap="wrap">
                      {profile.tech_signals.map((s, i) => (
                        <Badge key={i} color="gray" size="1" variant="soft">
                          {s}
                        </Badge>
                      ))}
                    </Flex>
                  </Box>
                )}
              </Flex>
            </SectionCard>
          </section>
        </>
      )}
    </Flex>
  );
}

export function ProductIntelPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const productId = data?.productBySlug?.id ?? 0;

  const { data: runsData } = useIntelRunLive(productId, "product_intel");

  const latestRun = runsData?.productIntelRuns?.[0];
  const terminal = latestRun ? TERMINAL_STATUSES.has(latestRun.status) : true;

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

        <Flex direction="column" gap="4">
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
              <Text
                size="2"
                color="gray"
                className={css({ fontVariantNumeric: "tabular-nums" })}
              >
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
              mt: "5",
              pt: "6",
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
                  className={css({
                    display: "inline-flex",
                    color: "accent.11",
                  })}
                >
                  <MagicWandIcon width="18" height="18" />
                </span>
                <Text color="gray" role="status" aria-live="polite">
                  Running full intel pipeline…
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
                <Heading size="4">No intel report yet</Heading>
                <Text color="gray" size="2">
                  {isAdmin
                    ? "An admin must run the full intel pipeline from the product listing."
                    : "An admin needs to run the pipeline first."}
                </Text>
              </Box>
            )}
          </div>
        </Flex>
      </main>
    </Container>
  );
}
