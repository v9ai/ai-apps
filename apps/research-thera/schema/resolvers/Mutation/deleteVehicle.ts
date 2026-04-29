import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteVehicle: NonNullable<MutationResolvers['deleteVehicle']> =
  async (_parent, args, ctx) => {
    const userEmail = ctx.userEmail;
    if (!userEmail) throw new Error("Authentication required");

    const deleted = await db.deleteVehicle(args.id, userEmail);
    return { id: args.id, deleted };
  };