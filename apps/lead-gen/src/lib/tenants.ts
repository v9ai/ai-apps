export type TenantKey = "vadim";

export const TENANT_COOKIE = "tenant";
export const DEFAULT_TENANT: TenantKey = "vadim";

export function isTenantKey(value: string | undefined): value is TenantKey {
  return value === "vadim";
}
