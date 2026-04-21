"use client";

import Link from "next/link";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { ArrowLeftIcon, ExternalLinkIcon, CheckIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { useProductBySlugQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

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

export function ProductDetail({ slug }: { slug: string }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
    skip: !isAdmin,
  });

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Text color="red">Admin access required.</Text>
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

  return (
    <Container size="4" p="6">
      <Flex mb="4">
        <Link href="/products" className={button({ variant: "ghost", size: "sm" })}>
          <ArrowLeftIcon /> Products
        </Link>
      </Flex>

      <Flex direction="column" gap="3">
        <Heading size="8">{product.name}</Heading>

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
          {product.url} <ExternalLinkIcon />
        </a>

        {product.description && !highlights?.tagline && (
          <Text as="p" size="3" mt="3" className={css({ lineHeight: "1.6" })}>
            {product.description}
          </Text>
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
                <Text size="5" weight="bold" as="div" className={css({ color: "accent.11" })}>
                  {s.value}
                </Text>
                <Text size="2" color="gray" as="div" mt="1">
                  {s.label}
                </Text>
              </div>
            ))}
          </div>
        )}

        {highlights?.pipeline && highlights.pipeline.length > 0 && (
          <div className={css({ mt: "5" })}>
            <Heading size="5" mb="3">
              Pipeline
            </Heading>
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
                <Heading size="4" mb="3">
                  {section.title}
                </Heading>
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
          <Flex direction="column" gap="1">
            {product.domain && (
              <Text size="2" color="gray">
                Domain: {product.domain}
              </Text>
            )}
            {product.createdBy && (
              <Text size="2" color="gray">
                Created by: {product.createdBy}
              </Text>
            )}
            <Text size="2" color="gray">
              Created: {new Date(product.createdAt).toLocaleString()}
            </Text>
          </Flex>
        </div>
      </Flex>
    </Container>
  );
}
