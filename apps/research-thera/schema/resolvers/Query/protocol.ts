import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const protocol: NonNullable<QueryResolvers['protocol']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const protocol = await db.getProtocolBySlug(args.slug, userEmail);
  if (!protocol) return null;

  const [supplements, baseline, checkIns] = await Promise.all([
    db.listSupplements(protocol.id),
    db.getCognitiveBaseline(protocol.id),
    db.listCheckIns(protocol.id),
  ]);

  return { protocol, supplements, baseline, checkIns };
};
