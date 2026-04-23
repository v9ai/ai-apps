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
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { useProductBySlugQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import type {
  PricingStrategyResult,
  GTMStrategyResult,
  ProductIntelReportResult,
} from "@/lib/langgraph-client";

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
  const { user, loading: authLoading } = useAuth();

  const { data, loading, error } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  if (authLoading) {
    return (
      <Container size="4" p="6">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Please sign in to view this product.</Text>
      </Container>
    );
  }

  if (loading && !data) {
    return (
      <Container size="4" p="6">
        <Text color="gray">Loading…</Text>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="4" p="6">
        <Text color="red">{error.message}</Text>
      </Container>
    );
  }

  const product = data?.productBySlug;

  if (!product) {
    return (
      <Container size="4" p="6">
        <Flex direction="column" gap="3">
          <Link href="/products" className={button({ variant: "ghost", size: "sm" })}>
            <ArrowLeftIcon /> Products
          </Link>
          <Text color="gray">Product &ldquo;{slug}&rdquo; not found.</Text>
        </Flex>
      </Container>
    );
  }

  const highlights = (product.highlights ?? null) as Highlights | null;
  const positioning = (product.positioningAnalysis ?? null) as PositioningSneak | null;
  const icp = (product.icpAnalysis ?? null) as IcpSneak | null;
  const pricing = (product.pricingAnalysis ?? null) as PricingStrategyResult | null;
  const gtm = (product.gtmAnalysis ?? null) as GTMStrategyResult | null;
  const intel = (product.intelReport ?? null) as ProductIntelReportResult | null;

  const navBtnBase = button({ variant: "soft", size: "sm" });
  const navBtnDisabledCls = css({ opacity: 0.38, cursor: "not-allowed", pointerEvents: "none" });
  const cardCls = css({
    bg: "ui.surface",
    border: "1px solid",
    borderColor: "ui.border",
    borderRadius: "md",
    p: "4",
  });

  return (
    <Container size="4" p="6">
      <Flex mb="4">
        <Link href="/products" className={button({ variant: "ghost", size: "sm" })}>
          <ArrowLeftIcon /> Products
        </Link>
      </Flex>

      <Flex direction="column" gap="3">
        <Flex align="center" gap="3">
          <span
            className={css({
              color: "accent.11",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              bg: "accent.3",
              borderRadius: "md",
              p: "3",
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
          className={css({
            color: "accent.11",
            fontSize: "sm",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "1",
            _hover: { textDecoration: "underline" },
          })}
        >
          <GlobeIcon />
          {product.url}
          <ExternalLinkIcon />
        </a>

        {product.description && !highlights?.tagline && (
          <Text as="p" size="3" mt="3" className={css({ lineHeight: "1.6" })}>
            {product.description}
          </Text>
        )}

        <Flex gap="2" mt="3" wrap="wrap">
          {product.positioningAnalysis ? (
            <Link
              href={`/products/${product.slug}/positioning`}
              className={button({ variant: "soft", size: "sm" })}
            >
              <StarIcon />
              <span className={css({ ml: "1" })}>Positioning</span>
            </Link>
          ) : null}
          {product.icpAnalysis ? (
            <Link
              href={`/products/${product.slug}/icp`}
              className={button({ variant: "soft", size: "sm" })}
            >
              <ComponentInstanceIcon />
              <span className={css({ ml: "1" })}>ICP</span>
            </Link>
          ) : null}
          {product.pricingAnalysis ? (
            <Link
              href={`/products/${product.slug}/pricing`}
              className={button({ variant: "soft", size: "sm" })}
            >
              <BarChartIcon />
              <span className={css({ ml: "1" })}>Pricing</span>
            </Link>
          ) : null}
          {product.gtmAnalysis ? (
            <Link
              href={`/products/${product.slug}/gtm`}
              className={button({ variant: "soft", size: "sm" })}
            >
              <RocketIcon />
              <span className={css({ ml: "1" })}>GTM</span>
            </Link>
          ) : null}
          {product.intelReport ? (
            <Link
              href={`/products/${product.slug}/intel`}
              className={button({ variant: "soft", size: "sm" })}
            >
              <MagicWandIcon />
              <span className={css({ ml: "1" })}>Intel report</span>
            </Link>
          ) : null}
        </Flex>

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
                  <span className={css({ color: "accent.11" })}>
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
              <span className={css({ color: "accent.11" })}>
                <GearIcon width="20" height="20" />
              </span>
              <Heading size="5">Pipeline</Heading>
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
                  <span className={css({ color: "accent.11" })}>
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
                <span className={css({ color: "gray.10" })}>
                  <GlobeIcon />
                </span>
                <Text size="2" color="gray">
                  {product.domain}
                </Text>
              </Flex>
            )}
            {product.createdBy && (
              <Flex align="center" gap="2">
                <span className={css({ color: "gray.10" })}>
                  <CodeIcon />
                </span>
                <Text size="2" color="gray">
                  Created by {product.createdBy}
                </Text>
              </Flex>
            )}
            <Flex align="center" gap="2">
              <span className={css({ color: "gray.10" })}>
                <ReaderIcon />
              </span>
              <Text size="2" color="gray">
                {new Date(product.createdAt).toLocaleString()}
              </Text>
            </Flex>
          </Flex>
        </div>
      </Flex>
    </Container>
  );
}
