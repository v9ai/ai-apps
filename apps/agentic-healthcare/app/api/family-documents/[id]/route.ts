import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { familyDocuments } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getR2FileStream } from "@ai-apps/r2";
import { R2_BUCKET } from "@/lib/r2-bucket";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await withAuth();
  const { id } = await params;

  const [doc] = await db
    .select()
    .from(familyDocuments)
    .where(and(eq(familyDocuments.id, id), eq(familyDocuments.userId, userId)));

  if (!doc || !doc.filePath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { body, contentType, contentLength } = await getR2FileStream(
    doc.filePath,
    { bucket: R2_BUCKET },
  );

  const headers: Record<string, string> = {
    "Content-Disposition": `inline; filename="${encodeURIComponent(doc.fileName ?? "document")}"`,
    "Content-Type": contentType ?? "application/octet-stream",
  };
  if (contentLength) headers["Content-Length"] = String(contentLength);

  return new NextResponse(body as ReadableStream, { headers });
}
