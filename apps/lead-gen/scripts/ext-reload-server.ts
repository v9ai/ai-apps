import { WebSocketServer } from "ws";
import { watch } from "fs";
import { resolve } from "path";

const PORT = 35729;
const DIST_DIR = resolve(import.meta.dirname, "../chrome-extension/dist_chrome");

const wss = new WebSocketServer({ port: PORT });

wss.on("listening", () => {
  console.log(`[ext-reload] ws://localhost:${PORT} — watching ${DIST_DIR}`);
});

wss.on("connection", () => {
  console.log(`[ext-reload] Extension connected (${wss.clients.size} client(s))`);
});

let debounce: ReturnType<typeof setTimeout> | null = null;
watch(DIST_DIR, { recursive: true }, (_event, filename) => {
  if (!filename || filename.startsWith(".")) return;
  // Skip source maps and non-essential files
  if (filename.endsWith(".map")) return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    if (wss.clients.size === 0) return;
    console.log(`[ext-reload] ${filename} changed — reloading ${wss.clients.size} client(s)`);
    wss.clients.forEach((client) => client.send("reload"));
  }, 500);
});
