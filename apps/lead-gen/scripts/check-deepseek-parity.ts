#!/usr/bin/env tsx
/**
 * DeepSeek model catalog parity check.
 *
 * Three files must agree on DeepSeek model IDs / prices / notes:
 *   1. src/lib/deepseek/constants.ts          (TS — DEEPSEEK_MODELS)
 *   2. backend/leadgen_agent/llm.py           (Python — DEEPSEEK_MODELS dict)
 *   3. backend/_shared/deepseek-constants.js  (JS — DEEPSEEK_PRO / DEEPSEEK_FLASH)
 *
 * If any of them drifts, telemetry costs go silently wrong. This script
 * parses the Python and JS files as text (regex over a static literal —
 * fine for this shape) and compares them to the TS source of truth.
 *
 * Usage:
 *   pnpm check:deepseek-parity
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { DEEPSEEK_MODELS as TS_MODELS } from "../src/lib/deepseek/constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..");

const PY_PATH = join(REPO_ROOT, "backend/leadgen_agent/llm.py");
const JS_PATH = join(REPO_ROOT, "backend/_shared/deepseek-constants.js");

// ── parsing helpers ────────────────────────────────────────────────────────

interface ModelEntry {
  id: string;
  inputPer1M: number;
  outputPer1M: number;
  note: string;
}

function parsePython(): { flash: ModelEntry; pro: ModelEntry } {
  const src = readFileSync(PY_PATH, "utf8");

  const flashIdMatch = src.match(/^DEEPSEEK_FLASH\s*=\s*"([^"]+)"/m);
  const proIdMatch = src.match(/^DEEPSEEK_PRO\s*=\s*"([^"]+)"/m);
  if (!flashIdMatch || !proIdMatch) {
    throw new Error(
      `Could not locate DEEPSEEK_FLASH / DEEPSEEK_PRO string consts in ${PY_PATH}`,
    );
  }
  const flashId = flashIdMatch[1];
  const proId = proIdMatch[1];

  // Extract each model's body — keyed by the const name (DEEPSEEK_FLASH / DEEPSEEK_PRO).
  const blockFor = (constName: string): string => {
    const re = new RegExp(
      `${constName}\\s*:\\s*\\{([\\s\\S]*?)\\}`,
      "m",
    );
    const m = src.match(re);
    if (!m) {
      throw new Error(`Could not find dict block for ${constName} in ${PY_PATH}`);
    }
    return m[1];
  };

  const parseBody = (body: string, label: string): Omit<ModelEntry, "id"> => {
    const inputMatch = body.match(/"input_per_1m"\s*:\s*([\d.]+)/);
    const outputMatch = body.match(/"output_per_1m"\s*:\s*([\d.]+)/);
    const noteMatch = body.match(/"note"\s*:\s*"([^"]*)"/);
    if (!inputMatch || !outputMatch || !noteMatch) {
      throw new Error(`Could not parse ${label} fields in ${PY_PATH}`);
    }
    return {
      inputPer1M: Number(inputMatch[1]),
      outputPer1M: Number(outputMatch[1]),
      note: noteMatch[1],
    };
  };

  return {
    flash: { id: flashId, ...parseBody(blockFor("DEEPSEEK_FLASH"), "flash") },
    pro: { id: proId, ...parseBody(blockFor("DEEPSEEK_PRO"), "pro") },
  };
}

function parseJs(): { flash: string; pro: string } {
  const src = readFileSync(JS_PATH, "utf8");
  const flashMatch = src.match(
    /export\s+const\s+DEEPSEEK_FLASH\s*=\s*"([^"]+)"/,
  );
  const proMatch = src.match(
    /export\s+const\s+DEEPSEEK_PRO\s*=\s*"([^"]+)"/,
  );
  if (!flashMatch || !proMatch) {
    throw new Error(
      `Could not locate DEEPSEEK_FLASH / DEEPSEEK_PRO exports in ${JS_PATH}`,
    );
  }
  return { flash: flashMatch[1], pro: proMatch[1] };
}

// ── comparison ─────────────────────────────────────────────────────────────

const failures: string[] = [];
const successes: string[] = [];

function check(label: string, ok: boolean, msgOnFail: string, msgOnPass: string) {
  if (ok) {
    successes.push(`OK  ${label}: ${msgOnPass}`);
  } else {
    failures.push(`FAIL ${label}: ${msgOnFail}`);
  }
}

const py = parsePython();
const js = parseJs();

// ID parity across all three files
for (const key of ["flash", "pro"] as const) {
  const tsId = TS_MODELS[key].id;
  const pyId = py[key].id;
  const jsId = key === "flash" ? js.flash : js.pro;
  const allMatch = tsId === pyId && pyId === jsId;
  check(
    `${key.padEnd(5)} id`,
    allMatch,
    `TS="${tsId}", Python="${pyId}", JS="${jsId}"`,
    `"${tsId}" — TS, Python (llm.py), JS (_shared) all match`,
  );
}

// Price parity TS vs Python
for (const key of ["flash", "pro"] as const) {
  const ts = TS_MODELS[key];
  const p = py[key];
  const inputMatch = ts.inputPer1M === p.inputPer1M;
  const outputMatch = ts.outputPer1M === p.outputPer1M;
  check(
    `${key.padEnd(5)} pricing`,
    inputMatch && outputMatch,
    `TS=$${ts.inputPer1M}/$${ts.outputPer1M}, Python=$${p.inputPer1M}/$${p.outputPer1M}`,
    `input $${ts.inputPer1M.toFixed(2)}, output $${ts.outputPer1M.toFixed(2)} (TS == Python)`,
  );
}

// Note parity TS vs Python
for (const key of ["flash", "pro"] as const) {
  const ts = TS_MODELS[key];
  const p = py[key];
  check(
    `${key.padEnd(5)} note`,
    ts.note === p.note,
    `TS="${ts.note}" vs Python="${p.note}"`,
    `matches`,
  );
}

// ── output ─────────────────────────────────────────────────────────────────

for (const line of successes) console.log(line);

if (failures.length > 0) {
  console.error("");
  for (const line of failures) console.error(line);
  console.error("");
  console.error(
    "DeepSeek model catalog drift detected. Update the offending file so all three sources agree.",
  );
  process.exit(1);
}

console.log("DeepSeek model catalog is in sync across TS / Python / JS.");
