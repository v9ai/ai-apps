"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Container,
  Flex,
  Separator,
  Text,
} from "@radix-ui/themes";
import {
  CubeIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PersonIcon,
  RocketIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import {
  useProductBySlugQuery,
  useProductLeadsQuery,
} from "@/__generated__/hooks";
import {
  LoadingShell,
  ProductNotFound,
  SubpageBreadcrumb,
  SubpageHero,
} from "./view-chrome";

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

  const product = productData?.productBySlug;
  const conn = leadsData?.productLeads;
  const leads = useMemo(() => conn?.leads ?? [], [conn]);

  if (productLoading && !productData) return <LoadingShell />;
  if (!product) return <ProductNotFound slug={slug} />;

  const tierChipBase = css({
    fontSize: "xs",
    px: "3",
    py: "1",
    borderRadius: "full",
    cursor: "pointer",
    border: "1px solid",
    borderColor: "ui.border",
    bg: "ui.surface",
    color: "gray.11",
    _hover: { bg: "accent.3", borderColor: "accent.7" },
  });
  const tierChipActive = css({
    bg: "accent.9",
    color: "accent.contrast",
    borderColor: "accent.9",
    _hover: { bg: "accent.10" },
  });

  const cardCls = css({
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "md",
    p: "4",
  });

  return (
    <Container size="4" p="6" asChild>
      <main>
      <SubpageBreadcrumb
        productSlug={product.slug}
        productName={product.name}
        currentLabel="Leads"
      />

      <Flex direction="column" gap="4">
        <SubpageHero productName={product.name} currentLabel="Leads" />

        <Text as="p" size="2" color="gray" className={css({ lineHeight: "1.6" })}>
          Companies scored for this product by the vertical signal pipeline.
          Ranked by tier, then by aggregate score.
        </Text>

        <Flex gap="4" wrap="wrap" mt="2">
          <div className={cardCls} style={{ flex: "1 1 140px" }}>
            <Flex align="center" gap="2" mb="1">
              <span aria-hidden="true" className={css({ color: "red.11" })}><StarFilledIcon /></span>
              <Text size="1" color="gray">Hot</Text>
            </Flex>
            <Text size="6" weight="bold" className={css({ color: "red.11" })}>
              {conn?.hotCount ?? 0}
            </Text>
          </div>
          <div className={cardCls} style={{ flex: "1 1 140px" }}>
            <Flex align="center" gap="2" mb="1">
              <span aria-hidden="true" className={css({ color: "amber.11" })}><RocketIcon /></span>
              <Text size="1" color="gray">Warm</Text>
            </Flex>
            <Text size="6" weight="bold" className={css({ color: "amber.11" })}>
              {conn?.warmCount ?? 0}
            </Text>
          </div>
          <div className={cardCls} style={{ flex: "1 1 140px" }}>
            <Flex align="center" gap="2" mb="1">
              <span aria-hidden="true" className={css({ color: "blue.11" })}><PersonIcon /></span>
              <Text size="1" color="gray">Cold</Text>
            </Flex>
            <Text size="6" weight="bold" className={css({ color: "blue.11" })}>
              {conn?.coldCount ?? 0}
            </Text>
          </div>
          <div className={cardCls} style={{ flex: "1 1 140px" }}>
            <Flex align="center" gap="2" mb="1">
              <span aria-hidden="true" className={css({ color: "gray.11" })}><GlobeIcon /></span>
              <Text size="1" color="gray">Total</Text>
            </Flex>
            <Text size="6" weight="bold">
              {conn?.totalCount ?? 0}
            </Text>
          </div>
        </Flex>

        <Separator my="2" size="4" />

        <Flex gap="2" wrap="wrap" align="center">
          <Text size="1" color="gray" mr="2">Filter:</Text>
          {(["all", "hot", "warm", "cold"] as TierFilter[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              className={`${tierChipBase} ${tier === t ? tierChipActive : ""}`}
            >
              {t === "all" ? "All" : tierLabel(t)}
            </button>
          ))}
        </Flex>

        {error && (
          <Text color="red" as="p" role="alert">{error.message}</Text>
        )}

        {leadsLoading && !leadsData ? (
          <Text color="gray" role="status" aria-live="polite">Loading leads…</Text>
        ) : leads.length === 0 ? (
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
            <Text as="p" size="2" color="gray">
              No scored leads yet for this product
              {tier !== "all" ? ` in the ${tier} tier` : ""}.
            </Text>
            <Text as="p" size="1" color="gray" mt="2">
              Leads appear here once the vertical signal pipeline runs against
              discovered companies for this product.
            </Text>
          </Box>
        ) : (
          <Flex direction="column" gap="2">
            {leads.map((lead) => {
              const highlights = extractSignalHighlights(lead.signals);
              const tierColor = lead.tier ? tierBadgeColor[lead.tier] ?? "gray" : "gray";
              return (
                <div key={lead.companyId} className={cardCls}>
                  <Flex justify="between" align="start" gap="3" wrap="wrap">
                    <Flex gap="3" align="center" style={{ minWidth: 0, flex: 1 }}>
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
                      <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
                        <Flex align="center" gap="2" wrap="wrap">
                          <Link
                            href={`/companies/${lead.companyKey}`}
                            className={css({
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
                                color: "accent.11",
                                fontSize: "xs",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "1",
                                textDecoration: "none",
                                borderRadius: "sm",
                                _hover: { textDecoration: "underline" },
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
                        <Flex gap="2" wrap="wrap">
                          {lead.companyIndustry && (
                            <Badge color="gray" size="1">{lead.companyIndustry}</Badge>
                          )}
                          {lead.companySize && (
                            <Badge color="gray" size="1">{lead.companySize}</Badge>
                          )}
                          {lead.companyLocation && (
                            <Badge color="gray" size="1">{lead.companyLocation}</Badge>
                          )}
                        </Flex>
                        {highlights.length > 0 && (
                          <Flex gap="1" wrap="wrap" mt="1">
                            {highlights.map((h, i) => (
                              <Badge key={i} color="indigo" size="1" variant="soft">
                                {h}
                              </Badge>
                            ))}
                          </Flex>
                        )}
                      </Flex>
                    </Flex>
                    <Flex direction="column" align="end" gap="1" style={{ flexShrink: 0 }}>
                      <Badge color={tierColor} size="2">{tierLabel(lead.tier)}</Badge>
                      <Text size="1" color="gray">
                        Score <Text weight="bold" className={css({ color: "gray.12" })}>
                          {lead.score.toFixed(2)}
                        </Text>
                      </Text>
                      {lead.semanticScore != null && (
                        <Text size="1" color="gray">
                          semantic {lead.semanticScore.toFixed(2)}
                        </Text>
                      )}
                    </Flex>
                  </Flex>
                </div>
              );
            })}
          </Flex>
        )}
      </Flex>
      </main>
    </Container>
  );
}
