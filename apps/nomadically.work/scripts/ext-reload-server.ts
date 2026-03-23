import { WebSocketServer } from "ws";
import { watch } from "fs";
import { resolve } from "path";

const PORT = 35729;
const DIST_DIR = resolve(import.meta.dirname, "../chrome-extension/dist_chrome");

const wss = new WebSocketServer({ port: PORT });

wss.on("listening", () => {
  console.log(`[ext-reload] ws://localhost:${PORT} — watching ${DIST_DIR}`);
});

let debounce: ReturnType<typeof setTimeout> | null = null;
watch(DIST_DIR, { recursive: true }, (_event, filename) => {
  if (!filename || filename.startsWith(".")) return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log(`[ext-reload] ${filename} changed — reloading extension`);
    wss.clients.forEach((client) => client.send("reload"));
  }, 300);
});
