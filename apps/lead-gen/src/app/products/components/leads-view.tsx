"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Flex,
  Spinner,
  Text,
} from "@radix-ui/themes";
import {
  CubeIcon,
  ExternalLinkIcon,
  PaperPlaneIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { css, cx } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useProductLeadsQuery,
  useGetContactsLazyQuery,
  useCreateDraftCampaignMutation,
} from "@/__generated__/hooks";
import {
  LoadingShell,
  ProductNotFound,
  SubpageBreadcrumb,
  SubpageHero,
} from "./view-chrome";
import {
  DecisionMakersDialog,
  type ContactRow,
} from "./decision-makers-dialog";

type Lead = NonNullable<
  NonNullable<
    ReturnType<typeof useProductLeadsQuery>["data"]
  >["productLeads"]
>["leads"][number];

type TierFilter = "all" | "hot" | "warm" | "cold";

type SignalShape = {
  schema_version?: string;
  top_signals?: { key: string; label?: string; weight?: number }[];
  matched_keywords?: string[];
  evidence?: string[];
  [k: string]: unknown;
};

const tierBadgeColor: Record<string, "red" | "amber" | "blue" | "gray"> = {
  hot: "red",
  warm: "amber",
  cold: "blue",
};

// Token-aligned rail color per tier — matches the badge color family.
const tierRailToken: Record<string, string> = {
  hot: "red.9",
  warm: "amber.9",
  cold: "blue.9",
};

function tierLabel(t: string | null | undefined): string {
  if (!t) return "Unscored";
  return t[0].toUpperCase() + t.slice(1);
}

function extractSignalHighlights(signals: unknown): string[] {
  if (!signals || typeof signals !== "object") return [];
  const s = signals as SignalShape;
  const out: string[] = [];
  if (Array.isArray(s.top_signals)) {
    for (const sig of s.top_signals.slice(0, 3)) {
      if (sig?.label) out.push(sig.label);
      else if (sig?.key) out.push(sig.key);
    }
  }
  if (out.length === 0 && Array.isArray(s.matched_keywords)) {
    out.push(...s.matched_keywords.slice(0, 3).map(String));
  }
  if (out.length === 0 && Array.isArray(s.evidence)) {
    out.push(...s.evidence.slice(0, 2).map((e) => String(e).slice(0, 80)));
  }
  return out;
}

export function ProductLeadsPage({ slug }: { slug: string }) {
  const [tier, setTier] = useState<TierFilter>("all");
  const [creatingForCompanyId, setCreatingForCompanyId] = useState<number | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const router = useRouter();

  const { data: productData, loading: productLoading } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const { data: leadsData, loading: leadsLoading, error } = useProductLeadsQuery({
    variables: {
      slug,
      tier: tier === "all" ? null : tier,
      limit: 100,
      offset: 0,
    },
    fetchPolicy: "cache-and-network",
  });

  const [fetchContacts] = useGetContactsLazyQuery();
  const [createDraftCampaign] = useCreateDraftCampaignMutation();

  const product = productData?.productBySlug;
  const conn = leadsData?.productLeads;
  const leads = useMemo(() => conn?.leads ?? [], [conn]);

  const handleStartCampaign = async (lead: (typeof leads)[number]) => {
    if (!product) return;
    setCampaignError(null);
    setCreatingForCompanyId(lead.companyId);
    try {
      const contactsResult = await fetchContacts({
        variables: {
          companyId: lead.companyId,
          includeFlagged: false,
          limit: 200,
        },
        fetchPolicy: "network-only",
      });
      const recipientEmails = (contactsResult.data?.contacts?.contacts ?? [])
        .filter((c) => c.emailVerified && !c.doNotContact && c.email)
        .map((c) => c.email as string);

      const result = await createDraftCampaign({
        variables: {
          input: {
            name: `${product.name} → ${lead.companyName}`,
            companyId: lead.companyId,
            productId: product.id,
            productAwareMode: true,
            personaMatchThreshold: 0.55,
            recipientEmails,
          },
        },
      });

      const newId = result.data?.createDraftCampaign?.id;
      if (!newId) {
        throw new Error("Campaign created but no id returned");
      }
      router.push(`/companies/${lead.companyKey}/campaigns?edit=${encodeURIComponent(newId)}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create campaign";
      setCampaignError(`${lead.companyName}: ${msg}`);
      setCreatingForCompanyId(null);
    }
  };

  if (productLoading && !productData) return <LoadingShell />;
  if (!product) return <ProductNotFound slug={slug} />;

  // Lead card with a left tier-color rail. Tighter padding for higher density,
  // hover lift via border + bg shift.
  const leadCardCls = css({
    position: "relative",
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "md",
    pl: "4",
    pr: "4",
    py: "3",
    overflow: "hidden",
    transition: "border-color 120ms ease, background 120ms ease",
    _hover: { borderColor: "ui.borderHover", bg: "ui.surfaceHover" },
  });

  return (
    <Container size="4" p="6" asChild>
      <main>
      <SubpageBreadcrumb
        productSlug={product.slug}
        productName={product.name}
        currentLabel="Leads"
      />

      <Flex direction="column" gap="5">
        <SubpageHero productName={product.name} currentLabel="Leads" />

        <Text
          as="p"
          size="2"
          color="gray"
          className={css({ lineHeight: "1.6", maxWidth: "62ch" })}
        >
          Companies scored for this product by the vertical signal pipeline.
          Ranked by tier, then by aggregate score.
        </Text>

        {/* FILTER STRIP */}
        <Flex
          gap="2"
          wrap="wrap"
          align="center"
          className={css({
            pb: "1",
          })}
        >
          <Text
            size="1"
            color="gray"
            mr="2"
            className={css({
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontWeight: 500,
            })}
          >
            Filter
          </Text>
          {(["all", "hot", "warm", "cold"] as TierFilter[]).map((t) => {
            const tone =
              t === "hot"
                ? "red"
                : t === "warm"
                ? "amber"
                : t === "cold"
                ? "blue"
                : "neutral";
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                aria-pressed={tier === t}
                className={button({ variant: "chip", size: "sm", tone })}
              >
                {t === "all" ? "All" : tierLabel(t)}
              </button>
            );
          })}
          {leads.length > 0 && (
            <Text
              size="1"
              color="gray"
              ml="auto"
              className={css({ fontVariantNumeric: "tabular-nums" })}
            >
              Showing {leads.length}
              {conn?.totalCount ? ` of ${conn.totalCount}` : ""}
            </Text>
          )}
        </Flex>

        {error && (
          <Text color="red" as="p" role="alert">{error.message}</Text>
        )}

        {campaignError && (
          <Text color="red" size="2" as="p" role="alert">
            Campaign error — {campaignError}
          </Text>
        )}

        {leadsLoading && !leadsData ? (
          <Text color="gray" role="status" aria-live="polite">Loading leads…</Text>
        ) : leads.length === 0 ? (
          <Box
            className={css({
              bg: "ui.surface",
              border: "1px dashed",
              borderColor: "ui.border",
              borderRadius: "lg",
              px: "6",
              py: "10",
              textAlign: "center",
            })}
          >
            <span
              aria-hidden="true"
              className={css({
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                borderRadius: "full",
                bg: "accent.3",
                color: "accent.11",
                mb: "3",
              })}
            >
              <PersonIcon width="20" height="20" />
            </span>
            <Text
              as="p"
              size="3"
              weight="medium"
              className={css({ color: "gray.12", mb: "1" })}
            >
              No scored leads yet
              {tier !== "all" ? ` in the ${tier} tier` : ""}
            </Text>
            <Text
              as="p"
              size="2"
              color="gray"
              className={css({ maxWidth: "380px", mx: "auto", lineHeight: "1.5" })}
            >
              Leads appear here once the vertical signal pipeline runs against
              discovered companies for this product.
            </Text>
          </Box>
        ) : (
          <Flex direction="column" gap="2">
            {leads.map((lead) => {
              const highlights = extractSignalHighlights(lead.signals);
              const tierKey = lead.tier ?? "";
              const tierColor = tierKey ? tierBadgeColor[tierKey] ?? "gray" : "gray";
              const railToken = tierKey ? tierRailToken[tierKey] : undefined;
              const isSelf = creatingForCompanyId === lead.companyId;
              const isSiblingBusy = creatingForCompanyId !== null && !isSelf;
              return (
                <article key={lead.companyId} className={leadCardCls}>
                  {/* Left tier-color rail — token-driven so we stay on palette */}
                  <span
                    aria-hidden="true"
                    className={css({
                      position: "absolute",
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: "3px",
                      bg: railToken ?? "gray.6",
                    })}
                  />
                  <Flex justify="between" align="start" gap="3" wrap="wrap">
                    <Flex gap="3" align="center" className={css({ minWidth: 0, flex: 1 })}>
                      {lead.companyLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={lead.companyLogoUrl}
                          alt={`${lead.companyName} logo`}
                          className={css({
                            width: "36px",
                            height: "36px",
                            borderRadius: "sm",
                            objectFit: "contain",
                            bg: "gray.2",
                            flexShrink: 0,
                          })}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className={css({
                            width: "36px",
                            height: "36px",
                            borderRadius: "sm",
                            bg: "accent.3",
                            color: "accent.11",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          })}
                        >
                          <CubeIcon />
                        </span>
                      )}
                      <Flex direction="column" gap="1" className={css({ minWidth: 0 })}>
                        <Flex align="center" gap="2" wrap="wrap">
                          <Link
                            href={`/companies/${lead.companyKey}`}
                            className={css({
                              fontSize: "sm",
                              fontWeight: 600,
                              color: "gray.12",
                              textDecoration: "none",
                              _hover: { color: "accent.11", textDecoration: "underline" },
                            })}
                          >
                            {lead.companyName}
                          </Link>
                          {lead.companyDomain && (
                            <a
                              href={`https://${lead.companyDomain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open ${lead.companyName} website in new tab`}
                              className={css({
                                color: "gray.10",
                                fontSize: "xs",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "1",
                                textDecoration: "none",
                                borderRadius: "sm",
                                _hover: { color: "accent.11", textDecoration: "underline" },
                                _focusVisible: {
                                  outline: "2px solid",
                                  outlineColor: "accent.9",
                                  outlineOffset: "2px",
                                },
                              })}
                            >
                              {lead.companyDomain}
                              <ExternalLinkIcon aria-hidden />
                            </a>
                          )}
                        </Flex>
                        {(lead.companyIndustry || lead.companySize || lead.companyLocation) && (
                          <Flex gap="1" wrap="wrap">
                            {lead.companyIndustry && (
                              <Badge color="gray" size="1" variant="soft">{lead.companyIndustry}</Badge>
                            )}
                            {lead.companySize && (
                              <Badge color="gray" size="1" variant="soft">{lead.companySize}</Badge>
                            )}
                            {lead.companyLocation && (
                              <Badge color="gray" size="1" variant="soft">{lead.companyLocation}</Badge>
                            )}
                          </Flex>
                        )}
                        {highlights.length > 0 && (
                          <Flex gap="1" wrap="wrap">
                            {highlights.map((h, i) => (
                              <Badge key={i} color="indigo" size="1" variant="soft">
                                {h}
                              </Badge>
                            ))}
                          </Flex>
                        )}
                      </Flex>
                    </Flex>
                    <Flex
                      direction="column"
                      align="end"
                      gap="1"
                      className={css({ flexShrink: 0 })}
                    >
                      <Badge color={tierColor} size="2">{tierLabel(lead.tier)}</Badge>
                      <Text
                        size="1"
                        color="gray"
                        className={css({ fontVariantNumeric: "tabular-nums" })}
                      >
                        Score{" "}
                        <Text
                          weight="bold"
                          className={css({
                            color: "gray.12",
                            fontVariantNumeric: "tabular-nums",
                          })}
                        >
                          {lead.score.toFixed(2)}
                        </Text>
                      </Text>
                      {lead.semanticScore != null && (
                        <Text
                          size="1"
                          color="gray"
                          className={css({ fontVariantNumeric: "tabular-nums" })}
                        >
                          semantic {lead.semanticScore.toFixed(2)}
                        </Text>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartCampaign(lead)}
                        disabled={creatingForCompanyId !== null}
                        aria-busy={isSelf}
                        aria-label={
                          isSelf
                            ? `Starting campaign for ${lead.companyName}`
                            : `Start campaign for ${lead.companyName}`
                        }
                        className={cx(
                          button({ variant: "secondary", size: "sm" }),
                          css({
                            mt: "2",
                            alignSelf: "stretch",
                            justifyContent: "center",
                          }),
                          isSiblingBusy && css({ opacity: "0.6" }),
                        )}
                      >
                        {isSelf ? <Spinner size="1" /> : <PaperPlaneIcon aria-hidden />}
                        {isSelf
                          ? "Starting…"
                          : isSiblingBusy
                          ? "Queued"
                          : "Start campaign"}
                      </button>
                    </Flex>
                  </Flex>
                </article>
              );
            })}
          </Flex>
        )}
      </Flex>
      </main>
    </Container>
  );
}
