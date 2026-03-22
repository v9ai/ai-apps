import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { readdir } from "fs/promises";
import { join } from "path";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { favorites } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

const INSTRUCTIONS_DIR = join(process.cwd(), "public/data/instructions");

async function findLocalPdf(mocId: string): Promise<string | null> {
  try {
    const files = await readdir(INSTRUCTIONS_DIR);
    const match = files.find(
      (f) => f.startsWith(mocId) && f.toLowerCase().endsWith(".pdf")
    );
    return match ? `/data/instructions/${match}` : null;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ mocId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mocId } = await params;

  const [row] = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, session.user.id), eq(favorites.mocId, mocId)));

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const item = { ...row };
  const localPdf = await findLocalPdf(mocId);
  if (localPdf) item.pdfUrl = localPdf;

  return NextResponse.json({ item });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ mocId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { mocId } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = {};

  if ("pdfUrl" in body) {
    if (body.pdfUrl !== null && typeof body.pdfUrl !== "string") {
      return NextResponse.json({ error: "pdfUrl must be a string or null" }, { status: 400 });
    }
    updates.pdfUrl = body.pdfUrl || null;
  }

  if ("parts" in body) {
    if (!Array.isArray(body.parts)) {
      return NextResponse.json({ error: "parts must be an array" }, { status: 400 });
    }
    updates.parts = body.parts;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const [row] = await db
    .update(favorites)
    .set(updates)
    .where(and(eq(favorites.userId, session.user.id), eq(favorites.mocId, mocId)))
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ item: row });
}
