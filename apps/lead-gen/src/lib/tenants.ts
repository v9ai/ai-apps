export const TENANTS = [
  { key: "vadim", label: "Vadim Nicolai", initial: "V" },
] as const;

export type TenantKey = (typeof TENANTS)[number]["key"];

export const TENANT_COOKIE = "tenant";
export const DEFAULT_TENANT: TenantKey = "vadim";

export function isTenantKey(value: string | undefined): value is TenantKey {
  return !!value && TENANTS.some((t) => t.key === value);
}

export function getTenantMeta(key: TenantKey) {
  return TENANTS.find((t) => t.key === key) ?? TENANTS[0];
}
