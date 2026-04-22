import type { QueryResolvers } from "./../../types.generated";

export const vaultStatus: NonNullable<QueryResolvers['vaultStatus']> = async (
  _parent,
  _args,
  ctx,
) => {
  return {
    unlocked: ctx.vaultUnlocked === true,
  };
};
