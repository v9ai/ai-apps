"use client";

import Link from "next/link";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { ArrowLeftIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import { useProductBySlugQuery } from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

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

  return (
    <Container size="4" p="6">
      <Flex mb="4">
        <Link href="/products" className={button({ variant: "ghost", size: "sm" })}>
          <ArrowLeftIcon /> Products
        </Link>
      </Flex>

      <Flex direction="column" gap="3">
        <Heading size="7">{product.name}</Heading>

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

        {product.description && (
          <Text as="p" size="3" mt="3" className={css({ lineHeight: "1.6" })}>
            {product.description}
          </Text>
        )}

        <div
          className={css({
            mt: "4",
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
