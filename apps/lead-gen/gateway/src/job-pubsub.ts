/**
 * JobPubSub Durable Object — fans out IntelRun status events to subscribed
 * WebSocket clients using the graphql-ws protocol.
 *
 * Hibernation: uses `state.acceptWebSocket` so the DO can hibernate while
 * connections are idle. Per-connection subscription state is serialized to
 * the WebSocket attachment.
 */

import {
  parseFilter,
  eventMatches,
  type ClientMessage,
  type ServerMessage,
  type Filter,
} from "./protocol";

interface ConnAttachment {
  /** Map of graphql-ws subscription id → filter for this connection. */
  subs: Record<string, Filter>;
  acked: boolean;
}

interface PublishEvent {
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

export class JobPubSub {
  state: DurableObjectState;

  constructor(state: DurableObjectState) {
    this.state = state;
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/__publish" && req.method === "POST") {
      const event = (await req.json()) as PublishEvent;
      this.broadcast(event);
      return new Response("ok");
    }

    if (req.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const client = pair[0];
      const server = pair[1];
      this.state.acceptWebSocket(server);
      const init: ConnAttachment = { subs: {}, acked: false };
      server.serializeAttachment(init);
      return new Response(null, { status: 101, webSocket: client });
    }

    return new Response("Not found", { status: 404 });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      ws.close(4400, "Invalid JSON");
      return;
    }

    const att = (ws.deserializeAttachment() as ConnAttachment | null) ?? {
      subs: {},
      acked: false,
    };

    switch (msg.type) {
      case "connection_init":
        att.acked = true;
        ws.serializeAttachment(att);
        sendMessage(ws, { type: "connection_ack" });
        return;

      case "ping":
        sendMessage(ws, { type: "pong" });
        return;

      case "pong":
        return;

      case "subscribe": {
        if (!att.acked) {
          ws.close(4401, "Unauthorized");
          return;
        }
        const filter = parseFilter(msg.payload.query, msg.payload.variables);
        if (!filter) {
          sendMessage(ws, {
            type: "error",
            id: msg.id,
            payload: [{ message: "Unsupported subscription" }],
          });
          return;
        }
        att.subs[msg.id] = filter;
        ws.serializeAttachment(att);
        return;
      }

      case "complete":
        delete att.subs[msg.id];
        ws.serializeAttachment(att);
        return;

      default:
        return;
    }
  }

  async webSocketClose(
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    // Hibernation auto-cleans the connection list — nothing to persist.
  }

  async webSocketError(_ws: WebSocket, _err: unknown): Promise<void> {
    // No-op; hibernation will drop the socket.
  }

  private broadcast(event: PublishEvent): void {
    const sockets = this.state.getWebSockets();
    const eventForMatch = {
      kind: "intelRunStatus" as const,
      productId: event.productId,
      opKind: event.kind,
    };
    for (const ws of sockets) {
      const att = ws.deserializeAttachment() as ConnAttachment | null;
      if (!att) continue;
      for (const [subId, filter] of Object.entries(att.subs)) {
        if (eventMatches(filter, eventForMatch)) {
          sendMessage(ws, {
            type: "next",
            id: subId,
            payload: { data: { intelRunStatus: event.intelRun } },
          });
        }
      }
    }
  }
}

function sendMessage(ws: WebSocket, msg: ServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // Connection may be in a bad state; let hibernation reap it.
  }
}
