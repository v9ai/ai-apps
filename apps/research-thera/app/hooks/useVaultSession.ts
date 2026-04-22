"use client";

import { useVaultStatusQuery } from "@/app/__generated__/hooks";

export function useVaultSession() {
  const { data, refetch } = useVaultStatusQuery({
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: false,
  });
  return {
    unlocked: data?.vaultStatus?.unlocked === true,
    available: data?.vaultStatus?.available === true,
    refresh: refetch,
  };
}
