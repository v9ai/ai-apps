import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { coursework } from "@/src/db/schema";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await getSession();
        if (!session) throw new Error("Unauthorized");

        return {
          allowedContentTypes: [...ALLOWED_TYPES],
          maximumSizeInBytes: MAX_SIZE,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            ...(clientPayload ? JSON.parse(clientPayload) : {}),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        if (!tokenPayload) return;
        const payload = JSON.parse(tokenPayload);

        await db.insert(coursework).values({
          learnerId: payload.learnerId,
          userId: payload.userId,
          title: payload.title || blob.pathname.split("/").pop() || "Untitled",
          fileName: blob.pathname.split("/").pop() || blob.pathname,
          fileUrl: blob.url,
          fileSize: blob.size,
          mimeType: blob.contentType || "application/octet-stream",
          subject: payload.subject || null,
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
