import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { sql } from "@/src/db/neon";
import { getR2FileStream } from "@ai-apps/r2";

export const runtime = "nodejs";

const HEALTHCARE_BUCKET = process.env.HEALTHCARE_R2_BUCKET ?? "research-thera";

/**
 * Stream a blood-test PDF from R2 with auth.
 * Mirrors the deleted apps/agentic-healthcare/app/api/blood-tests/[id]/file/route.ts.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { data: session } = await auth.getSession();
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const rows = await sql`
      SELECT file_path, file_name FROM blood_tests
      WHERE id = ${id} AND user_id = ${userEmail}
      LIMIT 1
    `;
    const test = rows[0];
    if (!test || !test.file_path) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { body, contentType, contentLength } = await getR2FileStream(
      test.file_path as string,
      { bucket: HEALTHCARE_BUCKET },
    );

    const headers: Record<string, string> = {
      "Content-Disposition": `inline; filename="${encodeURIComponent(
        (test.file_name as string) ?? "blood-test",
      )}"`,
      "Content-Type": contentType ?? "application/pdf",
    };
    if (contentLength) headers["Content-Length"] = String(contentLength);

    return new NextResponse(body as ReadableStream, { headers });
  } catch (err) {
    console.error("[blood-test-file] failed", { id, bucket: HEALTHCARE_BUCKET, err });
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
