#!/usr/bin/env node
import { readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), ".mastra", "output");
if (!existsSync(OUT_DIR)) {
  console.error(`[stub-worker-chunks] ${OUT_DIR} not found — run mastra build first`);
  process.exit(1);
}

const stubs = [
  { match: /^o200k_base\.mjs$/, content: "export default {};\n" },
  {
    match: /^probe-image-size-.*\.mjs$/,
    content: 'export default function probe() { throw new Error("probe-image-size stubbed for CF Worker size"); }\n',
  },
];

let replaced = 0;
for (const file of readdirSync(OUT_DIR)) {
  for (const s of stubs) {
    if (s.match.test(file)) {
      writeFileSync(join(OUT_DIR, file), s.content);
      console.log(`[stub-worker-chunks] stubbed ${file}`);
      replaced++;
    }
  }
}
if (replaced === 0) console.warn("[stub-worker-chunks] no matching chunks found");
