import type { MutationResolvers } from "./../../types.generated";
import { buildVaultCookie } from "@/src/lib/vault-session";

export const lockVault: NonNullable<MutationResolvers['lockVault']> = async (
  _parent,
  _args,
  ctx,
) => {
  ctx.pendingVaultCookie = buildVaultCookie(null);
  ctx.vaultUnlocked = false;
  return { unlocked: false };
};
