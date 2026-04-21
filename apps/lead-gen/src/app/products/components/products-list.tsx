"use client";

import Link from "next/link";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import {
  TrashIcon,
  CubeIcon,
  ExternalLinkIcon,
  ArrowRightIcon,
} from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductsQuery,
  useDeleteProductMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

export function ProductsList() {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductsQuery({
    fetchPolicy: "cache-and-network",
    skip: !isAdmin,
  });

  const [deleteProduct] = useDeleteProductMutation();

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Text color="red">Admin access required.</Text>
      </Container>
    );
  }

  const rows = data?.products ?? [];

  return (
    <Container size="4" p="6">
      <Flex align="center" gap="3" mb="5">
        <span
          className={css({
            color: "accent.11",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            bg: "accent.3",
            borderRadius: "md",
            p: "2",
          })}
        >
          <CubeIcon width="20" height="20" />
        </span>
        <Heading size="6">Products</Heading>
      </Flex>

      {error && (
        <Text color="red" as="p" mb="3">
          {error.message}
        </Text>
      )}

      {loading && rows.length === 0 && <Text color="gray">Loading…</Text>}

      {!loading && rows.length === 0 && (
        <Text color="gray">No products yet.</Text>
      )}

      <div
        className={css({
          display: "grid",
          gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
          gap: "3",
        })}
      >
        {rows.map((p) => (
          <div
            key={p.id}
            className={css({
              bg: "ui.surface",
              border: "1px solid",
              borderColor: "ui.border",
              borderRadius: "md",
              p: "4",
              transition: "border-color 150ms, transform 150ms",
              _hover: { borderColor: "accent.8", transform: "translateY(-1px)" },
            })}
          >
            <Flex justify="between" align="start" gap="3">
              <Flex direction="column" gap="2" className={css({ flex: 1, minWidth: 0 })}>
                <Link
                  href={`/products/${p.slug}`}
                  className={css({
                    color: "inherit",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "2",
                  })}
                >
                  <span className={css({ color: "accent.11" })}>
                    <CubeIcon />
                  </span>
                  <Text
                    weight="bold"
                    size="4"
                    className={css({ _hover: { textDecoration: "underline" } })}
                  >
                    {p.name}
                  </Text>
                  <span className={css({ color: "gray.10", ml: "1" })}>
                    <ArrowRightIcon />
                  </span>
                </Link>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({
                    color: "gray.11",
                    fontSize: "sm",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "1",
                    _hover: { textDecoration: "underline", color: "accent.11" },
                  })}
                >
                  <ExternalLinkIcon />
                  <span
                    className={css({
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    })}
                  >
                    {p.domain ?? p.url}
                  </span>
                </a>
                {p.description && (
                  <Text
                    color="gray"
                    size="2"
                    className={css({ lineHeight: "1.5" })}
                  >
                    {p.description}
                  </Text>
                )}
              </Flex>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`Delete product "${p.name}"?`)) return;
                  await deleteProduct({ variables: { id: p.id } });
                  await refetch();
                }}
                className={button({ variant: "ghost", size: "sm" })}
                aria-label="Delete product"
              >
                <TrashIcon />
              </button>
            </Flex>
          </div>
        ))}
      </div>
    </Container>
  );
}
