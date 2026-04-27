/**
 * Internal helper — publishes IntelRun events to the JobPubSub Durable Object
 * so subscribed WebSocket clients receive the update. Called by mutation
 * resolvers (run kickoff) and the run-finished webhook handler.
 */

import type { GatewayEnv } from "./context";

export interface PublishEvent {
  productId: number;
  kind: string;
  intelRun: {
    id: string;
    productId: number;
    kind: string;
    status: string;
    startedAt: string;
    finishedAt: string | null;
    error: string | null;
  };
}

const SUBSCRIPTION_DO_NAME = "global";

export async function publishToPubSub(
  env: GatewayEnv,
  event: PublishEvent,
): Promise<void> {
  const id = env.JOB_PUBSUB.idFromName(SUBSCRIPTION_DO_NAME);
  const stub = env.JOB_PUBSUB.get(id);
  await stub.fetch(
    new Request("https://do/__publish", {
      method: "POST",
      body: JSON.stringify(event),
      headers: { "content-type": "application/json" },
    }),
  );
}
