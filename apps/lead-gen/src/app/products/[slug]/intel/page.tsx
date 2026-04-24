import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductIntelPage } from "../../components/intel-report-view";
import { LoadingShell } from "../../components/view-chrome";

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
      intel_report: products.intel_report,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return { title: "Product not found — Agentic Lead Gen" };
  }

  const report = row.intel_report as { tldr?: string } | null;
  const desc =
    report?.tldr ??
    row.description ??
    `AI-generated executive intelligence report for ${row.name}.`;
  const title = `${row.name} — Intel report`;
  const canonical = `${BASE}/products/${slug}/intel`;

  return {
    title,
    description: desc.slice(0, 155),
    openGraph: {
      title: `${row.name} — executive intel`,
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

export default async function ProductIntelRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<LoadingShell />}>
      <ProductIntelPage slug={slug} />
    </Suspense>
  );
}
