import { readdirSync, readFileSync, existsSync } from "fs";
import { join, relative } from "path";
import type { State } from "../graph.js";
import type { FileContent } from "../types.js";

// ─── Limits ──────────────────────────────────────────────────────────────────

const MAX_FILE_CHARS = 3_000;
const MAX_TOTAL_CHARS = 28_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFile(
  absPath: string,
  appPath: string,
  maxChars = MAX_FILE_CHARS
): FileContent | null {
  try {
    const raw = readFileSync(absPath, "utf-8");
    const content =
      raw.length > maxChars ? raw.slice(0, maxChars) + "\n// ... (truncated)" : raw;
    return { relativePath: relative(appPath, absPath), content };
  } catch {
    return null;
  }
}

/** Recursively find page.tsx files up to `maxDepth` directory levels. */
function findPageFiles(dir: string, depth = 0, maxDepth = 3): string[] {
  if (depth > maxDepth) return [];
  const results: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const skip = ["node_modules", ".next", "how-it-works", "dist", ".git"];
        if (!skip.includes(entry.name)) {
          results.push(...findPageFiles(full, depth + 1, maxDepth));
        }
      } else if (entry.name === "page.tsx" || entry.name === "page.ts") {
        results.push(full);
      }
    }
  } catch {
    // ignore unreadable dirs
  }
  return results;
}

/** Collect TS/TSX files from a flat directory (max 5). */
function readFlatDir(dir: string, max = 5): string[] {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
      .map((e) => join(dir, e.name))
      .slice(0, max);
  } catch {
    return [];
  }
}

// ─── Node ────────────────────────────────────────────────────────────────────

export async function readNode(state: State): Promise<Partial<State>> {
  const app = state.currentApp!;
  const files: FileContent[] = [];
  let totalChars = 0;

  const add = (absPath: string, maxChars = MAX_FILE_CHARS) => {
    if (totalChars >= MAX_TOTAL_CHARS) return;
    const f = readFile(absPath, app.path, maxChars);
    if (f) {
      files.push(f);
      totalChars += f.content.length;
    }
  };

  // 1. package.json — always (framework, deps, scripts)
  add(join(app.path, "package.json"), 2_000);

  // 2. Config files
  for (const name of [
    "next.config.ts",
    "next.config.js",
    "drizzle.config.ts",
    "middleware.ts",
    "middleware.tsx",
    ".env.example",
    "env.example",
  ]) {
    add(join(app.path, name), 1_500);
  }

  // 3. Root layout
  add(join(app.appDir, "layout.tsx"), 2_000);

  // 4. Home page
  const homePage = join(app.appDir, "page.tsx");
  add(homePage);

  // 5. Other pages (up to 10, skip how-it-works)
  const otherPages = findPageFiles(app.appDir)
    .filter((p) => p !== homePage)
    .slice(0, 10);
  for (const p of otherPages) add(p);

  // 6. Lib / utils / server directories (up to 5 files each, 2 dirs max)
  for (const dir of ["lib", "src/lib", "utils", "src/utils", "server", "src/server"]) {
    for (const p of readFlatDir(join(app.path, dir), 5)) add(p);
    if (files.length > 30) break;
  }

  // 7. API routes (up to 5)
  const apiDir = join(app.appDir, "api");
  for (const p of findPageFiles(apiDir).slice(0, 5)) add(p);

  // 8. Schema / DB files
  for (const dir of ["src/db", "db", "schema"]) {
    for (const p of readFlatDir(join(app.path, dir), 4)) add(p);
  }

  console.log(
    `  📁  Read ${files.length} files  (${Math.round(totalChars / 1_000)}k chars)`
  );
  if (state.verbose) {
    for (const f of files) console.log(`       ${f.relativePath}`);
  }

  return { currentFiles: files };
}
