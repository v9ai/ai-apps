"use client";

import { Container, Flex, Text, Badge } from "@radix-ui/themes";
import { MagicWandIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useProductBySlugQuery,
  useAnalyzeProductIcpMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { IcpAnalysisView, type IcpAnalysis } from "./icp-analysis-view";
import {
  LoadingShell,
  ErrorShell,
  ProductNotFound,
  SubpageBreadcrumb,
  SubpageHero,
  ProductExternalLink,
} from "./view-chrome";

export function ProductIcpPage({ slug }: { slug: string }) {
  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;

  const { data, loading, error, refetch } = useProductBySlugQuery({
    variables: { slug },
    fetchPolicy: "cache-and-network",
  });

  const [analyzeIcp, analyzeState] = useAnalyzeProductIcpMutation();

  if (loading && !data) return <LoadingShell />;
  if (error) return <ErrorShell message={error.message} />;

  const product = data?.productBySlug;

  if (!product) return <ProductNotFound slug={slug} />;

  const icp = (product.icpAnalysis ?? null) as IcpAnalysis | null;
  const analyzedAt = product.icpAnalyzedAt
    ? new Date(product.icpAnalyzedAt)
    : null;

  async function onAnalyze() {
    await analyzeIcp({ variables: { id: product!.id } });
    await refetch();
  }

  return (
    <Container size="4" p="6" asChild>
      <main>
      <SubpageBreadcrumb
        productSlug={product.slug}
        productName={product.name}
        currentLabel="ICP"
      />

      <Flex direction="column" gap="4">
        <SubpageHero
          productName={product.name}
          currentLabel="ICP"
          trailing={
            icp ? (
              <Badge color="indigo" size="2">
                {(icp.weighted_total * 100).toFixed(0)}% fit
              </Badge>
            ) : null
          }
        />

        <Flex gap="3" wrap="wrap" align="center">
          <ProductExternalLink
            url={product.url}
            domain={product.domain}
            productName={product.name}
          />
          {analyzedAt && (
            <Text size="2" color="gray">
              Analyzed {analyzedAt.toLocaleString()}
            </Text>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={onAnalyze}
              disabled={analyzeState.loading}
              className={button({ variant: "solid", size: "sm" })}
            >
              <MagicWandIcon aria-hidden />
              <span className={css({ ml: "1" })}>
                {analyzeState.loading
                  ? "Analyzing…"
                  : icp
                    ? "Re-analyze"
                    : "Analyze ICP"}
              </span>
            </button>
          )}
        </Flex>

        {analyzeState.error && (
          <Text color="red" as="p" role="alert">
            {analyzeState.error.message}
          </Text>
        )}

        <div
          className={css({
            mt: "5",
            pt: "6",
            borderTop: "1px solid",
            borderColor: "ui.border",
          })}
        >
          {icp ? (
            <IcpAnalysisView data={icp} />
          ) : analyzeState.loading ? (
            <Text color="gray" role="status" aria-live="polite">
              Running deep ICP analysis…
            </Text>
          ) : (
            <Text color="gray">
              No analysis yet.
              {isAdmin
                ? ' Click "Analyze ICP" to run the LangGraph pipeline.'
                : " An admin needs to run the analysis first."}
            </Text>
          )}
        </div>
      </Flex>
      </main>
    </Container>
  );
}
