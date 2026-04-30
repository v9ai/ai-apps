import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { themes, themeItems } from "@/lib/schema";
import { parseMocUrl } from "@/lib/moc-url";
import { mocImageUrl } from "@/lib/moc-image";
import { and, eq } from "drizzle-orm";

const REBRICKABLE_KEY = process.env.REBRICKABLE_API_KEY;
const REBRICKABLE_BASE = "https://rebrickable.com/api/v3/lego";

type Resolved = {
  kind: "moc" | "set";
  refId: string;
  name: string;
  imageUrl: string | null;
  url: string | null;
  designer: string | null;
};

async function resolveMoc(input: {
  url?: string;
  refId?: string;
  name?: string;
  designer?: string;
}): Promise<Resolved> {
  if (input.url) {
    const parsed = parseMocUrl(input.url);
    return {
      kind: "moc",
      refId: parsed.mocId,
      name: parsed.name,
      imageUrl: mocImageUrl(parsed.mocId),
      url: parsed.url,
      designer: parsed.designer,
    };
  }
  if (input.refId) {
    return {
      kind: "moc",
      refId: input.refId,
      name: input.name || input.refId,
      imageUrl: mocImageUrl(input.refId),
      url: `https://rebrickable.com/mocs/${input.refId}/`,
      designer: input.designer ?? null,
    };
  }
  throw new Error("MOC requires url or refId");
}

async function resolveSet(refId: string): Promise<Resolved> {
  if (!REBRICKABLE_KEY) throw new Error("Rebrickable API key not configured");
  const setNum = refId.includes("-") ? refId : `${refId}-1`;
  const res = await fetch(`${REBRICKABLE_BASE}/sets/${setNum}/`, {
    headers: { Authorization: `key ${REBRICKABLE_KEY}` },
  });
  if (!res.ok) throw new Error(`Set ${setNum} not found on Rebrickable`);
  const data = await res.json();
  return {
    kind: "set",
    refId: data.set_num,
    name: data.name,
    imageUrl: data.set_img_url,
    url: data.set_url,
    designer: null,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const [theme] = await db
    .select()
    .from(themes)
    .where(and(eq(themes.userId, session.user.id), eq(themes.slug, slug)));
  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  const body = await req.json();
  let resolved: Resolved;
  try {
    if (body.kind === "set" && typeof body.refId === "string") {
      resolved = await resolveSet(body.refId.trim());
    } else if (body.kind === "moc") {
      resolved = await resolveMoc({
        url: body.url,
        refId: body.refId,
        name: body.name,
        designer: body.designer,
      });
    } else if (typeof body.url === "string" && /rebrickable\.com\/mocs\//.test(body.url)) {
      resolved = await resolveMoc({ url: body.url });
    } else if (typeof body.url === "string" && /rebrickable\.com\/sets\//.test(body.url)) {
      const m = body.url.match(/sets\/([\w-]+)/);
      if (!m) throw new Error("Invalid Rebrickable set URL");
      resolved = await resolveSet(m[1]);
    } else {
      return NextResponse.json(
        { error: "Provide {kind:'moc'|'set', refId} or a Rebrickable url" },
        { status: 400 },
      );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resolve item";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [row] = await db
    .insert(themeItems)
    .values({
      themeId: theme.id,
      kind: resolved.kind,
      refId: resolved.refId,
      name: resolved.name,
      imageUrl: resolved.imageUrl,
      url: resolved.url,
      designer: resolved.designer,
    })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ item: row ?? null, alreadyExists: !row });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const { kind, refId } = await req.json();

  if (typeof kind !== "string" || typeof refId !== "string") {
    return NextResponse.json({ error: "kind and refId required" }, { status: 400 });
  }

  const [theme] = await db
    .select()
    .from(themes)
    .where(and(eq(themes.userId, session.user.id), eq(themes.slug, slug)));
  if (!theme) {
    return NextResponse.json({ error: "Theme not found" }, { status: 404 });
  }

  await db
    .delete(themeItems)
    .where(
      and(
        eq(themeItems.themeId, theme.id),
        eq(themeItems.kind, kind),
        eq(themeItems.refId, refId),
      ),
    );

  return NextResponse.json({ ok: true });
}
