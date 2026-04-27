import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { uploadBloodTestToPython } from "@/src/lib/healthcare-backend";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Multipart upload proxy: browser → Next API → merged Python /upload at :2024.
 * Apollo Client doesn't natively handle multipart; routing through this API
 * lets the browser upload directly while the GraphQL surface stays clean.
 */
export async function POST(req: NextRequest) {
  const { data: session } = await auth.getSession();
  const userEmail = session?.user?.email;
  if (!userEmail) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const testDate = (form.get("test_date") as string | null) ?? null;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const result = await uploadBloodTestToPython(file, userEmail, testDate);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
