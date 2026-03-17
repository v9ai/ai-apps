import { NextResponse } from "next/server";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { resumes } from "@/db/schema";
import { checkIsAdmin } from "@/lib/admin";

export async function GET() {
  const { isAdmin } = await checkIsAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await db.select({ count: count() }).from(resumes);

  return NextResponse.json({ count: result[0]?.count ?? 0 });
}
