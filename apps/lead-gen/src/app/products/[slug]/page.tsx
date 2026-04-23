import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductDetail } from "../components/product-detail";

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
      icp_analysis: products.icp_analysis,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return { title: "Product not found — Agentic Lead Gen" };
  }

  const icp = row.icp_analysis as { summary?: string } | null;
  const desc =
    icp?.summary ??
    row.description ??
    `AI-generated ICP, competitor, pricing, and GTM intelligence for ${row.name}.`;
  const title = `${row.name} — Product Intelligence`;
  const canonical = `${BASE}/products/${slug}`;

  return {
    title,
    description: desc.slice(0, 155),
    openGraph: {
      title: `${row.name} — ICP, competitors, pricing, GTM`,
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

export default async function ProductDetailPage({
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
      <ProductDetail slug={slug} />
    </Suspense>
  );
}
