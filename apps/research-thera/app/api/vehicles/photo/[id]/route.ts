import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { auth } from "@/app/lib/auth/server";
import { sql } from "@/src/db/neon";
import { getR2FileStream } from "@ai-apps/r2";
import { VEHICLE_R2_BUCKET } from "@/app/lib/r2-vehicle";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const { data: session } = await auth.getSession();
    const userEmail = session?.user?.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const rows = await sql`
      SELECT vp.r2_key, vp.content_type
      FROM vehicle_photos vp
      JOIN vehicles v ON v.id = vp.vehicle_id
      WHERE vp.id = ${id} AND v.user_id = ${userEmail}
      LIMIT 1
    `;
    const photo = rows[0];
    if (!photo) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { body, contentType, contentLength } = await getR2FileStream(
      photo.r2_key as string,
      { bucket: VEHICLE_R2_BUCKET },
    );

    if (!body) {
      return NextResponse.json(
        { error: "Empty body from R2" },
        { status: 502 },
      );
    }

    // The AWS SDK returns a Node Readable in Node runtime; NextResponse needs a
    // Web ReadableStream. Convert when needed.
    const webStream =
      body instanceof Readable
        ? (Readable.toWeb(body) as unknown as ReadableStream)
        : (body as unknown as ReadableStream);

    const headers: Record<string, string> = {
      "Content-Type":
        contentType ??
        (photo.content_type as string) ??
        "application/octet-stream",
      "Cache-Control": "private, max-age=300",
    };
    if (contentLength) headers["Content-Length"] = String(contentLength);

    return new NextResponse(webStream, { headers });
  } catch (err) {
    console.error(`[/api/vehicles/photo/${id}] failed:`, err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: "Failed to load photo", detail: message },
      { status: 500 },
    );
  }
}
