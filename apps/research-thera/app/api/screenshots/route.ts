import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth/server";
import { uploadToR2, generateScreenshotKey } from "@ai-apps/r2";
import { addIssueScreenshot } from "@/src/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const SCREENSHOTS_BUCKET = "longform-tts";

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const issueId = parseInt(formData.get("issueId") as string, 10);

  if (!file || isNaN(issueId)) {
    return NextResponse.json({ error: "file and issueId are required" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File size must be under 10 MB" }, { status: 400 });
  }

  const key = generateScreenshotKey(issueId, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  const uploadResult = await uploadToR2({
    key,
    body: buffer,
    contentType: file.type,
    bucket: SCREENSHOTS_BUCKET,
  });

  const screenshot = await addIssueScreenshot({
    issueId,
    userId: userEmail,
    r2Key: key,
    url: uploadResult.publicUrl || key,
    filename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  });

  return NextResponse.json({
    id: screenshot.id,
    url: screenshot.url,
    filename: screenshot.filename,
  });
}
