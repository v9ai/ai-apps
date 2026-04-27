/**
 * Minimal subset of the graphql-ws protocol (graphql-transport-ws).
 *
 * We do not execute GraphQL on the gateway. Instead we parse the operation
 * to extract a filter (which subscription, what variables) and forward
 * publish events that already match the GraphQL response shape.
 *
 * Spec: https://github.com/enisdenjo/graphql-ws/blob/master/PROTOCOL.md
 */

export type ClientMessage =
  | { type: "connection_init"; payload?: Record<string, unknown> }
  | { type: "ping"; payload?: Record<string, unknown> }
  | { type: "pong"; payload?: Record<string, unknown> }
  | {
      type: "subscribe";
      id: string;
      payload: {
        query: string;
        variables?: Record<string, unknown>;
        operationName?: string | null;
      };
    }
  | { type: "complete"; id: string };

export type ServerMessage =
  | { type: "connection_ack" }
  | { type: "ping" }
  | { type: "pong" }
  | { type: "next"; id: string; payload: { data: Record<string, unknown> } }
  | {
      type: "error";
      id: string;
      payload: { message: string }[];
    }
  | { type: "complete"; id: string };

/**
 * Parsed subscription filter. The gateway recognizes a closed set of
 * subscriptions; unknown ones are rejected.
 */
export type Filter =
  | { kind: "intelRunStatus"; productId: number; opKind: string | null };

/**
 * Parse the incoming subscription document to produce a Filter.
 *
 * We rely on operation field names since the document body is small and
 * predictable. If an unknown operation arrives, return null.
 */
export function parseFilter(
  query: string,
  variables: Record<string, unknown> | undefined,
): Filter | null {
  if (!query.includes("intelRunStatus")) return null;
  const productId = Number(variables?.productId);
  if (!Number.isFinite(productId)) return null;
  const opKind =
    typeof variables?.kind === "string" ? (variables.kind as string) : null;
  return { kind: "intelRunStatus", productId, opKind };
}

/**
 * Returns true if the publish event should reach this filter.
 */
export function eventMatches(
  filter: Filter,
  event: { kind: "intelRunStatus"; productId: number; opKind: string },
): boolean {
  if (filter.kind !== event.kind) return false;
  if (filter.productId !== event.productId) return false;
  if (filter.opKind != null && filter.opKind !== event.opKind) return false;
  return true;
}
