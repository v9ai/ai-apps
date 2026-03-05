"use server";

export async function getFindings(_filters?: {
  type?: string;
  severity?: string;
}) {
  const { getDemoFindings } = await import("@/lib/demo-data");
  return getDemoFindings();
}
