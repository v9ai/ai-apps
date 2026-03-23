import { WebSocketServer } from "ws";
import { watch } from "fs";
import { resolve } from "path";

const PORT = 35729;
const DIST_DIR = resolve(import.meta.dirname, "dist_chrome");

const wss = new WebSocketServer({ port: PORT });

wss.on("listening", () => {
  console.log(`[dev-reload] ws://localhost:${PORT} — watching ${DIST_DIR}`);
});

wss.on("connection", () => {
  console.log("[dev-reload] Extension connected");
});

let debounce: ReturnType<typeof setTimeout> | null = null;

watch(DIST_DIR, { recursive: true }, (_event, filename) => {
  if (!filename || filename.startsWith(".")) return;
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    console.log(`[dev-reload] Build changed (${filename}) — reloading extension`);
    for (const client of wss.clients) {
      client.send("reload");
    }
  }, 300);
});
