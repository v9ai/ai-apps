import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_gmqcwyqsqcnkjnlqcmxf",
  dirs: ["./src/trigger"],
  maxDuration: 300, // 5 minutes — enough for long TTS jobs
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true,
    },
  },
});
