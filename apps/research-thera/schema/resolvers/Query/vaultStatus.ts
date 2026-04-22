import type { QueryResolvers } from "./../../types.generated";

export const vaultStatus: NonNullable<QueryResolvers['vaultStatus']> = async (
  _parent,
  _args,
  ctx,
) => {
  const allowed = process.env.VAULT_ALLOWED_EMAIL;
  const available = !!allowed && !!ctx.userEmail && ctx.userEmail === allowed;
  return {
    unlocked: available && ctx.vaultUnlocked === true,
    available,
  };
};
