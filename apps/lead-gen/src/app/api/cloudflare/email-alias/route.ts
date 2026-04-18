import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/server";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/db";
import { contacts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CF_API = "https://api.cloudflare.com/client/v4";
const ALIAS_DOMAIN = "vadim.blog";

interface CreateAliasRequest {
  contactId: number;
  alias: string;
}

interface CloudflareRule {
  tag: string;
  name: string;
  enabled: boolean;
  matchers: Array<{ type: string; field: string; value: string }>;
  actions: Array<{ type: string; value: string[] }>;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors?: Array<{ code: number; message: string }>;
  result?: T;
}

function sanitizeAlias(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
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

  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID_VADIM_BLOG;
  if (!token || !zoneId) {
    return NextResponse.json(
      { success: false, error: "CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID_VADIM_BLOG not set" },
      { status: 500 },
    );
  }

  let input: CreateAliasRequest;
  try {
    input = (await request.json()) as CreateAliasRequest;
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

  const aliasAddress = `${alias}@${ALIAS_DOMAIN}`;
  const rulePayload = {
    name: `alias:${alias} → ${contact.email}`,
    enabled: true,
    matchers: [{ type: "literal", field: "to", value: aliasAddress }],
    actions: [{ type: "forward", value: [contact.email] }],
  };

  const cfResponse = await fetch(
    `${CF_API}/zones/${zoneId}/email/routing/rules`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(rulePayload),
    },
  );

  const cfJson = (await cfResponse.json()) as CloudflareResponse<CloudflareRule>;

  if (!cfResponse.ok || !cfJson.success || !cfJson.result) {
    const msg = cfJson.errors?.map((e) => `[${e.code}] ${e.message}`).join("; ")
      ?? `HTTP ${cfResponse.status}`;
    return NextResponse.json(
      { success: false, error: `Cloudflare API: ${msg}` },
      { status: 502 },
    );
  }

  await db
    .update(contacts)
    .set({
      forwarding_alias: alias,
      forwarding_alias_rule_id: cfJson.result.tag,
      updated_at: new Date().toISOString(),
    })
    .where(eq(contacts.id, contactId));

  return NextResponse.json({
    success: true,
    alias,
    aliasAddress,
    ruleId: cfJson.result.tag,
    forwardsTo: contact.email,
  });
}

