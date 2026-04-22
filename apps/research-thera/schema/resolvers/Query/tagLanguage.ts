import type { QueryResolvers } from "./../../types.generated";
import { sql as neonSql } from "@/src/db/neon";

export const tagLanguage: NonNullable<QueryResolvers['tagLanguage']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const rows = await neonSql`
    SELECT language FROM tag_language_rules
    WHERE tag = ${args.tag} AND user_id = ${userEmail}
    LIMIT 1
  `;
  return (rows[0]?.language as string | undefined) ?? null;
};
