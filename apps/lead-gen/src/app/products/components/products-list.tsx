"use client";

import Link from "next/link";
import { Container, Flex, Heading, Text } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
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
      <Heading size="6" mb="5">
        Products
      </Heading>

      {error && (
        <Text color="red" as="p" mb="3">
          {error.message}
        </Text>
      )}

      {loading && rows.length === 0 && <Text color="gray">Loading…</Text>}

      {!loading && rows.length === 0 && (
        <Text color="gray">No products yet — add one above.</Text>
      )}

      <Flex direction="column" gap="3">
        {rows.map((p) => (
          <div
            key={p.id}
            className={css({
              bg: "ui.surface",
              border: "1px solid",
              borderColor: "ui.border",
              borderRadius: "md",
              p: "4",
            })}
          >
            <Flex justify="between" align="start" gap="3">
              <Flex direction="column" gap="1" className={css({ flex: 1, minWidth: 0 })}>
                <Link
                  href={`/products/${p.slug}`}
                  className={css({ color: "inherit", textDecoration: "none" })}
                >
                  <Text weight="bold" size="4" className={css({ _hover: { textDecoration: "underline" } })}>
                    {p.name}
                  </Text>
                </Link>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={css({
                    color: "gray.11",
                    fontSize: "sm",
                    textDecoration: "none",
                    _hover: { textDecoration: "underline" },
                  })}
                >
                  {p.url}
                </a>
                {p.description && (
                  <Text color="gray" size="2" mt="1">
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
      </Flex>
    </Container>
  );
}
