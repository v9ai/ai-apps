import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ProductLeadsPage } from "../../components/leads-view";

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
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return { title: "Product not found — Agentic Lead Gen" };
  }

  const desc = `Scored leads for ${row.name} — companies ranked by vertical signal fit across hot / warm / cold tiers.`;
  const title = `${row.name} — Leads`;
  const canonical = `${BASE}/products/${slug}/leads`;

  return {
    title,
    description: desc.slice(0, 155),
    openGraph: {
      title,
      description: desc,
      url: canonical,
      siteName: "Agentic Lead Gen",
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
    },
    alternates: { canonical },
  };
}

export default async function ProductLeadsRoute({
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
      <ProductLeadsPage slug={slug} />
    </Suspense>
  );
}
