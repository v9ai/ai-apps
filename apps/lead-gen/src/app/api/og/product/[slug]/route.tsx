import { ImageResponse } from "@vercel/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export const runtime = "nodejs"; // @vercel/og works best with nodejs; switch to edge if we add font loading
export const revalidate = 3600; // cache 1h

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const [row] = await db
    .select({
      name: products.name,
      description: products.description,
      icp_analysis: products.icp_analysis,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row) {
    return new Response("not found", { status: 404 });
  }
  const icp = row.icp_analysis as { summary?: string } | null;
  const oneLiner = (icp?.summary ?? row.description ?? "").slice(0, 180);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 28, opacity: 0.6, marginBottom: 24 }}>
            Agentic Lead Gen
          </div>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.1 }}>
            {row.name}
          </div>
          <div style={{ fontSize: 36, opacity: 0.85, marginTop: 32, lineHeight: 1.35 }}>
            {oneLiner}
          </div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.5 }}>
          AI-generated ICP · Pricing · GTM · Intel Report
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
