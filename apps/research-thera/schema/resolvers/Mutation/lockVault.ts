import type { MutationResolvers } from "./../../types.generated";
import { buildVaultCookie } from "@/src/lib/vault-session";

export const lockVault: NonNullable<MutationResolvers['lockVault']> = async (
  _parent,
  _args,
  ctx,
) => {
  ctx.pendingVaultCookie = buildVaultCookie(null);
  ctx.vaultUnlocked = false;
  const allowed = process.env.VAULT_ALLOWED_EMAIL;
  const available = !!allowed && !!ctx.userEmail && ctx.userEmail === allowed;
  return { unlocked: false, available };
};
