import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductPositioningPage } from "../../components/positioning-analysis-view";

type Params = { slug: string };

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
      positioning_analysis: products.positioning_analysis,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return { title: "Product not found — Agentic Lead Gen" };
  }

  const positioning = row.positioning_analysis as
    | { positioning_statement?: string; category?: string }
    | null;
  const desc =
    positioning?.positioning_statement ??
    row.description ??
    `AI-generated positioning for ${row.name}.`;
  const title = `${row.name} — positioning`;
  const canonical = `${BASE}/products/${slug}/positioning`;

  return {
    title,
    description: desc.slice(0, 155),
    openGraph: {
      title: `${row.name} — positioning`,
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

export default async function ProductPositioningRoute({
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
      <ProductPositioningPage slug={slug} />
    </Suspense>
  );
}
