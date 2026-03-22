import type { State } from "../graph.js";

export async function processNextNode(state: State): Promise<Partial<State>> {
  const [next, ...rest] = state.pendingApps;

  if (!next) {
    // No more apps — signal END via currentApp: null
    return { currentApp: null, pendingApps: [] };
  }

  console.log(`\n${"━".repeat(58)}`);
  console.log(`  Processing: ${next.name}`);
  console.log(`${"━".repeat(58)}\n`);

  return {
    currentApp: next,
    pendingApps: rest,
    // Reset transient per-app state
    currentFiles: [],
    currentAnalysis: "",
    currentData: null,
  };
}
