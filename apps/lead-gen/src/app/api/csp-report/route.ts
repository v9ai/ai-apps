export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const body = contentType.includes("json") ? await req.json() : await req.text();
    // Log to Vercel function logs — zero retention, zero db writes
    console.warn("[csp-report]", JSON.stringify(body).slice(0, 2000));
  } catch (e) {
    console.warn("[csp-report] parse-failed", e);
  }
  return new Response(null, { status: 204 });
}
