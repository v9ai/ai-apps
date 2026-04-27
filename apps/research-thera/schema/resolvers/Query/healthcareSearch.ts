import type { QueryResolvers } from "./../../types.generated";
import { multiSearch } from "@/src/lib/healthcare-backend";

export const healthcareSearch: NonNullable<QueryResolvers['healthcareSearch']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const query = args.query.trim();
  if (!query) {
    return {
      tests: [],
      markers: [],
      conditions: [],
      medications: [],
      symptoms: [],
      appointments: [],
    };
  }

  return multiSearch(query, userEmail);
};
