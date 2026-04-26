/**
 * Pybricks deploy client.
 *
 * Talks to the local Python deploy server (port 2026) which uses
 * pybricksdev for reliable native BLE with .mpy compilation and
 * proper download protocol.
 */

const DEPLOY_SERVER = "http://localhost:2026";

export type HubStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "deploying"
  | "running"
  | "error";

export interface PybricksHub {
  connect(bleName?: string): Promise<void>;
  disconnect(): Promise<void>;
  deploy(code: string): Promise<void>;
  stop(): Promise<void>;
  status: HubStatus;
  error: string | null;
  name: string | null;
  kind: string | null;
  output: string;
  onStatusChange: ((status: HubStatus) => void) | null;
  onOutput: ((text: string) => void) | null;
}

const SERVER_DOWN_MSG =
  "Deploy server not reachable.\nRun: cd backend && uv run python deploy_server.py";

export function createHub(): PybricksHub {
  const hub: PybricksHub = {
    status: "disconnected",
    error: null,
    name: null,
    kind: null,
    output: "",
    onStatusChange: null,
    onOutput: null,

    async connect(bleName?: string) {
      hub.error = null;
      setStatus("connecting");

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const res = await fetch(`${DEPLOY_SERVER}/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ble_name: bleName || null }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          setError(SERVER_DOWN_MSG);
          return;
        }

        const data = await res.json();

        if (data.connected) {
          hub.name = data.hub_name || "Pybricks Hub";
          hub.kind = data.hub_kind || null;
          setStatus("connected");
        } else {
          setError(data.output || "No hub found.");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setError(
            "Connection timed out.\n" +
              "Make sure the hub is on and the light is flashing blue.\n" +
              "If the script crashed earlier, hold the hub button until it powers off, then press it again to wake it.",
          );
        } else {
          setError(SERVER_DOWN_MSG);
        }
      }
    },

    async disconnect() {
      hub.name = null;
      hub.kind = null;
      setStatus("disconnected");
      try {
        await fetch(`${DEPLOY_SERVER}/disconnect`, { method: "POST" });
      } catch {
        // server might be down
      }
    },

    async stop() {
      try {
        const res = await fetch(`${DEPLOY_SERVER}/stop`, { method: "POST" });
        if (!res.ok) {
          setError(SERVER_DOWN_MSG);
          return;
        }
        const data = await res.json();
        if (!data.success) {
          setError(data.error || "Failed to stop");
        } else {
          setStatus("connected");
        }
      } catch {
        setError(SERVER_DOWN_MSG);
      }
    },

    async deploy(code: string) {
      hub.error = null;
      hub.output = "";
      setStatus("deploying");

      try {
        const res = await fetch(`${DEPLOY_SERVER}/deploy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          setError(SERVER_DOWN_MSG);
          return;
        }

        const data = await res.json();
        hub.output = data.output || "";
        hub.onOutput?.(hub.output);

        if (data.success) {
          setStatus("connected");
        } else {
          // Combine error + output for full context
          const parts: string[] = [];
          if (data.error) parts.push(data.error);
          if (data.output && data.output !== data.error) parts.push(data.output);
          setError(parts.join("\n\n") || "Deploy failed");
        }
      } catch {
        setError(SERVER_DOWN_MSG);
      }
    },
  };

  function setStatus(s: HubStatus) {
    hub.status = s;
    if (s !== "error") hub.error = null;
    hub.onStatusChange?.(s);
  }

  function setError(msg: string) {
    hub.error = msg;
    hub.status = "error";
    hub.onStatusChange?.("error");
  }

  // Check initial status from deploy server
  fetch(`${DEPLOY_SERVER}/status`)
    .then((r) => r.json())
    .then((data) => {
      if (data.connected) {
        hub.name = data.hub_name || "Pybricks Hub";
        hub.kind = data.hub_kind || null;
        setStatus("connected");
      }
    })
    .catch(() => {});

  return hub;
}
