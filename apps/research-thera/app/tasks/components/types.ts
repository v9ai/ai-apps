// Local Task type used by tasks/* components. Mirrors the GraphQL fragment
// shape — note that GraphQL serializes timestamps as ISO strings.
export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priorityScore: number | null;
  priorityManual: number | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  energyPreference: string | null;
  parentTaskId: string | null;
  position: number;
  completedAt: string | null;
};
