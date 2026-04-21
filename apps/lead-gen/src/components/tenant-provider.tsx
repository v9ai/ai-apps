"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { setTenant as setTenantAction } from "@/app/actions/set-tenant";
import { DEFAULT_TENANT, type TenantKey } from "@/lib/tenants";

interface TenantContextValue {
  tenant: TenantKey;
  setTenant: (key: TenantKey) => void;
  pending: boolean;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: DEFAULT_TENANT,
  setTenant: () => {},
  pending: false,
});

export function TenantProvider({
  initialTenant,
  children,
}: {
  initialTenant: TenantKey;
  children: ReactNode;
}) {
  const [tenant, setTenantState] = useState<TenantKey>(initialTenant);
  const [pending, startTransition] = useTransition();

  const setTenant = useCallback((key: TenantKey) => {
    setTenantState(key);
    startTransition(() => {
      setTenantAction(key).catch(() => {
        // swallow — UI reflects optimistic state; cookie write will retry on next interaction
      });
    });
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, setTenant, pending }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
