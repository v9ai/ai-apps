import { readdirSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import type { State } from "../graph.js";
import type { AppInfo } from "../types.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function detectFramework(appPath: string): AppInfo["framework"] {
  try {
    const raw = readFileSync(join(appPath, "package.json"), "utf-8");
    const pkg = JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps["next"]) return "nextjs";
    if (deps["@docusaurus/core"]) return "docusaurus";
  } catch {
    // no package.json or parse error
  }
  return "unknown";
}

function detectAppDir(appPath: string): string | null {
  // Prefer src/app/ if both exist (nomadically.work pattern)
  if (existsSync(join(appPath, "src", "app"))) return join(appPath, "src", "app");
  if (existsSync(join(appPath, "app"))) return join(appPath, "app");
  return null;
}

// ─── Node ────────────────────────────────────────────────────────────────────

export async function scanNode(state: State): Promise<Partial<State>> {
  // Run from the langgraph/ directory — apps are one level up
  const appsRoot = resolve(process.cwd(), "../apps");

  console.log(`\n🔍  Scanning apps in ${appsRoot}\n`);

  const entries = readdirSync(appsRoot, { withFileTypes: true });
  const apps: AppInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const appPath = join(appsRoot, entry.name);

    // Filter to a single app when --app flag is passed
    if (state.filterApp && entry.name !== state.filterApp) continue;

    const framework = detectFramework(appPath);

    if (framework === "docusaurus") {
      console.log(`  ⏭   ${entry.name.padEnd(24)} docusaurus — skip`);
      continue;
    }
    if (framework === "unknown") {
      console.log(`  ⏭   ${entry.name.padEnd(24)} unknown framework — skip`);
      continue;
    }

    const appDir = detectAppDir(appPath);
    if (!appDir) {
      console.log(`  ⏭   ${entry.name.padEnd(24)} no app/ directory — skip`);
      continue;
    }

    const hasHowItWorks = existsSync(join(appDir, "how-it-works", "page.tsx"));
    const relAppDir = appDir.replace(appPath, "");

    console.log(
      `  ✓   ${entry.name.padEnd(24)} nextjs | ${relAppDir.padEnd(8)} | how-it-works: ${hasHowItWorks ? "exists" : "new"}`
    );

    apps.push({ name: entry.name, path: appPath, appDir, hasHowItWorks, framework });
  }

  console.log(`\n  Found ${apps.length} app(s) to process.\n`);

  return { pendingApps: apps };
}
