export interface GraphQLContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  vaultUnlocked: boolean;
  pendingVaultCookie?: string;
}
