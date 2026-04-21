"use client";

import { useState } from "react";
import { Container, Flex, Heading, Text, TextField, TextArea } from "@radix-ui/themes";
import { TrashIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductsQuery,
  useUpsertProductMutation,
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

  const [upsertProduct, { loading: upserting }] = useUpsertProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Text color="red">Admin access required.</Text>
      </Container>
    );
  }

  const rows = data?.products ?? [];

  async function handleAdd() {
    setFormError(null);
    if (!name.trim() || !url.trim()) {
      setFormError("Name and URL are required");
      return;
    }
    try {
      await upsertProduct({
        variables: {
          input: {
            name: name.trim(),
            url: url.trim(),
            description: description.trim() || null,
          },
        },
        refetchQueries: ["Products"],
      });
      setName("");
      setUrl("");
      setDescription("");
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Container size="4" p="6">
      <Heading size="6" mb="5">
        Products
      </Heading>

      <div
        className={css({
          bg: "ui.surface",
          border: "1px solid",
          borderColor: "ui.border",
          borderRadius: "md",
          p: "4",
          mb: "5",
        })}
      >
        <Text weight="bold" size="3" as="div" mb="3">
          Add product
        </Text>
        <Flex direction="column" gap="2">
          <TextField.Root
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name (e.g. Ingestible)"
          />
          <TextField.Root
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
          />
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description (optional)"
            rows={2}
          />
          {formError && <Text color="red">{formError}</Text>}
          <Flex>
            <button
              type="button"
              onClick={handleAdd}
              disabled={upserting}
              className={button({ variant: "solid" })}
            >
              {upserting ? "Saving…" : "Add product"}
            </button>
          </Flex>
        </Flex>
      </div>

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
                <Text weight="bold" size="4">
                  {p.name}
                </Text>
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
