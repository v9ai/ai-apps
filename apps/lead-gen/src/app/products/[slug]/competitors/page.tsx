import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductCompetitorsPage } from "../../components/competitor-analysis-view";
import { LoadingShell } from "../../components/view-chrome";

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
    .select({ name: products.name, description: products.description })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return { title: "Product not found — Agentic Lead Gen" };
  }

  const desc =
    row.description ??
    `Competitor, pricing, and positioning analysis for ${row.name}, produced by a 3-agent Claude team.`;
  const title = `${row.name} — competitors & pricing`;
  const canonical = `${BASE}/products/${slug}/competitors`;

  return {
    title,
    description: desc.slice(0, 155),
    openGraph: {
      title,
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

export default async function ProductCompetitorsRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<LoadingShell />}>
      <ProductCompetitorsPage slug={slug} />
    </Suspense>
  );
}
