import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/src/db";
import { concepts, knowledgeStates } from "@/src/db/schema";
import { eq, and, like, sql } from "drizzle-orm";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * GET /api/applications/[id]/memorize
 * Returns the user's mastery states for all css:* concepts.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session] = await Promise.all([getSession(), params]);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      conceptName: concepts.name,
      pMastery: knowledgeStates.pMastery,
      masteryLevel: knowledgeStates.masteryLevel,
      totalInteractions: knowledgeStates.totalInteractions,
      correctInteractions: knowledgeStates.correctInteractions,
      lastInteractionAt: knowledgeStates.lastInteractionAt,
    })
    .from(knowledgeStates)
    .innerJoin(concepts, eq(knowledgeStates.conceptId, concepts.id))
    .where(
      and(
        eq(knowledgeStates.userId, session.user.id),
        like(concepts.name, "css:%"),
      ),
    );

  const mastery: Record<
    string,
    {
      pMastery: number;
      masteryLevel: string;
      totalInteractions: number;
      correctInteractions: number;
      lastInteractionAt: Date | null;
    }
  > = {};

  for (const row of rows) {
    // Strip "css:" prefix to get property id
    const propId = row.conceptName.replace(/^css:/, "");
    mastery[propId] = {
      pMastery: row.pMastery,
      masteryLevel: row.masteryLevel,
      totalInteractions: row.totalInteractions,
      correctInteractions: row.correctInteractions,
      lastInteractionAt: row.lastInteractionAt,
    };
  }

  return NextResponse.json({ mastery });
}

/**
 * POST /api/applications/[id]/memorize
 * Record an interaction for a CSS property concept.
 * Body: { propertyId: string, isCorrect: boolean, mode: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [session] = await Promise.all([getSession(), params]);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { propertyId, isCorrect } = body as {
    propertyId: string;
    isCorrect: boolean;
  };

  if (!propertyId || typeof isCorrect !== "boolean") {
    return NextResponse.json(
      { error: "propertyId and isCorrect required" },
      { status: 400 },
    );
  }

  const conceptName = `css:${propertyId}`;

  // Find the concept
  const [concept] = await db
    .select({ id: concepts.id })
    .from(concepts)
    .where(eq(concepts.name, conceptName));

  if (!concept) {
    return NextResponse.json(
      { error: `Concept ${conceptName} not found` },
      { status: 404 },
    );
  }

  // Read current state
  const [existing] = await db
    .select()
    .from(knowledgeStates)
    .where(
      and(
        eq(knowledgeStates.userId, session.user.id),
        eq(knowledgeStates.conceptId, concept.id),
      ),
    );

  const total = (existing?.totalInteractions ?? 0) + 1;
  const correct =
    (existing?.correctInteractions ?? 0) + (isCorrect ? 1 : 0);
  const currentMastery = existing?.pMastery ?? 0.1;

  // Simple BKT-inspired update (works without the Rust server running)
  const pTransit = 0.1;
  const pSlip = 0.1;
  const pGuess = 0.2;

  let pMastery: number;
  if (isCorrect) {
    const pCorrectGivenMastered = 1 - pSlip;
    const pCorrectGivenUnmastered = pGuess;
    const posterior =
      (currentMastery * pCorrectGivenMastered) /
      (currentMastery * pCorrectGivenMastered +
        (1 - currentMastery) * pCorrectGivenUnmastered);
    pMastery = posterior + (1 - posterior) * pTransit;
  } else {
    const pIncorrectGivenMastered = pSlip;
    const pIncorrectGivenUnmastered = 1 - pGuess;
    const posterior =
      (currentMastery * pIncorrectGivenMastered) /
      (currentMastery * pIncorrectGivenMastered +
        (1 - currentMastery) * pIncorrectGivenUnmastered);
    pMastery = posterior + (1 - posterior) * pTransit;
  }

  const masteryLevel =
    pMastery >= 0.8
      ? "expert"
      : pMastery >= 0.6
        ? "proficient"
        : pMastery >= 0.4
          ? "intermediate"
          : pMastery >= 0.2
            ? "beginner"
            : "novice";

  const now = new Date();

  if (existing) {
    await db
      .update(knowledgeStates)
      .set({
        pMastery,
        totalInteractions: total,
        correctInteractions: correct,
        masteryLevel,
        lastInteractionAt: now,
        updatedAt: now,
      })
      .where(eq(knowledgeStates.id, existing.id));
  } else {
    await db.insert(knowledgeStates).values({
      userId: session.user.id,
      conceptId: concept.id,
      pMastery,
      pTransit,
      pSlip,
      pGuess,
      totalInteractions: total,
      correctInteractions: correct,
      masteryLevel,
      lastInteractionAt: now,
    });
  }

  return NextResponse.json({ pMastery, masteryLevel, total, correct });
}
