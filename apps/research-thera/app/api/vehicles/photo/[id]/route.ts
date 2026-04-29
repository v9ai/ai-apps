import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { sql } from "@/src/db/neon";
import { getR2FileStream } from "@ai-apps/r2";
import { VEHICLE_R2_BUCKET } from "@/app/lib/r2-vehicle";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { data: session } = await auth.getSession();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  const { id } = await params;
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

  const headers: Record<string, string> = {
    "Content-Type":
      contentType ?? (photo.content_type as string) ?? "application/octet-stream",
    "Cache-Control": "private, max-age=300",
  };
  if (contentLength) headers["Content-Length"] = String(contentLength);

  return new NextResponse(body as ReadableStream, { headers });
}
