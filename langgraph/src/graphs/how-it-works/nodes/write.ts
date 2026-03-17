import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import type { State } from "../graph.js";
import type { HowItWorksData, PaperData, AgentData, StatData, ProcessResult } from "../types.js";

// ─── Code generators ─────────────────────────────────────────────────────────

function paperToTS(p: PaperData): string {
  const lines = [
    `    slug: ${JSON.stringify(p.slug)},`,
    `    number: ${p.number},`,
    `    title: ${JSON.stringify(p.title)},`,
    `    category: ${JSON.stringify(p.category)},`,
    `    wordCount: 0,`,
    `    readingTimeMin: ${p.readingTimeMin ?? 2},`,
  ];
  if (p.authors) lines.push(`    authors: ${JSON.stringify(p.authors)},`);
  if (p.year) lines.push(`    year: ${p.year},`);
  if (p.venue) lines.push(`    venue: ${JSON.stringify(p.venue)},`);
  if (p.finding) lines.push(`    finding: ${JSON.stringify(p.finding)},`);
  if (p.relevance) lines.push(`    relevance: ${JSON.stringify(p.relevance)},`);
  if (p.url) lines.push(`    url: ${JSON.stringify(p.url)},`);
  if (p.categoryColor) lines.push(`    categoryColor: ${JSON.stringify(p.categoryColor)},`);
  return `  {\n${lines.join("\n")}\n  }`;
}

function agentToTS(a: AgentData): string {
  const lines = [
    `    name: ${JSON.stringify(a.name)},`,
    `    description: ${JSON.stringify(a.description)},`,
  ];
  if (a.researchBasis) lines.push(`    researchBasis: ${JSON.stringify(a.researchBasis)},`);
  if (a.paperIndices?.length) lines.push(`    paperIndices: [${a.paperIndices.join(", ")}],`);
  return `  {\n${lines.join("\n")}\n  }`;
}

function statToTS(s: StatData): string {
  const lines = [
    `    number: ${JSON.stringify(s.number)},`,
    `    label: ${JSON.stringify(s.label)},`,
  ];
  if (s.source) lines.push(`    source: ${JSON.stringify(s.source)},`);
  if (s.paperIndex != null) lines.push(`    paperIndex: ${s.paperIndex},`);
  return `  {\n${lines.join("\n")}\n  }`;
}

function generateDataTsx(data: HowItWorksData): string {
  const papersStr = data.papers.map(paperToTS).join(",\n");
  const statsStr = (data.stats ?? []).map(statToTS).join(",\n");
  const agentsStr = (data.agents ?? []).map(agentToTS).join(",\n");
  const sectionsStr = (data.extraSections ?? [])
    .map(
      (s) =>
        `  {\n    heading: ${JSON.stringify(s.heading)},\n    content: ${JSON.stringify(s.content)},\n  }`
    )
    .join(",\n");

  return `import type { Paper, PipelineAgent, Stat } from "@ai-apps/ui/how-it-works";

// ─── Technical Foundations ──────────────────────────────────────────

export const papers: Paper[] = [
${papersStr},
];

// ─── Key Metrics ───────────────────────────────────────────────────

export const researchStats: Stat[] = [
${statsStr},
];

// ─── Pipeline Stages ───────────────────────────────────────────────

export const pipelineAgents: PipelineAgent[] = [
${agentsStr},
];

// ─── Narrative ─────────────────────────────────────────────────────

export const story =
  ${JSON.stringify(data.story)};

// ─── Deep-Dive Sections ────────────────────────────────────────────

export const extraSections: { heading: string; content: string }[] = [
${sectionsStr},
];
`;
}

function toDisplayName(appName: string): string {
  return appName
    .split(/[-_.]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function generateClientTsx(data: HowItWorksData): string {
  return `"use client";

import type { CSSProperties } from "react";
import { HowItWorks } from "@ai-apps/ui/how-it-works";
import { papers, researchStats, pipelineAgents, story, extraSections } from "./data";

const rule: CSSProperties = {
  border: "none",
  borderTop: "1px solid var(--gray-a3, rgba(0,0,0,0.08))",
  margin: "2.5rem 0",
};

export function HowItWorksClient() {
  return (
    <HowItWorks
      papers={papers}
      title="How It Works"
      subtitle={${JSON.stringify(data.subtitle)}}
      stats={researchStats}
      agents={pipelineAgents}
      story={story}
    >
      {extraSections.map((section, i) => (
        <div key={i}>
          <hr style={rule} />
          <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.75rem" }}>
            {section.heading}
          </h3>
          <p>{section.content}</p>
        </div>
      ))}
    </HowItWorks>
  );
}
`;
}

function generatePageTsx(data: HowItWorksData, appName: string): string {
  const displayName = toDisplayName(appName);
  return `import type { Metadata } from "next";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | ${displayName}",
  description: ${JSON.stringify(data.subtitle)},
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
`;
}

// ─── Ensure @ai-apps/ui dependency ───────────────────────────────────────────

/** Returns true if package.json was modified. */
function ensureUiDep(appPath: string): boolean {
  const pkgPath = join(appPath, "package.json");
  try {
    const raw = readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
    };
    if (pkg.dependencies?.["@ai-apps/ui"]) return false;

    pkg.dependencies = pkg.dependencies ?? {};
    pkg.dependencies["@ai-apps/ui"] = "workspace:*";
    // Re-sort alphabetically
    pkg.dependencies = Object.fromEntries(
      Object.entries(pkg.dependencies).sort(([a], [b]) => a.localeCompare(b))
    );
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    return true;
  } catch {
    return false;
  }
}

// ─── Node ────────────────────────────────────────────────────────────────────

export async function writeNode(state: State): Promise<Partial<State>> {
  const app = state.currentApp!;
  const howItWorksDir = join(app.appDir, "how-it-works");
  const action = app.hasHowItWorks ? "updated" : "written";

  if (state.dryRun) {
    const needs = app.hasHowItWorks ? "update" : "create";
    console.log(`  📝  [DRY RUN] Would ${needs}: ${howItWorksDir}/`);
    console.log(`         data.tsx  |  how-it-works-client.tsx  |  page.tsx`);
    return { results: [{ appName: app.name, status: action }] };
  }

  const data = state.currentData!;

  try {
    mkdirSync(howItWorksDir, { recursive: true });

    const files = [
      { name: "data.tsx", content: generateDataTsx(data) },
      { name: "how-it-works-client.tsx", content: generateClientTsx(data) },
      { name: "page.tsx", content: generatePageTsx(data, app.name) },
    ];

    const writtenPaths: string[] = [];
    for (const { name, content } of files) {
      const filePath = join(howItWorksDir, name);
      writeFileSync(filePath, content, "utf-8");
      writtenPaths.push(filePath);
      console.log(`  ✓   ${action === "updated" ? "↺" : "+"} ${name}`);
    }

    const addedUi = ensureUiDep(app.path);
    if (addedUi) {
      console.log(`  📦  Added @ai-apps/ui to package.json — run pnpm install to link`);
    }

    const result: ProcessResult = { appName: app.name, status: action, files: writtenPaths };
    return { results: [result] };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`  ✗   Error: ${error}`);
    return { results: [{ appName: app.name, status: "error", error }] };
  }
}
