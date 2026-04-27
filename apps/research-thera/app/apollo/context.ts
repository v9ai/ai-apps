import type { Loaders } from "./loaders";

export interface GraphQLContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  vaultUnlocked: boolean;
  pendingVaultCookie?: string;
  loaders: Loaders;
}
