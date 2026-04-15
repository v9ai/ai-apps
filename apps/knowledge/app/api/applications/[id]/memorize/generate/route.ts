import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { applications, concepts } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";
import { generateMemorizeContent } from "@/lib/memorize-generator";
import type { MemorizeCategory } from "@/lib/memorize-types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * POST /api/applications/[id]/memorize/generate
 * Generate memorize categories from the app's tech stack via LLM.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session, { id: appId }] = await Promise.all([getSession(), params]);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load application
  const col = UUID_RE.test(appId) ? applications.id : applications.slug;
  const [app] = await db
    .select({
      id: applications.id,
      company: applications.company,
      position: applications.position,
      aiTechStack: applications.aiTechStack,
      techDismissedTags: applications.techDismissedTags,
      aiMemorizeCategories: applications.aiMemorizeCategories,
      userId: applications.userId,
    })
    .from(applications)
    .where(
      and(eq(col, appId), eq(applications.userId, session.user.id)),
    );

  if (!app)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Idempotent — if already generated, return existing
  if (app.aiMemorizeCategories) {
    const categories: MemorizeCategory[] = JSON.parse(
      app.aiMemorizeCategories,
    );
    return NextResponse.json({ status: "already_generated", categories });
  }

  if (!app.aiTechStack) {
    return NextResponse.json(
      { error: "No tech stack available. Generate a study plan first." },
      { status: 400 },
    );
  }

  // Generate via LLM
  const categories = await generateMemorizeContent({
    company: app.company,
    position: app.position,
    aiTechStack: app.aiTechStack,
    techDismissedTags: app.techDismissedTags,
  });

  // Upsert concepts into DB
  for (const cat of categories) {
    for (const item of cat.items) {
      const conceptName = `app:${appId}:${item.id}`;
      await db
        .insert(concepts)
        .values({
          name: conceptName,
          description: item.description,
          conceptType: "skill",
          metadata: {
            term: item.term,
            details: item.details,
            context: item.context,
            relatedItems: item.relatedItems,
            mnemonicHint: item.mnemonicHint,
          },
        })
        .onConflictDoUpdate({
          target: concepts.name,
          set: {
            description: item.description,
            metadata: {
              term: item.term,
              details: item.details,
              context: item.context,
              relatedItems: item.relatedItems,
              mnemonicHint: item.mnemonicHint,
            },
          },
        });
    }
  }

  // Save category catalog to application row
  await db
    .update(applications)
    .set({ aiMemorizeCategories: JSON.stringify(categories) })
    .where(eq(applications.id, appId));

  return NextResponse.json({ status: "generated", categories });
}
