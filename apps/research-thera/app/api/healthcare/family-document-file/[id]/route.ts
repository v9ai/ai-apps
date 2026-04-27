import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { sql } from "@/src/db/neon";
import { getR2FileStream } from "@ai-apps/r2";

export const runtime = "nodejs";

const HEALTHCARE_BUCKET = process.env.HEALTHCARE_R2_BUCKET ?? "research-thera";

/**
 * Stream a family-document PDF from R2 with auth.
 * Mirrors the deleted apps/agentic-healthcare/app/api/family-documents/[id]/route.ts.
 *
 * Note: family_documents data is migrated and accessible via this endpoint,
 * but research-thera doesn't yet expose a UI/GraphQL surface for it. Gap noted
 * in memory.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { data: session } = await auth.getSession();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const rows = await sql`
    SELECT file_path, file_name FROM family_documents
    WHERE id = ${id} AND user_id = ${userEmail}
    LIMIT 1
  `;
  const doc = rows[0];
  if (!doc || !doc.file_path) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { body, contentType, contentLength } = await getR2FileStream(
    doc.file_path as string,
    { bucket: HEALTHCARE_BUCKET },
  );

  const headers: Record<string, string> = {
    "Content-Disposition": `inline; filename="${encodeURIComponent(
      (doc.file_name as string) ?? "document",
    )}"`,
    "Content-Type": contentType ?? "application/pdf",
  };
  if (contentLength) headers["Content-Length"] = String(contentLength);

  return new NextResponse(body as ReadableStream, { headers });
}
