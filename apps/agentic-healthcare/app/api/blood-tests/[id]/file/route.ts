import { type NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { bloodTests } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getR2FileStream } from "@ai-apps/r2";
import { R2_BUCKET } from "@/lib/r2-bucket";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await withAuth();
  const { id } = await params;

  const [test] = await db
    .select()
    .from(bloodTests)
    .where(and(eq(bloodTests.id, id), eq(bloodTests.userId, userId)));

  if (!test) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { body, contentType, contentLength } = await getR2FileStream(
    test.filePath,
    { bucket: R2_BUCKET },
  );

  const headers: Record<string, string> = {
    "Content-Disposition": `inline; filename="${encodeURIComponent(test.fileName)}"`,
    "Content-Type": contentType ?? "application/octet-stream",
  };
  if (contentLength) headers["Content-Length"] = String(contentLength);

  return new NextResponse(body as ReadableStream, { headers });
}
