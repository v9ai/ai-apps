import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/db";
import { contacts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALIAS_DOMAIN = "vadim.blog";
const RESERVED = new Set(["contact", "postmaster", "abuse", "hostmaster", "admin", "noreply", "no-reply"]);

interface SetAliasRequest {
  contactId: number;
  alias: string;
}

function sanitizeAlias(raw: string): string {
  return raw
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, "")
    .slice(0, 64);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(session.user.email)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  let input: SetAliasRequest;
  try {
    input = (await request.json()) as SetAliasRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { contactId } = input;
  const alias = sanitizeAlias(input.alias ?? "");
  if (!contactId || !alias) {
    return NextResponse.json(
      { success: false, error: "contactId and alias are required" },
      { status: 400 },
    );
  }
  if (RESERVED.has(alias.toLowerCase())) {
    return NextResponse.json(
      { success: false, error: `Alias '${alias}' is reserved` },
      { status: 400 },
    );
  }

  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, contactId))
    .limit(1);
  if (!contact) {
    return NextResponse.json({ success: false, error: "Contact not found" }, { status: 404 });
  }
  if (!contact.email) {
    return NextResponse.json(
      { success: false, error: "Contact has no email to forward to" },
      { status: 400 },
    );
  }

  const [clash] = await db
    .select({ id: contacts.id })
    .from(contacts)
    .where(
      and(
        sql`lower(${contacts.forwarding_alias}) = ${alias.toLowerCase()}`,
        ne(contacts.id, contactId),
      ),
    )
    .limit(1);
  if (clash) {
    return NextResponse.json(
      { success: false, error: `Alias '${alias}' is already used by contact ${clash.id}` },
      { status: 409 },
    );
  }

  await db
    .update(contacts)
    .set({
      forwarding_alias: alias,
      updated_at: new Date().toISOString(),
    })
    .where(eq(contacts.id, contactId));

  return NextResponse.json({
    success: true,
    alias,
    aliasAddress: `${alias}@${ALIAS_DOMAIN}`,
    forwardsTo: contact.email,
  });
}
