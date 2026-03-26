import type { GraphQLContext } from "../../context";

export async function uploadResume(
  _parent: any,
  args: { email: string; resumePdf: string; filename: string },
  context: GraphQLContext,
) {
  if (!context.userId) {
    throw new Error("Unauthorized");
  }

  // Resume processing pipeline not connected
  return {
    success: false,
    job_id: null,
    tier: "direct",
    status: "UNAVAILABLE",
  };
}
