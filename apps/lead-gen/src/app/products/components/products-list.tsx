"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Container,
  Flex,
  Heading,
  Text,
  Tooltip,
} from "@radix-ui/themes";
import { CubeIcon, PlusIcon } from "@radix-ui/react-icons";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductsQuery,
  useDeleteProductMutation,
  useAnalyzeProductIcpMutation,
  useAnalyzeProductPricingAsyncMutation,
  useAnalyzeProductGtmAsyncMutation,
  useRunFullProductIntelAsyncMutation,
  ProductsDocument,
  type ProductsQuery,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { LoadingShell, SignInGate } from "./view-chrome";
import { ProductsEmptyState } from "./products-empty-state";
import { ProductsSkeleton } from "./products-skeleton";
import { ProductCard, DeleteProductDialog } from "./product-card";
import { useApolloClient } from "@apollo/client";

type Product = ProductsQuery["products"][number];

const UNDO_WINDOW_MS = 5000;

export function ProductsList() {
  const router = useRouter();
  const client = useApolloClient();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductsQuery({
    fetchPolicy: "cache-and-network",
    skip: !user,
  });

  const [deleteProduct] = useDeleteProductMutation();
  const [analyzeIcp] = useAnalyzeProductIcpMutation();
  const [analyzePricing] = useAnalyzeProductPricingAsyncMutation();
  const [analyzeGtm] = useAnalyzeProductGtmAsyncMutation();
  const [runFullIntel] = useRunFullProductIntelAsyncMutation();

  const [pendingDelete, setPendingDelete] = useState<{ id: number; name: string } | null>(null);
  const undoTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const removedSnapshots = useRef<Map<number, Product>>(new Map());

  const onAnalyzeIcp = useCallback(
    async (id: number, slug: string) => {
      try {
        await analyzeIcp({ variables: { id } });
        await refetch();
        router.push(`/products/${slug}/icp`);
      } catch (err) {
        toast.error("Couldn't start ICP analysis", {
          description: (err as Error).message,
        });
      }
    },
    [analyzeIcp, refetch, router],
  );

  const onAnalyzePricing = useCallback(
    async (id: number) => {
      try {
        const res = await analyzePricing({ variables: { id } });
        const runId = res.data?.analyzeProductPricingAsync?.runId;
        toast.info("Pricing analysis started", {
          description: runId ? `Run ${runId.slice(0, 8)} · ~30s` : undefined,
        });
      } catch (err) {
        toast.error("Couldn't start pricing analysis", {
          description: (err as Error).message,
        });
      }
    },
    [analyzePricing],
  );

  const onAnalyzeGtm = useCallback(
    async (id: number) => {
      try {
        const res = await analyzeGtm({ variables: { id } });
        const runId = res.data?.analyzeProductGTMAsync?.runId;
        toast.info("GTM analysis started", {
          description: runId ? `Run ${runId.slice(0, 8)} · ~30s` : undefined,
        });
      } catch (err) {
        toast.error("Couldn't start GTM analysis", {
          description: (err as Error).message,
        });
      }
    },
    [analyzeGtm],
  );

  const onRunFullIntel = useCallback(
    async (id: number) => {
      try {
        const res = await runFullIntel({ variables: { id } });
        const runId = res.data?.runFullProductIntelAsync?.runId;
        toast.info("Full intel started", {
          description: runId ? `Run ${runId.slice(0, 8)} · ~2m` : undefined,
        });
      } catch (err) {
        toast.error("Couldn't start full intel", {
          description: (err as Error).message,
        });
      }
    },
    [runFullIntel],
  );

  const requestDelete = useCallback((id: number, name: string) => {
    setPendingDelete({ id, name });
  }, []);

  const performDelete = useCallback(() => {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setPendingDelete(null);

    // Optimistically remove from cache; remember the snapshot for undo.
    const cached = client.readQuery<ProductsQuery>({ query: ProductsDocument });
    const removed = cached?.products?.find((p) => p.id === id);
    if (removed) {
      removedSnapshots.current.set(id, removed);
      client.writeQuery<ProductsQuery>({
        query: ProductsDocument,
        data: { products: cached!.products.filter((p) => p.id !== id) },
      });
    }

    // Defer the actual mutation by 5s; clearTimeout on undo.
    const timer = setTimeout(async () => {
      undoTimers.current.delete(id);
      removedSnapshots.current.delete(id);
      try {
        await deleteProduct({ variables: { id } });
      } catch (err) {
        toast.error("Failed to delete", {
          description: (err as Error).message,
        });
        // Restore the card on failure.
        const snapshot = removedSnapshots.current.get(id);
        if (snapshot) {
          const now = client.readQuery<ProductsQuery>({ query: ProductsDocument });
          client.writeQuery<ProductsQuery>({
            query: ProductsDocument,
            data: { products: [snapshot, ...(now?.products ?? [])] },
          });
        }
      }
    }, UNDO_WINDOW_MS);
    undoTimers.current.set(id, timer);

    toast.success(`Deleted ${name}`, {
      duration: UNDO_WINDOW_MS,
      action: {
        label: "Undo",
        onClick: () => {
          const t = undoTimers.current.get(id);
          if (t) clearTimeout(t);
          undoTimers.current.delete(id);
          const snapshot = removedSnapshots.current.get(id);
          removedSnapshots.current.delete(id);
          if (snapshot) {
            const now = client.readQuery<ProductsQuery>({ query: ProductsDocument });
            const exists = now?.products?.some((p) => p.id === id);
            if (!exists) {
              client.writeQuery<ProductsQuery>({
                query: ProductsDocument,
                data: { products: [snapshot, ...(now?.products ?? [])] },
              });
            }
          }
        },
      },
    });
  }, [pendingDelete, client, deleteProduct]);

  // Keyboard: `n` opens /products/new (admin only, when not typing).
  useEffect(() => {
    if (!isAdmin) return;
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "n") {
        e.preventDefault();
        router.push("/products/new");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAdmin, router]);

  // Cleanup pending undo timers on unmount.
  useEffect(() => {
    const timers = undoTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  if (authLoading) return <LoadingShell size="3" />;
  if (!user) return <SignInGate message="Please sign in to view products." />;

  const rows = data?.products ?? [];
  const showSkeleton = loading && rows.length === 0;
  const showEmpty = !loading && rows.length === 0;

  return (
    <Container size="4" p="6" asChild>
      <main>
        {/* Page header */}
        <Flex
          align={{ initial: "start", sm: "center" }}
          justify="between"
          gap="3"
          wrap="wrap"
          mb="5"
        >
          <Flex align="center" gap="3" wrap="wrap">
            <span
              aria-hidden="true"
              className={css({
                color: "accent.11",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                bg: "accent.3",
                borderRadius: "md",
                p: "2",
                boxShadow: "inset 0 0 0 1px token(colors.accent.6)",
              })}
            >
              <CubeIcon width="20" height="20" />
            </span>
            <Heading size="6">Products</Heading>
            {rows.length > 0 && (
              <Badge color="gray" radius="full" variant="soft">
                {rows.length}
              </Badge>
            )}
            {!isAdmin && user && (
              <Tooltip content="Editing and analysis runs are restricted to operators.">
                <Badge color="amber" variant="soft">
                  View only
                </Badge>
              </Tooltip>
            )}
          </Flex>
          {isAdmin && (
            <Link
              href="/products/new"
              className={button({ variant: "gradient", size: "md" })}
              aria-keyshortcuts="n"
            >
              <PlusIcon aria-hidden /> Add product
            </Link>
          )}
        </Flex>
        <Text size="2" color="gray" as="p" mb="5">
          Operator workspace for ICP, pricing, GTM, and competitor intel.
        </Text>

        {error && (
          <Flex
            gap="3"
            align="center"
            mb="3"
            role="alert"
            className={css({
              p: "3",
              borderRadius: "md",
              bg: "red.3",
              border: "1px solid",
              borderColor: "red.6",
            })}
          >
            <Text color="red" size="2">
              {error.message}
            </Text>
            <button
              type="button"
              onClick={() => refetch()}
              className={button({ variant: "outline", size: "sm" })}
            >
              Retry
            </button>
          </Flex>
        )}

        {showSkeleton && <ProductsSkeleton count={6} />}
        {showEmpty && <ProductsEmptyState isAdmin={isAdmin} />}

        {rows.length > 0 && (
          <div
            className={css({
              display: "grid",
              gridTemplateColumns: { base: "1fr", md: "1fr 1fr" },
              gap: "3",
            })}
          >
            {rows.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                index={i}
                isAdmin={isAdmin}
                onAnalyzeIcp={onAnalyzeIcp}
                onAnalyzePricing={onAnalyzePricing}
                onAnalyzeGtm={onAnalyzeGtm}
                onRunFullIntel={onRunFullIntel}
                onDelete={requestDelete}
              />
            ))}
          </div>
        )}

        <DeleteProductDialog
          open={!!pendingDelete}
          productName={pendingDelete?.name ?? ""}
          onCancel={() => setPendingDelete(null)}
          onConfirm={performDelete}
        />
      </main>
    </Container>
  );
}
