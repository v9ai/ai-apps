"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Container, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  LightningBoltIcon,
  Link2Icon,
  LockClosedIcon,
  RocketIcon,
  LayersIcon,
  MagicWandIcon,
  ComponentInstanceIcon,
  BarChartIcon,
  StarIcon,
  PersonIcon,
  PaperPlaneIcon,
  ArrowRightIcon,
  ReaderIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useProductLeadsPreviewQuery,
  useGetContactsLazyQuery,
  useCreateDraftCampaignMutation,
} from "@/__generated__/hooks";
import type {
  PricingStrategyResult,
  GTMStrategyResult,
  ProductIntelReportResult,
} from "@/lib/langgraph-client";
import {
  LoadingShell,
  ErrorShell,
  ProductNotFound,
  ProductExternalLink,
  SectionOpener,
  DossierCard,
  HeroStatTrio,
  OutreachCTA,
  Colophon,
} from "./view-chrome";
import { ProductSectionNav, type SectionNavItem } from "./product-section-nav";

type PositioningSneak = {
  category?: string;
  positioning_statement?: string;
  differentiators?: string[];
};

type IcpSneak = {
  weighted_total?: number;
  segments?: { name: string; industry?: string; stage?: string }[];
  personas?: { title: string; seniority?: string }[];
};

type Stat = { label: string; value: string };
type PipelineStage = { stage: string; description: string };
type Section = { title: string; items: string[] };
type Highlights = {
  tagline?: string;
  subtitle?: string;
  stats?: Stat[];
  pipeline?: PipelineStage[];
  sections?: Section[];
};

function sectionIcon(title: string) {
  const t = title.toLowerCase();
  if (t.includes("core")) return <LightningBoltIcon />;
  if (t.includes("production") || t.includes("deploy")) return <RocketIcon />;
  if (t.includes("integration")) return <Link2Icon />;
  if (t.includes("compliance") || t.includes("security")) return <LockClosedIcon />;
  if (t.includes("review") || t.includes("mode")) return <ReaderIcon />;
  if (t.includes("knowledge") || t.includes("ckb") || t.includes("axiom")) return <LayersIcon />;
  if (t.includes("repetition") || t.includes("learn")) return <MagicWandIcon />;
  if (t.includes("capab") || t.includes("feature")) return <StarIcon />;
  return <ComponentInstanceIcon />;
}

function tierToColor(tier?: string): "red" | "amber" | "blue" {
  return tier === "hot" ? "red" : tier === "warm" ? "amber" : "blue";
}

export function ProductDetail({ slug }: { slug: string }) {
  const { data, loading, error } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const { data: leadsPreviewData } = useProductLeadsPreviewQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const router = useRouter();
  const [fetchContacts] = useGetContactsLazyQuery();
  const [createDraftCampaign] = useCreateDraftCampaignMutation();
  const [creatingForCompanyId, setCreatingForCompanyId] = useState<number | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);

  const product = data?.productBySlug;

  const handleStartCampaign = async (lead: {
    companyId: number;
    companyKey: string;
    companyName: string;
  }) => {
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

  if (loading && !data) return <LoadingShell />;
  if (error) return <ErrorShell message={error.message} />;
  if (!product) return <ProductNotFound slug={slug} />;

  const highlights = (product.highlights ?? null) as Highlights | null;
  const positioning = (product.positioningAnalysis ?? null) as PositioningSneak | null;
  const icp = (product.icpAnalysis ?? null) as IcpSneak | null;
  const pricing = (product.pricingAnalysis ?? null) as PricingStrategyResult | null;
  const gtm = (product.gtmAnalysis ?? null) as GTMStrategyResult | null;
  const intel = (product.intelReport ?? null) as ProductIntelReportResult | null;
  const leadsPreview = leadsPreviewData?.productLeads ?? null;
  const hasLeads = (leadsPreview?.totalCount ?? 0) > 0;

  const cardLabelCls = css({
    fontSize: "2xs",
    letterSpacing: "editorial",
    textTransform: "uppercase",
    fontWeight: "bold",
    color: "gray.11",
  });
  const viewFullCls = button({ variant: "link", size: "sm" });
  const sectionAnchorCls = css({ scrollMarginTop: "120px" });
  const cardEntranceCls = css({
    animation: "slideUp",
    animationFillMode: "both",
  });
  const leadsSpotlightCls = css({
    bg: "accent.2",
    border: "1px solid token(colors.accent.6)",
    borderRadius: "lg",
    p: "5",
    transition: "border-color {durations.fast} ease",
    _hover: { borderColor: "accent.8" },
    scrollMarginTop: "120px",
  });
  const gaugeFillBase = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    height: "100%",
    transition: "width {durations.slow} {easings.expoOut}",
  };
  const gaugeFillHot = css({ ...gaugeFillBase, bg: "red.9" });
  const gaugeFillWarm = css({ ...gaugeFillBase, bg: "amber.9" });
  const gaugeFillCold = css({ ...gaugeFillBase, bg: "blue.9" });

  // Build numbered sections by RENDERED order — sections that don't render
  // due to missing data don't take up a number.
  type Numbered = { id: string; label: string; nav: SectionNavItem };
  const orderedSections: Numbered[] = [];
  if (positioning) orderedSections.push({ id: "positioning", label: "Positioning", nav: { id: "positioning", label: "Positioning" } });
  if (icp) orderedSections.push({ id: "icp", label: "Ideal customer profile", nav: { id: "icp", label: "ICP" } });
  if (pricing) orderedSections.push({ id: "pricing", label: "Pricing", nav: { id: "pricing", label: "Pricing" } });
  if (gtm) orderedSections.push({ id: "gtm", label: "Go-to-market", nav: { id: "gtm", label: "GTM" } });
  if (intel) orderedSections.push({ id: "intel", label: "Intel", nav: { id: "intel", label: "Intel" } });
  if (highlights?.pipeline && highlights.pipeline.length > 0) {
    orderedSections.push({ id: "pipeline", label: "Pipeline", nav: { id: "pipeline", label: "Pipeline" } });
  }
  if (highlights?.sections && highlights.sections.length > 0) {
    orderedSections.push({ id: "capabilities", label: "Capabilities", nav: { id: "capabilities", label: "Capabilities" } });
  }
  const numberFor = (id: string) => {
    const idx = orderedSections.findIndex((s) => s.id === id);
    return idx >= 0 ? String(idx + 1).padStart(2, "0") : "";
  };

  // Sticky-nav items: prepend Leads (above intelligence sections if hasLeads)
  // and append Outreach.
  const navItems: SectionNavItem[] = [];
  if (hasLeads) navItems.push({ id: "leads", label: "Leads", count: leadsPreview?.totalCount });
  for (const s of orderedSections) navItems.push(s.nav);
  navItems.push({ id: "outreach", label: "Outreach" });

  // Hero stat trio — three highest-signal stats.
  const trio: { label: string; value: string; tone?: "default" | "hot" | "icp" | "muted" }[] = [];
  if (leadsPreview) {
    trio.push({
      label: "Hot leads",
      value: String(leadsPreview.hotCount ?? 0),
      tone: (leadsPreview.hotCount ?? 0) > 0 ? "hot" : "muted",
    });
  }
  if (icp?.weighted_total != null) {
    trio.push({
      label: "ICP fit",
      value: `${Math.round((icp.weighted_total ?? 0) * 100)}%`,
      tone: "icp",
    });
  }
  if (leadsPreview) {
    trio.push({
      label: "Pipeline size",
      value: String(leadsPreview.totalCount ?? 0),
    });
  }

  const filedDateLine = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(product.createdAt)
  );

  return (
    <Container size="4" px="6" py={{ initial: "8", md: "9" }} asChild>
      <main>
      <nav aria-label="Breadcrumb" className={css({ mb: "5" })}>
        <Flex asChild>
          <ol className={css({ listStyle: "none", p: 0, m: 0 })}>
            <li>
              <Link
                href="/products"
                className={button({ variant: "ghost", size: "sm" })}
              >
                <ArrowLeftIcon aria-hidden /> Products
              </Link>
            </li>
          </ol>
        </Flex>
      </nav>

      {/* HERO — editorial 60/40 grid: display H1 + kicker + lede + CTAs / glass stat-trio */}
      <header
        className={css({
          mb: "6",
          pb: "6",
          borderBottom: "1px solid token(colors.ui.border)",
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "minmax(0, 1.6fr) minmax(280px, 1fr)" },
          gap: "8",
          alignItems: "start",
        })}
      >
        <div>
          {/* Kicker line */}
          <Text
            as="p"
            className={css({
              fontSize: "xs",
              letterSpacing: "editorial",
              textTransform: "uppercase",
              color: "ui.tertiary",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              mb: "4",
            })}
          >
            Intel briefing · {filedDateLine}
            {highlights?.subtitle && <> · {highlights.subtitle}</>}
          </Text>

          {/* Display H1 — inline style overrides Radix Themes' unlayered
              .radix-themes font-family rule (which would otherwise win the
              cascade for inherited heading typography). */}
          <h1
            style={{ fontFamily: "var(--font-instrument), Georgia, 'Times New Roman', serif" }}
            className={css({
              fontWeight: 400,
              fontSize: "clamp(2.5rem, 6vw + 0.5rem, 5.25rem)",
              lineHeight: "0.95",
              letterSpacing: "tighter",
              color: "ui.heading",
              m: 0,
            })}
          >
            {product.name}
          </h1>

          {/* Hairline divider */}
          <hr
            aria-hidden="true"
            className={css({
              border: 0,
              height: "1px",
              background: "ui.border",
              my: "6",
            })}
          />

          {/* Lede */}
          {highlights?.tagline && (
            <Text
              as="p"
              size="5"
              className={css({
                lineHeight: "1.5",
                color: "ui.body",
                maxWidth: "62ch",
                fontWeight: 350,
                mb: "5",
              })}
            >
              {highlights.tagline}
            </Text>
          )}
          {!highlights?.tagline && product.description && (
            <Text
              as="p"
              size="4"
              className={css({
                lineHeight: "1.55",
                color: "ui.body",
                maxWidth: "62ch",
                mb: "5",
              })}
            >
              {product.description}
            </Text>
          )}

          {/* CTA group */}
          <Flex gap="3" wrap="wrap" align="center">
            {hasLeads ? (
              <Link
                href={`/products/${product.slug}/leads`}
                className={button({ variant: "gradient", size: "md" })}
              >
                View {leadsPreview?.totalCount ?? 0} leads <ArrowRightIcon aria-hidden />
              </Link>
            ) : (
              <a
                href="#outreach"
                className={button({ variant: "gradient", size: "md" })}
              >
                Run outreach <ArrowRightIcon aria-hidden />
              </a>
            )}
            {intel && (
              <Link
                href={`/products/${product.slug}/intel`}
                className={button({ variant: "outline", size: "md" })}
              >
                Read intel report
              </Link>
            )}
            <ProductExternalLink
              url={product.url}
              domain={product.url}
              productName={product.name}
            />
          </Flex>
        </div>

        {/* Right column — stat trio */}
        {trio.length > 0 && <HeroStatTrio stats={trio} />}
      </header>

      {/* Sticky scroll-spy nav */}
      <ProductSectionNav items={navItems} />

      <Flex direction="column" gap={{ initial: "7", md: "8", lg: "9" }}>
        {/* LEADS SPOTLIGHT — promoted full-width, conversion-critical */}
        {hasLeads && leadsPreview && (
          <section id="leads" aria-labelledby="leads-spotlight" className={leadsSpotlightCls}>
            <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
              <Flex align="center" gap="2">
                <span aria-hidden="true" className={css({ color: "accent.11" })}>
                  <PersonIcon />
                </span>
                <Text id="leads-spotlight" className={cardLabelCls}>
                  Leads
                </Text>
                {leadsPreview.totalCount > 0 && (
                  <Badge color="gray" size="1" variant="soft">
                    {leadsPreview.totalCount} total
                  </Badge>
                )}
                {leadsPreview.hotCount > 0 && (
                  <Badge color="red" size="1">
                    {leadsPreview.hotCount} hot
                  </Badge>
                )}
                {leadsPreview.warmCount > 0 && (
                  <Badge color="amber" size="1">
                    {leadsPreview.warmCount} warm
                  </Badge>
                )}
              </Flex>
              <Link href={`/products/${product.slug}/leads`} className={viewFullCls}>
                Open lead board <ArrowRightIcon aria-hidden />
              </Link>
            </Flex>
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", sm: "1fr 1fr" },
                gap: "2",
              })}
            >
              {leadsPreview.leads.slice(0, 4).map((lead) => {
                const gaugeCls =
                  lead.tier === "hot"
                    ? gaugeFillHot
                    : lead.tier === "warm"
                      ? gaugeFillWarm
                      : gaugeFillCold;
                const pct = Math.round(Math.min(1, Math.max(0, lead.score)) * 100);
                return (
                  <div
                    key={lead.companyId}
                    className={css({
                      display: "flex",
                      alignItems: "center",
                      gap: "2",
                      flexWrap: "nowrap",
                      minWidth: 0,
                      px: "3",
                      py: "2",
                      bg: "ui.surface",
                      borderRadius: "md",
                      border: "1px solid token(colors.ui.border)",
                      transition: "border-color {durations.fast} ease, background {durations.fast} ease",
                      _hover: {
                        borderColor: "accent.7",
                        bg: "ui.surfaceRaised",
                      },
                    })}
                  >
                    <Link
                      href={`/companies/${lead.companyKey}`}
                      className={css({
                        fontSize: "sm",
                        fontWeight: 600,
                        color: "gray.12",
                        textDecoration: "none",
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        _hover: { color: "accent.11", textDecoration: "underline" },
                      })}
                    >
                      {lead.companyName}
                    </Link>
                    {lead.tier && (
                      <Badge
                        color={tierToColor(lead.tier)}
                        size="1"
                        className={css({ flexShrink: 0 })}
                      >
                        {lead.tier}
                      </Badge>
                    )}
                    {/* Inline score gauge */}
                    <span
                      aria-label={`Score ${lead.score.toFixed(2)}`}
                      className={css({
                        position: "relative",
                        width: "32px",
                        height: "4px",
                        bg: "gray.4",
                        borderRadius: "full",
                        overflow: "hidden",
                        flexShrink: 0,
                      })}
                    >
                      <span
                        className={gaugeCls}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <Text
                      size="1"
                      color="gray"
                      className={css({
                        fontVariantNumeric: "tabular-nums",
                        flexShrink: 0,
                      })}
                    >
                      {lead.score.toFixed(2)}
                    </Text>
                    <button
                      type="button"
                      onClick={() => handleStartCampaign(lead)}
                      disabled={creatingForCompanyId !== null}
                      aria-label={`Start campaign for ${lead.companyName}`}
                      title={`Start campaign for ${lead.companyName}`}
                      className={`${button({ variant: "outline", size: "sm" })} ${css({ flexShrink: 0 })}`}
                    >
                      {creatingForCompanyId === lead.companyId ? (
                        <Spinner size="1" />
                      ) : (
                        <PaperPlaneIcon aria-hidden />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            {campaignError && (
              <Text
                as="p"
                size="1"
                color="red"
                className={css({ mt: "2" })}
                role="alert"
              >
                {campaignError}
              </Text>
            )}
          </section>
        )}

        {/* INTELLIGENCE GRID — bonded-paper DossierCards w/ numbered openers */}
        {(positioning || icp || pricing || gtm || intel) && (
          <section aria-label="Intelligence summary">
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
                gap: "4",
              })}
            >
              {positioning && (
                <DossierCard
                  tone="indigo"
                  id="positioning"
                  className={`${cardEntranceCls} ${sectionAnchorCls}`}
                >
                  <SectionOpener number={numberFor("positioning")} label="Positioning" />
                  <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
                    <Flex align="center" gap="2">
                      <span aria-hidden="true" className={css({ color: "indigo.11" })}>
                        <StarIcon />
                      </span>
                      <Text className={cardLabelCls}>Positioning</Text>
                      {positioning.category && (
                        <Badge color="indigo" size="1" variant="soft">
                          {positioning.category}
                        </Badge>
                      )}
                    </Flex>
                    <Link href={`/products/${product.slug}/positioning`} className={viewFullCls}>
                      View <ArrowRightIcon aria-hidden />
                    </Link>
                  </Flex>
                  {positioning.positioning_statement && (
                    <Text size="2" as="p" className={css({ lineHeight: "1.55", mb: "3", color: "gray.12", maxWidth: "60ch" })}>
                      {positioning.positioning_statement.length > 160
                        ? positioning.positioning_statement.slice(0, 160) + "…"
                        : positioning.positioning_statement}
                    </Text>
                  )}
                  {(positioning.differentiators ?? []).slice(0, 3).map((d, i) => (
                    <Flex key={i} align="start" gap="2" mb="2">
                      <span aria-hidden="true" className={css({ color: "indigo.11", flexShrink: 0, mt: "2px" })}>
                        <CheckIcon />
                      </span>
                      <Text size="1" color="gray" className={css({ lineHeight: "1.5" })}>
                        {d}
                      </Text>
                    </Flex>
                  ))}
                </DossierCard>
              )}

              {icp && (
                <DossierCard
                  tone="green"
                  id="icp"
                  className={`${cardEntranceCls} ${sectionAnchorCls}`}
                >
                  <SectionOpener number={numberFor("icp")} label="Ideal customer profile" />
                  <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
                    <Flex align="center" gap="2">
                      <span aria-hidden="true" className={css({ color: "green.11" })}>
                        <ComponentInstanceIcon />
                      </span>
                      <Text className={cardLabelCls}>ICP</Text>
                      {icp.weighted_total != null && (
                        <Badge color="green" size="1">
                          {Math.round(icp.weighted_total * 100)}% fit
                        </Badge>
                      )}
                    </Flex>
                    <Link href={`/products/${product.slug}/icp`} className={viewFullCls}>
                      View <ArrowRightIcon aria-hidden />
                    </Link>
                  </Flex>
                  {(icp.segments ?? []).slice(0, 2).map((s, i) => (
                    <Flex key={i} align="center" gap="1" mb="2" wrap="wrap">
                      <Text size="2" weight="medium">
                        {s.name}
                      </Text>
                      {s.industry && (
                        <Badge color="gray" size="1" variant="soft">
                          {s.industry}
                        </Badge>
                      )}
                      {s.stage && (
                        <Badge color="blue" size="1" variant="soft">
                          {s.stage}
                        </Badge>
                      )}
                    </Flex>
                  ))}
                  {(icp.personas ?? []).slice(0, 2).map((p, i) => (
                    <Flex key={i} align="center" gap="1" mb="2">
                      <Text size="1" color="gray">
                        {p.title}
                      </Text>
                      {p.seniority && (
                        <Badge color="gray" size="1" variant="soft">
                          {p.seniority}
                        </Badge>
                      )}
                    </Flex>
                  ))}
                </DossierCard>
              )}

              {pricing && (
                <DossierCard
                  tone="amber"
                  id="pricing"
                  className={`${cardEntranceCls} ${sectionAnchorCls}`}
                >
                  <SectionOpener number={numberFor("pricing")} label="Pricing" />
                  <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
                    <Flex align="center" gap="2">
                      <span aria-hidden="true" className={css({ color: "amber.11" })}>
                        <BarChartIcon />
                      </span>
                      <Text className={cardLabelCls}>Pricing</Text>
                      {pricing.model?.model_type && (
                        <Badge color="gray" size="1" variant="soft">
                          {pricing.model.model_type}
                        </Badge>
                      )}
                    </Flex>
                    <Link href={`/products/${product.slug}/pricing`} className={viewFullCls}>
                      View <ArrowRightIcon aria-hidden />
                    </Link>
                  </Flex>
                  {pricing.rationale?.recommendation && (
                    <Text size="2" as="p" className={css({ lineHeight: "1.55", mb: "3", color: "gray.12", maxWidth: "60ch" })}>
                      {pricing.rationale.recommendation.length > 140
                        ? pricing.rationale.recommendation.slice(0, 140) + "…"
                        : pricing.rationale.recommendation}
                    </Text>
                  )}
                  {(pricing.model?.tiers ?? []).slice(0, 2).map((t, i) => (
                    <Flex key={i} align="center" gap="2" mb="2">
                      <Text size="2" weight="medium">
                        {t.name}
                      </Text>
                      <Badge color="indigo" size="1" variant="soft">
                        {t.price_monthly_usd === null
                          ? "Custom"
                          : t.price_monthly_usd === 0
                            ? "Free"
                            : `$${t.price_monthly_usd}/mo`}
                      </Badge>
                    </Flex>
                  ))}
                </DossierCard>
              )}

              {gtm && (
                <DossierCard
                  tone="orange"
                  id="gtm"
                  className={`${cardEntranceCls} ${sectionAnchorCls}`}
                >
                  <SectionOpener number={numberFor("gtm")} label="Go-to-market" />
                  <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
                    <Flex align="center" gap="2">
                      <span aria-hidden="true" className={css({ color: "#FF8B3D" })}>
                        <RocketIcon />
                      </span>
                      <Text className={cardLabelCls}>GTM</Text>
                      {gtm.channels?.length > 0 && (
                        <Badge color="gray" size="1" variant="soft">
                          {gtm.channels.length} channels
                        </Badge>
                      )}
                    </Flex>
                    <Link href={`/products/${product.slug}/gtm`} className={viewFullCls}>
                      View <ArrowRightIcon aria-hidden />
                    </Link>
                  </Flex>
                  {(gtm.channels ?? []).slice(0, 2).map((c, i) => (
                    <Flex key={i} align="center" gap="2" mb="2" wrap="wrap">
                      <Text size="2" weight="medium">
                        {c.name}
                      </Text>
                      <Badge
                        color={c.effort === "low" ? "green" : c.effort === "medium" ? "yellow" : "orange"}
                        size="1"
                        variant="soft"
                      >
                        {c.effort}
                      </Badge>
                      {c.time_to_first_lead && (
                        <Text size="1" color="gray">
                          {c.time_to_first_lead}
                        </Text>
                      )}
                    </Flex>
                  ))}
                </DossierCard>
              )}

              {intel && (
                <DossierCard
                  tone="accent"
                  id="intel"
                  className={`${cardEntranceCls} ${sectionAnchorCls} ${css({ gridColumn: { md: "span 2" } })}`}
                >
                  <SectionOpener number={numberFor("intel")} label="Intel" />
                  <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
                    <Flex align="center" gap="2">
                      <span aria-hidden="true" className={css({ color: "accent.11" })}>
                        <MagicWandIcon />
                      </span>
                      <Text className={cardLabelCls}>Intel</Text>
                    </Flex>
                    <Link href={`/products/${product.slug}/intel`} className={viewFullCls}>
                      View report <ArrowRightIcon aria-hidden />
                    </Link>
                  </Flex>
                  {intel.tldr && (
                    <Text
                      as="p"
                      style={{ fontFamily: "var(--font-instrument), Georgia, 'Times New Roman', serif" }}
                      className={css({
                        fontSize: "xl",
                        fontWeight: 400,
                        fontStyle: "italic",
                        lineHeight: "1.4",
                        color: "ui.heading",
                        mb: "4",
                        maxWidth: "70ch",
                        letterSpacing: "snug",
                      })}
                    >
                      “{intel.tldr.length > 220 ? intel.tldr.slice(0, 220) + "…" : intel.tldr}”
                    </Text>
                  )}
                  {(intel.top_3_priorities ?? []).length > 0 && (
                    <ol
                      className={css({
                        listStyle: "none",
                        p: 0,
                        m: 0,
                        display: "grid",
                        gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
                        gap: "2",
                      })}
                    >
                      {(intel.top_3_priorities ?? []).slice(0, 3).map((p, i) => (
                        <li
                          key={i}
                          className={css({
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "2",
                            p: "2",
                            bg: "ui.surface",
                            borderRadius: "sm",
                          })}
                        >
                          <Text
                            size="2"
                            weight="bold"
                            className={css({
                              color: "accent.11",
                              flexShrink: 0,
                              fontVariantNumeric: "tabular-nums",
                            })}
                          >
                            {String(i + 1).padStart(2, "0")}
                          </Text>
                          <Text
                            size="2"
                            weight="medium"
                            className={css({ lineHeight: "1.5", color: "gray.12" })}
                          >
                            {p}
                          </Text>
                        </li>
                      ))}
                    </ol>
                  )}
                </DossierCard>
              )}
            </div>
          </section>
        )}

        {/* PIPELINE — numbered stepper */}
        {highlights?.pipeline && highlights.pipeline.length > 0 && (
          <section id="pipeline" aria-labelledby="pipeline-heading" className={sectionAnchorCls}>
            <SectionOpener number={numberFor("pipeline")} label="Pipeline" id="pipeline-heading" />
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "3",
              })}
            >
              {highlights.pipeline.map((p, i) => (
                <div
                  key={p.stage}
                  className={`${cardEntranceCls} ${css({
                    bg: "ui.surface",
                    border: "1px solid token(colors.ui.border)",
                    borderRadius: "lg",
                    p: "4",
                    position: "relative",
                  })}`}
                >
                  <Flex align="center" gap="2" mb="2">
                    <Text
                      size="2"
                      weight="bold"
                      className={css({
                        color: "accent.11",
                        bg: "accent.3",
                        borderRadius: "full",
                        minW: "28px",
                        h: "28px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontVariantNumeric: "tabular-nums",
                      })}
                    >
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    </Text>
                    <Text weight="bold" size="3" className={css({ color: "gray.12" })}>
                      {p.stage}
                    </Text>
                  </Flex>
                  <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.55" })}>
                    {p.description}
                  </Text>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CAPABILITIES SECTIONS */}
        {highlights?.sections && highlights.sections.length > 0 && (
          <section id="capabilities" aria-labelledby="capabilities-heading" className={sectionAnchorCls}>
            <SectionOpener
              number={numberFor("capabilities")}
              label="Capabilities"
              id="capabilities-heading"
            />
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
                gap: "4",
              })}
            >
              {highlights.sections.map((section) => {
                const isCompliance = /compliance|security/i.test(section.title);
                return (
                  <div
                    key={section.title}
                    className={css({
                      bg: isCompliance ? "accent.3" : "ui.surface",
                      border: "1px solid token(colors.ui.border)",
                      borderRadius: "lg",
                      p: "5",
                    })}
                  >
                    <Flex align="center" gap="2" mb="3">
                      <span aria-hidden="true" className={css({ color: "accent.11" })}>
                        {sectionIcon(section.title)}
                      </span>
                      <Heading size="3" className={css({ color: "gray.12" })}>
                        {section.title}
                      </Heading>
                      {isCompliance && (
                        <Badge color="gray" variant="soft" size="1">
                          Audit-friendly
                        </Badge>
                      )}
                    </Flex>
                    <Flex direction="column" gap="3" asChild>
                      <ul className={css({ listStyle: "none", p: 0, m: 0 })}>
                        {section.items.map((item) => (
                          <li
                            key={item}
                            className={css({
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "2",
                            })}
                          >
                            <span
                              aria-hidden="true"
                              className={css({
                                color: "accent.11",
                                mt: "1",
                                flexShrink: 0,
                              })}
                            >
                              <CheckIcon />
                            </span>
                            <Text size="2" className={css({ lineHeight: "1.55" })}>
                              {item}
                            </Text>
                          </li>
                        ))}
                      </ul>
                    </Flex>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* OUTREACH ANCHOR — glass card with gradient primary CTA */}
        <OutreachCTA
          slug={product.slug}
          hotCount={leadsPreview?.hotCount ?? 0}
          hasIntel={Boolean(intel)}
        />

        {/* COLOPHON — single-line editorial footer */}
        <Colophon
          filedAt={product.createdAt}
          source={product.domain ?? null}
          by={product.createdBy ?? null}
          refSlug={product.slug}
        />
      </Flex>
      </main>
    </Container>
  );
}
