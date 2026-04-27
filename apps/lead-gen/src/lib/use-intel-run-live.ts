"use client";

import { useApolloClient } from "@apollo/client";
import {
  usePublicIntelRunsQuery,
  useIntelRunStatusSubscription,
  PublicIntelRunsDocument,
} from "@/__generated__/hooks";

/**
 * Live IntelRun status without HTTP polling.
 *
 * Initial state: one-shot `productIntelRuns` query.
 * Live updates: `intelRunStatus` subscription via the Cloudflare gateway.
 *
 * On every subscription event, we patch the Apollo cache for the matching
 * `PublicIntelRuns` query so consumers can keep using `runsData`.
 *
 * Returns the same `{ data, loading, error }` shape as `usePublicIntelRunsQuery`
 * to keep call-site swaps mechanical.
 */
export function useIntelRunLive(
  productId: number,
  kind: string,
  opts: { skip?: boolean } = {},
) {
  const client = useApolloClient();
  const skip = opts.skip || !productId;

  const queryResult = usePublicIntelRunsQuery({
    variables: { productId, kind },
    skip,
    fetchPolicy: "cache-and-network",
  });

  useIntelRunStatusSubscription({
    variables: { productId, kind },
    skip,
    onData: ({ data }) => {
      const incoming = data.data?.intelRunStatus;
      if (!incoming) return;
      const cached = client.readQuery({
        query: PublicIntelRunsDocument,
        variables: { productId, kind },
      });
      const existing = cached?.productIntelRuns ?? [];
      const idx = existing.findIndex(
        (r: { id: string }) => r.id === incoming.id,
      );
      const next =
        idx >= 0
          ? existing.map((r: { id: string }) =>
              r.id === incoming.id ? { ...r, ...incoming } : r,
            )
          : [incoming, ...existing];
      client.writeQuery({
        query: PublicIntelRunsDocument,
        variables: { productId, kind },
        data: { productIntelRuns: next },
      });
    },
  });

  return queryResult;
}
