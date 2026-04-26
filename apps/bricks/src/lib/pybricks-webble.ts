// Web Bluetooth client for an already-running Pybricks hub.
// Read-only: subscribes to the Pybricks command/event characteristic and
// surfaces stdout written by the running script via WriteAppData events.
//
// Pybricks Profile reference:
//   https://github.com/pybricks/technical-info/blob/master/pybricks-ble.md

const PYBRICKS_SERVICE_UUID =
  "c5f50001-8280-46da-89f4-6d8051e4aeef";
const PYBRICKS_COMMAND_EVENT_CHAR_UUID =
  "c5f50002-8280-46da-89f4-6d8051e4aeef";

// Event ID for stdout chunks delivered as notifications on the
// command/event characteristic.
const EVENT_WRITE_APP_DATA = 0x01;

export type BleState =
  | "idle"
  | "unsupported"
  | "connecting"
  | "connected"
  | "error";

export interface PybricksBleConn {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onStdout: ((text: string) => void) | null;
  onState: ((s: BleState, error?: string) => void) | null;
  state: BleState;
  deviceName: string | null;
  error: string | null;
}

export function isWebBluetoothSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { bluetooth?: unknown }).bluetooth !==
      "undefined"
  );
}

export function createPybricksBle(): PybricksBleConn {
  const decoder = new TextDecoder();
  let device: BluetoothDevice | null = null;
  let server: BluetoothRemoteGATTServer | null = null;
  let charac: BluetoothRemoteGATTCharacteristic | null = null;

  const conn: PybricksBleConn = {
    state: "idle",
    deviceName: null,
    error: null,
    onStdout: null,
    onState: null,

    async connect() {
      if (!isWebBluetoothSupported()) {
        setState("unsupported", "Web Bluetooth is not available in this browser. Use Chrome or Edge.");
        return;
      }

      setState("connecting");
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ services: [PYBRICKS_SERVICE_UUID] }],
          optionalServices: [PYBRICKS_SERVICE_UUID],
        });
        conn.deviceName = device.name ?? "Pybricks Hub";

        device.addEventListener("gattserverdisconnected", onDisconnected);

        if (!device.gatt) throw new Error("Hub has no GATT server.");
        server = await device.gatt.connect();

        const service = await server.getPrimaryService(PYBRICKS_SERVICE_UUID);
        charac = await service.getCharacteristic(
          PYBRICKS_COMMAND_EVENT_CHAR_UUID,
        );

        charac.addEventListener(
          "characteristicvaluechanged",
          onCharacteristicValueChanged,
        );
        await charac.startNotifications();

        setState("connected");
      } catch (e) {
        const msg = friendlyError(e);
        setState("error", msg);
      }
    },

    async disconnect() {
      try {
        if (charac) {
          charac.removeEventListener(
            "characteristicvaluechanged",
            onCharacteristicValueChanged,
          );
          try {
            await charac.stopNotifications();
          } catch {
            // ignore — disconnect path
          }
        }
      } finally {
        charac = null;
      }
      if (device) {
        device.removeEventListener("gattserverdisconnected", onDisconnected);
        if (device.gatt?.connected) device.gatt.disconnect();
      }
      device = null;
      server = null;
      conn.deviceName = null;
      setState("idle");
    },
  };

  function setState(s: BleState, error?: string) {
    conn.state = s;
    conn.error = error ?? null;
    conn.onState?.(s, error);
  }

  function onDisconnected() {
    charac = null;
    server = null;
    setState("idle");
  }

  function onCharacteristicValueChanged(ev: Event) {
    const target = ev.target as BluetoothRemoteGATTCharacteristic;
    const dv = target.value;
    if (!dv || dv.byteLength < 1) return;
    const eventId = dv.getUint8(0);
    if (eventId !== EVENT_WRITE_APP_DATA) return;

    const offset = dv.byteOffset + 1;
    const length = dv.byteLength - 1;
    if (length <= 0) return;
    const bytes = new Uint8Array(dv.buffer, offset, length);
    const text = decoder.decode(bytes, { stream: true });
    if (text) conn.onStdout?.(text);
  }

  return conn;
}

function friendlyError(e: unknown): string {
  if (e instanceof DOMException) {
    if (e.name === "NotFoundError") {
      return "No hub picked. Click Connect again and choose your Pybricks Hub.";
    }
    if (e.name === "SecurityError") {
      return "Web Bluetooth blocked. The page must be served over HTTPS or localhost.";
    }
    if (e.name === "NetworkError") {
      return "Could not connect to the hub. Make sure it's powered on and the script is running.";
    }
    return `${e.name}: ${e.message}`;
  }
  if (e instanceof Error) return e.message;
  return String(e);
}
