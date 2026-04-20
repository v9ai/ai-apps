import { parseArgs } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { CONTENT_DIR, getMissingSlugs } from "../src/mastra/lib/catalog";

interface Args {
  slug?: string;
  topic?: string;
  model?: string;
  dryRun: boolean;
  batch: boolean;
  listMissing: boolean;
  update: boolean;
  graph: boolean;
}

function parseCliArgs(): Args {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      topic: { type: "string" },
      model: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      batch: { type: "boolean", default: false },
      "list-missing": { type: "boolean", default: false },
      update: { type: "boolean", default: false },
      graph: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });
  return {
    slug: positionals[0],
    topic: values.topic,
    model: values.model,
    dryRun: Boolean(values["dry-run"]),
    batch: Boolean(values.batch),
    listMissing: Boolean(values["list-missing"]),
    update: Boolean(values.update),
    graph: Boolean(values.graph),
  };
}

async function runSingle(
  slug: string,
  topic: string,
  dryRun: boolean,
): Promise<{ wordCount: number; revisions: number; totalTokens: number }> {
  const { mastra } = await import("../src/mastra");
  const workflow = mastra.getWorkflow("generateArticle");
  const run = await workflow.createRun();
  const result = await run.start({
    inputData: { slug, topic, dryRun },
  });
  if (result.status !== "success") {
    throw new Error(
      `Workflow ${result.status}: ${JSON.stringify((result as { error?: unknown }).error ?? result)}`,
    );
  }
  return {
    wordCount: result.result.wordCount,
    revisions: result.result.revisions,
    totalTokens: result.result.totalTokens,
  };
}

async function runBatch(dryRun: boolean): Promise<void> {
  const missing = getMissingSlugs();
  if (missing.length === 0) {
    console.log("All articles already exist!");
    return;
  }
  console.log(`Missing articles: ${missing.length}`);
  missing.forEach((s) => console.log(`  - ${s}`));
  console.log();

  for (let i = 0; i < missing.length; i++) {
    const slug = missing[i];
    const topic = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    console.log(`[${i + 1}/${missing.length}] Generating: ${slug}`);
    const t0 = Date.now();
    try {
      const r = await runSingle(slug, topic, dryRun);
      const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`  -> ${r.wordCount} words in ${elapsed}s\n`);
    } catch (err) {
      console.log(`  -> FAILED: ${(err as Error).message}\n`);
    }
  }
}

function printGraph() {
  console.log("```mermaid");
  console.log("graph TD");
  console.log("    START((Start)) --> research");
  console.log("    research --> outline");
  console.log("    outline --> draft");
  console.log("    draft --> review");
  console.log("    review --> revise_loop{quality OK?}");
  console.log('    revise_loop -->|"yes"| save');
  console.log('    revise_loop -->|"no, <2 revs"| revise');
  console.log("    revise --> revise_loop");
  console.log("    save --> END((End))");
  console.log("```");
}

async function main() {
  const args = parseCliArgs();

  if (args.model) process.env.LLM_MODEL = args.model;

  if (args.graph) {
    printGraph();
    return;
  }

  if (args.listMissing) {
    const missing = getMissingSlugs();
    if (missing.length === 0) {
      console.log("All articles exist!");
    } else {
      console.log(`Missing articles (${missing.length}):`);
      missing.forEach((s) => console.log(`  ${s}`));
    }
    return;
  }

  if (args.batch) {
    await runBatch(args.dryRun);
    return;
  }

  const slug = args.slug;
  if (!slug) {
    console.error("Error: slug is required (or use --batch / --list-missing)");
    process.exit(1);
  }

  const existingFile = path.join(CONTENT_DIR, `${slug}.md`);
  if (fs.existsSync(existingFile) && !args.dryRun && !args.update) {
    console.log(`Article already exists: ${existingFile}`);
    console.log("Use --update to regenerate, or --dry-run to preview.");
    return;
  }

  const topic =
    args.topic ??
    slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const model = process.env.LLM_MODEL ?? "deepseek-chat";
  const action = fs.existsSync(existingFile) ? "Updating" : "Generating";
  console.log(`${action}: ${topic} (${slug})`);
  console.log(`Model:      ${model}`);
  console.log(
    `Pipeline:   research -> outline -> draft -> review -> [revise loop] -> save`,
  );
  console.log();

  const t0 = Date.now();
  const r = await runSingle(slug, topic, args.dryRun);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(
    `\nDone! ${r.wordCount} words, ${r.revisions} revisions, ${r.totalTokens.toLocaleString()} tokens, ${elapsed}s`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
