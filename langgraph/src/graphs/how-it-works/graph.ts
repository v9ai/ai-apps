import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import type { AppInfo, FileContent, HowItWorksData, ProcessResult } from "./types.js";
import { scanNode } from "./nodes/scan.js";
import { processNextNode } from "./nodes/process-next.js";
import { readNode } from "./nodes/read.js";
import { analyzeNode } from "./nodes/analyze.js";
import { generateNode } from "./nodes/generate.js";
import { writeNode } from "./nodes/write.js";

// ─── State ───────────────────────────────────────────────────────────────────

const StateAnnotation = Annotation.Root({
  // Queue of apps waiting to be processed
  pendingApps: Annotation<AppInfo[]>(),
  // Currently processing
  currentApp: Annotation<AppInfo | null>(),
  currentFiles: Annotation<FileContent[]>(),
  currentAnalysis: Annotation<string>(),
  currentData: Annotation<HowItWorksData | null>(),
  // Accumulated results (appended by reducer)
  results: Annotation<ProcessResult[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  // Config
  dryRun: Annotation<boolean>(),
  verbose: Annotation<boolean>(),
  // Optional single-app filter
  filterApp: Annotation<string | null>(),
});

export type State = typeof StateAnnotation.State;

// ─── Routing ─────────────────────────────────────────────────────────────────

function routeAfterProcessNext(state: State): string {
  if (state.currentApp == null) return END;
  // In dry-run mode skip read/analyze/generate — jump straight to write
  return state.dryRun ? "write" : "read";
}

// ─── Graph ───────────────────────────────────────────────────────────────────

export function buildHowItWorksGraph() {
  return new StateGraph(StateAnnotation)
    .addNode("scan", scanNode)
    .addNode("processNext", processNextNode)
    .addNode("read", readNode)
    .addNode("analyze", analyzeNode)
    .addNode("generate", generateNode)
    .addNode("write", writeNode)
    .addEdge(START, "scan")
    .addEdge("scan", "processNext")
    .addConditionalEdges("processNext", routeAfterProcessNext, {
      read: "read",
      write: "write",
      [END]: END,
    })
    .addEdge("read", "analyze")
    .addEdge("analyze", "generate")
    .addEdge("generate", "write")
    .addEdge("write", "processNext")
    .compile();
}
