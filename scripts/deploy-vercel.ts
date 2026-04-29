import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const IGNORE = join(ROOT, ".vercelignore");
const BAK = join(ROOT, ".vercelignore.bak");

const APPS_DIR = join(ROOT, "apps");
const PKGS_DIR = join(ROOT, "packages");

const [, , target, ...vercelArgs] = process.argv;

if (!target) {
  console.error("Usage: tsx scripts/deploy-vercel.ts <app-slug> [vercel args...]");
  process.exit(2);
}

const targetPkgPath = join(APPS_DIR, target, "package.json");
if (!existsSync(targetPkgPath)) {
  console.error(`Cannot find ${targetPkgPath}`);
  process.exit(2);
}

const targetPkg = JSON.parse(readFileSync(targetPkgPath, "utf8"));
const allDeps: Record<string, string> = {
  ...(targetPkg.dependencies ?? {}),
  ...(targetPkg.devDependencies ?? {}),
};

const usedPackageDirs = new Set<string>();
for (const [name, version] of Object.entries(allDeps)) {
  if (typeof version === "string" && version.startsWith("workspace:") && name.startsWith("@ai-apps/")) {
    usedPackageDirs.add(name.slice("@ai-apps/".length));
  }
}

const ALL_APPS = readdirSafe(APPS_DIR);
const ALL_PACKAGES = readdirSafe(PKGS_DIR);

const appsToExclude = ALL_APPS.filter((a) => a !== target);
const packagesToExclude = ALL_PACKAGES.filter((p) => !usedPackageDirs.has(p));

const original = readFileSync(IGNORE, "utf8");
const appendedLines = [
  "",
  `# --- auto-appended by scripts/deploy-vercel.ts for target=${target} ---`,
  "# Other apps not depended on by the deploy target",
  ...appsToExclude.map((a) => `apps/${a}`),
  "# Workspace packages not depended on by the deploy target",
  ...packagesToExclude.map((p) => `packages/${p}`),
  "",
];
const extended = original.replace(/\n*$/, "\n") + appendedLines.join("\n");

renameSync(IGNORE, BAK);
writeFileSync(IGNORE, extended);

let restored = false;
const restore = () => {
  if (restored) return;
  restored = true;
  if (existsSync(BAK)) {
    renameSync(BAK, IGNORE);
  }
};
process.on("exit", restore);
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP", "SIGQUIT"] as const) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}

console.error(
  `[deploy-vercel] target=${target} excluding ${appsToExclude.length} apps + ${packagesToExclude.length} packages`,
);

const result = spawnSync("vercel", ["deploy", "--prod", ...vercelArgs], {
  stdio: "inherit",
  env: process.env,
});

restore();
process.exit(result.status ?? 1);

function readdirSafe(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name);
  } catch {
    return [];
  }
}
