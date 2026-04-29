import { db } from "@/lib/db";
import { userHubs } from "@/lib/schema";
import { and, asc, eq } from "drizzle-orm";
import { HUB_SLUG_TO_TYPE, HubType } from "@/lib/parser";

export type ResolvedHub = { id: number; hubType: HubType };

export async function resolveHub(
  identifier: string,
  userId: string,
): Promise<ResolvedHub | null> {
  const numeric = Number(identifier);
  if (Number.isInteger(numeric) && numeric > 0) {
    const [row] = await db
      .select({ id: userHubs.id, hubType: userHubs.hubType })
      .from(userHubs)
      .where(and(eq(userHubs.id, numeric), eq(userHubs.userId, userId)))
      .limit(1);
    return row ? { id: row.id, hubType: row.hubType as HubType } : null;
  }

  const hubType = HUB_SLUG_TO_TYPE[identifier.toLowerCase()];
  if (!hubType) return null;

  const [row] = await db
    .select({ id: userHubs.id, hubType: userHubs.hubType })
    .from(userHubs)
    .where(and(eq(userHubs.hubType, hubType), eq(userHubs.userId, userId)))
    .orderBy(asc(userHubs.id))
    .limit(1);
  return row ? { id: row.id, hubType: row.hubType as HubType } : null;
}
