import type { MutationResolvers } from "./../../types.generated";
import {
  buildVaultCookie,
  checkRateLimit,
  resetRateLimit,
  signVaultToken,
  VAULT_SESSION_TTL_SECONDS,
  verifyPin,
} from "@/src/lib/vault-session";

export const unlockVault: NonNullable<MutationResolvers['unlockVault']> = async (
  _parent,
  args,
  ctx,
) => {
  const userId = ctx.userId;
  if (!userId) {
    throw new Error("Authentication required");
  }

  const allowed = process.env.VAULT_ALLOWED_EMAIL;
  if (!allowed || !ctx.userEmail || ctx.userEmail !== allowed) {
    return { success: false, unlocked: false, message: "Invalid PIN" };
  }

  const rate = checkRateLimit(userId);
  if (!rate.allowed) {
    return { success: false, unlocked: false, message: "Too many attempts. Try again later." };
  }

  const storedHash = process.env.JOURNAL_VAULT_PIN;
  if (!storedHash) {
    return { success: false, unlocked: false, message: "Vault not configured" };
  }

  const pin = args.pin ?? "";
  if (!pin || !verifyPin(pin, storedHash)) {
    return { success: false, unlocked: false, message: "Invalid PIN" };
  }

  resetRateLimit(userId);

  const exp = Math.floor(Date.now() / 1000) + VAULT_SESSION_TTL_SECONDS;
  const token = signVaultToken({ uid: userId, exp });
  ctx.pendingVaultCookie = buildVaultCookie(token);
  ctx.vaultUnlocked = true;

  return { success: true, unlocked: true, message: null };
};
