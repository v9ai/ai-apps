import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductPricingPage } from "../../components/pricing-analysis-view";

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
      pricing_analysis: products.pricing_analysis,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return { title: "Product not found — Agentic Lead Gen" };
  }

  const pricing = row.pricing_analysis as
    | { rationale?: { recommendation?: string } }
    | null;
  const desc =
    pricing?.rationale?.recommendation ??
    row.description ??
    `AI-generated pricing strategy for ${row.name}.`;
  const title = `${row.name} — Pricing strategy`;
  const canonical = `${BASE}/products/${slug}/pricing`;

  return {
    title,
    description: desc.slice(0, 155),
    openGraph: {
      title: `${row.name} — pricing strategy`,
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

export default async function ProductPricingRoute({
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
      <ProductPricingPage slug={slug} />
    </Suspense>
  );
}
