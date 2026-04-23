import type { MutationResolvers, AffirmationCategory } from "./../../types.generated";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

const ENUM_TO_CATEGORY: Record<AffirmationCategory, string> = {
  GRATITUDE: "gratitude",
  STRENGTH: "strength",
  ENCOURAGEMENT: "encouragement",
  GROWTH: "growth",
  SELF_WORTH: "self_worth",
};

export const generateAffirmationsForFamilyMember: NonNullable<MutationResolvers['generateAffirmationsForFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { familyMemberId, count, categoryFocus, language } = args;
  await db.assertOwnsFamilyMember(familyMemberId, userEmail);

  const isRo = language ? language === "ro" : await isRoGoal({ userEmail, familyMemberId });

  const result = (await runGraphAndWait("affirmations", {
    input: {
      family_member_id: familyMemberId,
      user_email: userEmail,
      count: count ?? 5,
      language: isRo ? "ro" : "en",
      category_focus: categoryFocus ? ENUM_TO_CATEGORY[categoryFocus] : undefined,
    },
  })) as { error?: string; affirmations?: unknown[]; persisted_ids?: number[] };

  if (result.error) {
    throw new Error(result.error);
  }

  const persistedIds = result.persisted_ids ?? [];
  const all = await db.listAffirmations(familyMemberId, userEmail);
  const created = all.filter((a) => persistedIds.includes(a.id));

  return {
    success: true,
    message: `Generated ${created.length} affirmations`,
    count: created.length,
    affirmations: created.map((a) => ({
      ...a,
      category: (a.category.toUpperCase().replace(/-/g, "_") ?? "ENCOURAGEMENT") as AffirmationCategory,
    })),
  };
};
