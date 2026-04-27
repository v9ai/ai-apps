import type { QueryResolvers } from "./../../types.generated";
import { markerTrend } from "@/src/lib/healthcare-backend";

export const healthcareMarkerTrend: NonNullable<QueryResolvers['healthcareMarkerTrend']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const query = args.query.trim();
  if (!query) return [];

  return markerTrend(query, userEmail, args.markerName?.trim() || null);
};
