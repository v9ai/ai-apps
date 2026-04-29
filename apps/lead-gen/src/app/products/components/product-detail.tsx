"use client";

import Link from "next/link";
import { Badge, Container, Flex, Heading, Text } from "@radix-ui/themes";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  CheckIcon,
  CubeIcon,
  LightningBoltIcon,
  GearIcon,
  Link2Icon,
  LockClosedIcon,
  RocketIcon,
  LayersIcon,
  MagicWandIcon,
  ComponentInstanceIcon,
  BarChartIcon,
  GlobeIcon,
  CodeIcon,
  ReaderIcon,
  StarIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useProductLeadsPreviewQuery,
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
} from "./view-chrome";

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

export function ProductDetail({ slug }: { slug: string }) {
  const { data, loading, error } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const { data: leadsPreviewData } = useProductLeadsPreviewQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  if (loading && !data) return <LoadingShell />;
  if (error) return <ErrorShell message={error.message} />;

  const product = data?.productBySlug;

  if (!product) return <ProductNotFound slug={slug} />;

  const highlights = (product.highlights ?? null) as Highlights | null;
  const positioning = (product.positioningAnalysis ?? null) as PositioningSneak | null;
  const icp = (product.icpAnalysis ?? null) as IcpSneak | null;
  const pricing = (product.pricingAnalysis ?? null) as PricingStrategyResult | null;
  const gtm = (product.gtmAnalysis ?? null) as GTMStrategyResult | null;
  const intel = (product.intelReport ?? null) as ProductIntelReportResult | null;
  const leadsPreview = leadsPreviewData?.productLeads ?? null;
  const hasLeads = (leadsPreview?.totalCount ?? 0) > 0;

  const navBtnBase = button({ variant: "outline", size: "sm" });
  const navBtnDisabledCls = css({ opacity: 0.38, cursor: "not-allowed", pointerEvents: "none" });
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
      <nav aria-label="Breadcrumb" className={css({ mb: "4" })}>
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

      <Flex direction="column" gap="4">
        <Flex align="center" gap="3">
          <span
            aria-hidden="true"
            className={css({
              color: "accent.11",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              bg: "accent.3",
              borderRadius: "md",
              p: "3",
              boxShadow: "inset 0 0 0 1px token(colors.accent.6)",
            })}
          >
            <CubeIcon width="24" height="24" />
          </span>
          <Heading size="8">{product.name}</Heading>
        </Flex>

        {highlights?.tagline && (
          <Text as="p" size="5" className={css({ lineHeight: "1.5", color: "gray.12" })}>
            {highlights.tagline}
          </Text>
        )}

        {highlights?.subtitle && (
          <Text as="p" size="3" color="gray" className={css({ lineHeight: "1.6" })}>
            {highlights.subtitle}
          </Text>
        )}

        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${product.name} website in new tab`}
          className={css({
            color: "accent.11",
            fontSize: "sm",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "1",
            borderRadius: "sm",
            _hover: { textDecoration: "underline" },
            _focusVisible: {
              outline: "2px solid",
              outlineColor: "accent.9",
              outlineOffset: "2px",
            },
          })}
        >
          <GlobeIcon aria-hidden />
          {product.url}
          <ExternalLinkIcon aria-hidden />
        </a>

        {product.description && !highlights?.tagline && (
          <Text as="p" size="3" mt="3" className={css({ lineHeight: "1.6" })}>
            {product.description}
          </Text>
        )}

        <Flex gap="2" mt="3" wrap="wrap">
          {positioning ? (
            <Link href={`/products/${product.slug}/positioning`} className={navBtnBase}>
              <StarIcon />
              <span className={css({ ml: "1" })}>Positioning</span>
            </Link>
          ) : (
            <span className={`${navBtnBase} ${navBtnDisabledCls}`}>
              <StarIcon />
              <span className={css({ ml: "1" })}>Positioning</span>
            </span>
          )}
          {icp ? (
            <Link href={`/products/${product.slug}/icp`} className={navBtnBase}>
              <ComponentInstanceIcon />
              <span className={css({ ml: "1" })}>ICP</span>
            </Link>
          ) : (
            <span className={`${navBtnBase} ${navBtnDisabledCls}`}>
              <ComponentInstanceIcon />
              <span className={css({ ml: "1" })}>ICP</span>
            </span>
          )}
          {pricing ? (
            <Link href={`/products/${product.slug}/pricing`} className={navBtnBase}>
              <BarChartIcon />
              <span className={css({ ml: "1" })}>Pricing</span>
            </Link>
          ) : (
            <span className={`${navBtnBase} ${navBtnDisabledCls}`}>
              <BarChartIcon />
              <span className={css({ ml: "1" })}>Pricing</span>
            </span>
          )}
          {gtm ? (
            <Link href={`/products/${product.slug}/gtm`} className={navBtnBase}>
              <RocketIcon />
              <span className={css({ ml: "1" })}>GTM</span>
            </Link>
          ) : (
            <span className={`${navBtnBase} ${navBtnDisabledCls}`}>
              <RocketIcon />
              <span className={css({ ml: "1" })}>GTM</span>
            </span>
          )}
          {intel ? (
            <Link href={`/products/${product.slug}/intel`} className={navBtnBase}>
              <MagicWandIcon />
              <span className={css({ ml: "1" })}>Intel report</span>
            </Link>
          ) : (
            <span className={`${navBtnBase} ${navBtnDisabledCls}`}>
              <MagicWandIcon />
              <span className={css({ ml: "1" })}>Intel report</span>
            </span>
          )}
          {hasLeads ? (
            <Link href={`/products/${product.slug}/leads`} className={navBtnBase}>
              <PersonIcon />
              <span className={css({ ml: "1" })}>
                Leads{leadsPreview?.totalCount ? ` (${leadsPreview.totalCount})` : ""}
              </span>
            </Link>
          ) : (
            <Link href={`/products/${product.slug}/leads`} className={navBtnBase}>
              <PersonIcon />
              <span className={css({ ml: "1" })}>Leads</span>
            </Link>
          )}
        </Flex>

        {/* Sneak-peek cards */}
        {(positioning || icp || pricing || gtm || intel || hasLeads) && (
          <div
            className={css({
              mt: "4",
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
              gap: "4",
            })}
          >
            {positioning && (
              <div className={cardCls}>
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <span aria-hidden="true" className={css({ color: "accent.11" })}><StarIcon /></span>
                    <Text size="2" weight="bold">Positioning</Text>
                    {positioning.category && (
                      <Badge color="indigo" size="1">{positioning.category}</Badge>
                    )}
                  </Flex>
                  <Link
                    href={`/products/${product.slug}/positioning`}
                    className={css({ color: "accent.11", fontSize: "xs", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                  >
                    View full →
                  </Link>
                </Flex>
                {positioning.positioning_statement && (
                  <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.5", mb: "2" })}>
                    {positioning.positioning_statement.length > 160
                      ? positioning.positioning_statement.slice(0, 160) + "…"
                      : positioning.positioning_statement}
                  </Text>
                )}
                {(positioning.differentiators ?? []).slice(0, 3).map((d, i) => (
                  <Flex key={i} align="start" gap="2" mb="1">
                    <span aria-hidden="true" className={css({ color: "accent.11", flexShrink: 0, mt: "1px" })}>
                      <CheckIcon />
                    </span>
                    <Text size="1" color="gray">{d}</Text>
                  </Flex>
                ))}
              </div>
            )}

            {icp && (
              <div className={cardCls}>
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <span aria-hidden="true" className={css({ color: "accent.11" })}><ComponentInstanceIcon /></span>
                    <Text size="2" weight="bold">ICP</Text>
                    {icp.weighted_total != null && (
                      <Badge color="green" size="1">{Math.round(icp.weighted_total)}% fit</Badge>
                    )}
                  </Flex>
                  <Link
                    href={`/products/${product.slug}/icp`}
                    className={css({ color: "accent.11", fontSize: "xs", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                  >
                    View full →
                  </Link>
                </Flex>
                {(icp.segments ?? []).slice(0, 2).map((s, i) => (
                  <Flex key={i} align="center" gap="1" mb="1" wrap="wrap">
                    <Text size="1" weight="medium">{s.name}</Text>
                    {s.industry && <Badge color="gray" size="1">{s.industry}</Badge>}
                    {s.stage && <Badge color="blue" size="1">{s.stage}</Badge>}
                  </Flex>
                ))}
                {(icp.personas ?? []).slice(0, 2).map((p, i) => (
                  <Flex key={i} align="center" gap="1" mb="1">
                    <Text size="1" color="gray">{p.title}</Text>
                    {p.seniority && <Badge color="gray" size="1">{p.seniority}</Badge>}
                  </Flex>
                ))}
              </div>
            )}

            {pricing && (
              <div className={cardCls}>
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <span aria-hidden="true" className={css({ color: "accent.11" })}><BarChartIcon /></span>
                    <Text size="2" weight="bold">Pricing</Text>
                    {pricing.model?.model_type && (
                      <Badge color="gray" size="1">{pricing.model.model_type}</Badge>
                    )}
                  </Flex>
                  <Link
                    href={`/products/${product.slug}/pricing`}
                    className={css({ color: "accent.11", fontSize: "xs", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                  >
                    View full →
                  </Link>
                </Flex>
                {pricing.rationale?.recommendation && (
                  <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.5", mb: "2" })}>
                    {pricing.rationale.recommendation.length > 140
                      ? pricing.rationale.recommendation.slice(0, 140) + "…"
                      : pricing.rationale.recommendation}
                  </Text>
                )}
                {(pricing.model?.tiers ?? []).slice(0, 2).map((t, i) => (
                  <Flex key={i} align="center" gap="2" mb="1">
                    <Text size="1" weight="medium">{t.name}</Text>
                    <Badge color="indigo" size="1">
                      {t.price_monthly_usd === null ? "Custom" : t.price_monthly_usd === 0 ? "Free" : `$${t.price_monthly_usd}/mo`}
                    </Badge>
                  </Flex>
                ))}
              </div>
            )}

            {gtm && (
              <div className={cardCls}>
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <span aria-hidden="true" className={css({ color: "accent.11" })}><RocketIcon /></span>
                    <Text size="2" weight="bold">GTM</Text>
                    {gtm.channels?.length > 0 && (
                      <Badge color="gray" size="1">{gtm.channels.length} channels</Badge>
                    )}
                  </Flex>
                  <Link
                    href={`/products/${product.slug}/gtm`}
                    className={css({ color: "accent.11", fontSize: "xs", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                  >
                    View full →
                  </Link>
                </Flex>
                {(gtm.channels ?? []).slice(0, 2).map((c, i) => (
                  <Flex key={i} align="center" gap="2" mb="1" wrap="wrap">
                    <Text size="1" weight="medium">{c.name}</Text>
                    <Badge
                      color={c.effort === "low" ? "green" : c.effort === "medium" ? "yellow" : "orange"}
                      size="1"
                    >
                      {c.effort}
                    </Badge>
                    {c.time_to_first_lead && (
                      <Text size="1" color="gray">{c.time_to_first_lead}</Text>
                    )}
                  </Flex>
                ))}
              </div>
            )}

            {intel && (
              <div className={cardCls}>
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <span aria-hidden="true" className={css({ color: "accent.11" })}><MagicWandIcon /></span>
                    <Text size="2" weight="bold">Intel</Text>
                  </Flex>
                  <Link
                    href={`/products/${product.slug}/intel`}
                    className={css({ color: "accent.11", fontSize: "xs", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                  >
                    View full →
                  </Link>
                </Flex>
                {intel.tldr && (
                  <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.5", mb: "2" })}>
                    {intel.tldr.length > 180 ? intel.tldr.slice(0, 180) + "…" : intel.tldr}
                  </Text>
                )}
                {(intel.top_3_priorities ?? []).slice(0, 3).map((p, i) => (
                  <Flex key={i} align="start" gap="2" mb="1">
                    <Text size="1" weight="bold" className={css({ color: "accent.11", flexShrink: 0 })}>
                      {i + 1}.
                    </Text>
                    <Text size="1" color="gray">{p}</Text>
                  </Flex>
                ))}
              </div>
            )}

            {hasLeads && leadsPreview && (
              <div className={cardCls}>
                <Flex justify="between" align="center" mb="2">
                  <Flex align="center" gap="2">
                    <span aria-hidden="true" className={css({ color: "accent.11" })}><PersonIcon /></span>
                    <Text size="2" weight="bold">Leads</Text>
                    {leadsPreview.totalCount > 0 && (
                      <Badge color="gray" size="1">{leadsPreview.totalCount} total</Badge>
                    )}
                    {leadsPreview.hotCount > 0 && (
                      <Badge color="red" size="1">{leadsPreview.hotCount} hot</Badge>
                    )}
                    {leadsPreview.warmCount > 0 && (
                      <Badge color="amber" size="1">{leadsPreview.warmCount} warm</Badge>
                    )}
                  </Flex>
                  <Link
                    href={`/products/${product.slug}/leads`}
                    className={css({ color: "accent.11", fontSize: "xs", textDecoration: "none", _hover: { textDecoration: "underline" } })}
                  >
                    View full →
                  </Link>
                </Flex>
                {leadsPreview.leads.slice(0, 4).map((lead) => (
                  <Flex key={lead.companyId} align="center" gap="2" mb="1" wrap="wrap">
                    <Link
                      href={`/companies/${lead.companyKey}`}
                      className={css({
                        fontSize: "xs",
                        fontWeight: 500,
                        color: "gray.12",
                        textDecoration: "none",
                        _hover: { color: "accent.11", textDecoration: "underline" },
                      })}
                    >
                      {lead.companyName}
                    </Link>
                    {lead.tier && (
                      <Badge
                        color={lead.tier === "hot" ? "red" : lead.tier === "warm" ? "amber" : "blue"}
                        size="1"
                      >
                        {lead.tier}
                      </Badge>
                    )}
                    <Text size="1" color="gray">{lead.score.toFixed(2)}</Text>
                  </Flex>
                ))}
              </div>
            )}
          </div>
        )}

        {highlights?.stats && highlights.stats.length > 0 && (
          <div
            className={css({
              mt: "4",
              display: "grid",
              gridTemplateColumns: { base: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: "3",
            })}
          >
            {highlights.stats.map((s) => (
              <div
                key={s.label}
                className={css({
                  bg: "ui.surface",
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  p: "4",
                })}
              >
                <Flex align="center" gap="2" mb="1">
                  <span aria-hidden="true" className={css({ color: "accent.11" })}>
                    <BarChartIcon />
                  </span>
                  <Text size="5" weight="bold" className={css({ color: "accent.11" })}>
                    {s.value}
                  </Text>
                </Flex>
                <Text size="2" color="gray" as="div">
                  {s.label}
                </Text>
              </div>
            ))}
          </div>
        )}

        {highlights?.pipeline && highlights.pipeline.length > 0 && (
          <div className={css({ mt: "5" })}>
            <Flex align="center" gap="2" mb="3">
              <span aria-hidden="true" className={css({ color: "accent.11" })}>
                <GearIcon width="20" height="20" />
              </span>
              <Heading size="4">Pipeline</Heading>
            </Flex>
            <div
              className={css({
                display: "grid",
                gridTemplateColumns: { base: "1fr", md: "repeat(3, 1fr)" },
                gap: "3",
              })}
            >
              {highlights.pipeline.map((p, i) => (
                <div
                  key={p.stage}
                  className={css({
                    bg: "ui.surface",
                    border: "1px solid",
                    borderColor: "ui.border",
                    borderRadius: "md",
                    p: "4",
                  })}
                >
                  <Flex align="center" gap="2" mb="1">
                    <Text
                      size="1"
                      weight="bold"
                      className={css({
                        color: "accent.11",
                        bg: "accent.3",
                        px: "2",
                        py: "1",
                        borderRadius: "sm",
                      })}
                    >
                      {i + 1}
                    </Text>
                    <Text weight="bold" size="3">
                      {p.stage}
                    </Text>
                  </Flex>
                  <Text size="2" color="gray" as="p" className={css({ lineHeight: "1.5" })}>
                    {p.description}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {highlights?.sections && highlights.sections.length > 0 && (
          <div
            className={css({
              mt: "5",
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
              gap: "4",
            })}
          >
            {highlights.sections.map((section) => (
              <div
                key={section.title}
                className={css({
                  bg: "ui.surface",
                  border: "1px solid",
                  borderColor: "ui.border",
                  borderRadius: "md",
                  p: "4",
                })}
              >
                <Flex align="center" gap="2" mb="3">
                  <span aria-hidden="true" className={css({ color: "accent.11" })}>
                    {sectionIcon(section.title)}
                  </span>
                  <Heading size="4">{section.title}</Heading>
                </Flex>
                <Flex direction="column" gap="2" asChild>
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
                        <Text size="2" className={css({ lineHeight: "1.5" })}>
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </Flex>
              </div>
            ))}
          </div>
        )}

        <div
          className={css({
            mt: "5",
            pt: "4",
            borderTop: "1px solid",
            borderColor: "ui.border",
          })}
        >
          <Flex direction="column" gap="2">
            {product.domain && (
              <Flex align="center" gap="2">
                <span aria-hidden="true" className={css({ color: "gray.10" })}>
                  <GlobeIcon />
                </span>
                <Text size="2" color="gray">
                  {product.domain}
                </Text>
              </Flex>
            )}
            {product.createdBy && (
              <Flex align="center" gap="2">
                <span aria-hidden="true" className={css({ color: "gray.10" })}>
                  <CodeIcon />
                </span>
                <Text size="2" color="gray">
                  Created by {product.createdBy}
                </Text>
              </Flex>
            )}
            <Flex align="center" gap="2">
              <span aria-hidden="true" className={css({ color: "gray.10" })}>
                <ReaderIcon />
              </span>
              <Text size="2" color="gray">
                {new Date(product.createdAt).toLocaleString()}
              </Text>
            </Flex>
          </Flex>
        </div>
      </Flex>
      </main>
    </Container>
  );
}
