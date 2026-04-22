import type { MutationResolvers } from "./../../types.generated";
import { sql as neonSql } from "@/src/db/neon";

const ALLOWED_LANGUAGES = new Set(["en", "ro"]);

export const setTagLanguage: NonNullable<MutationResolvers['setTagLanguage']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const tag = args.tag.trim();
  if (!tag) throw new Error("Tag cannot be empty");

  const language = args.language.trim().toLowerCase();
  if (!ALLOWED_LANGUAGES.has(language)) {
    throw new Error(`Unsupported language: ${args.language}`);
  }

  if (language === "en") {
    await neonSql`
      DELETE FROM tag_language_rules
      WHERE tag = ${tag} AND user_id = ${userId}
    `;
  } else {
    await neonSql`
      INSERT INTO tag_language_rules (tag, user_id, language, updated_at)
      VALUES (${tag}, ${userId}, ${language}, NOW())
      ON CONFLICT (tag, user_id) DO UPDATE
      SET language = EXCLUDED.language, updated_at = NOW()
    `;
  }

  return true;
};
