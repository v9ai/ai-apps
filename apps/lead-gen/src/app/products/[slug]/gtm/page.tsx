import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductGtmPage } from "../../components/gtm-analysis-view";

type Params = { slug: string };

// Public catalog pages — revalidate every 5 minutes via ISR. Intel runs are
// admin-initiated (seconds-to-minutes cadence); 5min freshness is more than
// adequate and the page becomes cacheable at the edge.
export const revalidate = 300;

const BASE = "https://agenticleadgen.xyz";

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [row] = await db
    .select({
      name: products.name,
      description: products.description,
      domain: products.domain,
      gtm_analysis: products.gtm_analysis,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return { title: "Product not found — Agentic Lead Gen" };
  }

  const gtm = row.gtm_analysis as
    | { first_90_days?: string[]; messaging_pillars?: { theme?: string }[] }
    | null;
  const fallbackFromGtm =
    gtm?.messaging_pillars?.[0]?.theme ??
    gtm?.first_90_days?.[0] ??
    undefined;
  const desc =
    fallbackFromGtm ??
    row.description ??
    `AI-generated go-to-market strategy for ${row.name}.`;
  const title = `${row.name} — GTM strategy`;
  const canonical = `${BASE}/products/${slug}/gtm`;

  return {
    title,
    description: desc.slice(0, 155),
    openGraph: {
      title: `${row.name} — go-to-market strategy`,
      description: desc.slice(0, 200),
      url: canonical,
      siteName: "Agentic Lead Gen",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc.slice(0, 200),
    },
    alternates: { canonical },
  };
}

export default async function ProductGtmRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading…</Text>
        </Container>
      }
    >
      <ProductGtmPage slug={slug} />
    </Suspense>
  );
}
