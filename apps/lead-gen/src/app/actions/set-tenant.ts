"use server";

import { cookies } from "next/headers";
import { DEFAULT_TENANT, TENANT_COOKIE, isTenantKey, type TenantKey } from "@/lib/tenants";

export async function setTenant(key: string): Promise<TenantKey> {
  const next = isTenantKey(key) ? key : DEFAULT_TENANT;
  const store = await cookies();
  store.set(TENANT_COOKIE, next, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
    httpOnly: false,
  });
  return next;
}
