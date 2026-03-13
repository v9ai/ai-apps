import { db } from "@/src/db";
import { taskDependencies, tasks } from "@/src/db/schema";
import { eq, and } from "drizzle-orm";

export async function getBlockers(taskId: string) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.blockingTaskId, tasks.id))
    .where(eq(taskDependencies.blockedTaskId, taskId));
}

export async function getBlocked(taskId: string) {
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.blockedTaskId, tasks.id))
    .where(eq(taskDependencies.blockingTaskId, taskId));
}

/**
 * BFS check: would adding blockingTaskId → blockedTaskId create a cycle?
 */
async function wouldCreateCycle(
  blockingTaskId: string,
  blockedTaskId: string
): Promise<boolean> {
  // If blocking → blocked, then blocked shouldn't already reach blocking via existing deps
  const visited = new Set<string>();
  const queue = [blockedTaskId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === blockingTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const downstream = await db
      .select({ blockedTaskId: taskDependencies.blockedTaskId })
      .from(taskDependencies)
      .where(eq(taskDependencies.blockingTaskId, current));

    for (const dep of downstream) {
      queue.push(dep.blockedTaskId);
    }
  }

  return false;
}

export async function addDependency(
  blockingTaskId: string,
  blockedTaskId: string
) {
  if (blockingTaskId === blockedTaskId) {
    throw new Error("A task cannot depend on itself");
  }

  const isCyclic = await wouldCreateCycle(blockingTaskId, blockedTaskId);
  if (isCyclic) {
    throw new Error("Adding this dependency would create a circular reference");
  }

  await db.insert(taskDependencies).values({ blockingTaskId, blockedTaskId });
}

export async function removeDependency(
  blockingTaskId: string,
  blockedTaskId: string
) {
  await db
    .delete(taskDependencies)
    .where(
      and(
        eq(taskDependencies.blockingTaskId, blockingTaskId),
        eq(taskDependencies.blockedTaskId, blockedTaskId)
      )
    );
}
