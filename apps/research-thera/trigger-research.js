import { tasks } from "@trigger.dev/sdk/v3";
import { d1Tools } from "./src/db/index.js";
import { randomUUID } from "crypto";

async function main() {
  const goalId = 5;
  const userEmail = "nicolai.vadim@gmail.com";
  const jobId = randomUUID();

  console.log(`Creating generation job ${jobId} for goal ${goalId}`);
  await d1Tools.createGenerationJob(jobId, userEmail, "RESEARCH", goalId);

  console.log(`Triggering generate-research task...`);
  await tasks.trigger("generate-research", {
    jobId,
    goalId,
    userId: userEmail,
    userEmail,
  });

  console.log(`Research generation started. Job ID: ${jobId}`);
  console.log(`You can monitor progress via the generation_jobs table.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});