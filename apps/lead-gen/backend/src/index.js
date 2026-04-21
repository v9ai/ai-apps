import { Container, getContainer } from "@cloudflare/containers";

export class LeadgenContainer extends Container {
  defaultPort = 7860;
  sleepAfter = "10m";

  constructor(ctx, env) {
    super(ctx, env);
    this.envVars = {
      DATABASE_URL: env.DATABASE_URL ?? "",
      NEON_DATABASE_URL: env.NEON_DATABASE_URL ?? "",
      DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY ?? "",
      LANGGRAPH_AUTH_TOKEN: env.LANGGRAPH_AUTH_TOKEN ?? "",
      LLM_BASE_URL: env.LLM_BASE_URL ?? "https://api.deepseek.com",
      LLM_MODEL: env.LLM_MODEL ?? "deepseek-chat",
    };
  }
}

const SCORE_SYSTEM = `You rate B2B sales contacts on fit for outreach. Output strict JSON only, no prose.
Schema: {"tier": "A"|"B"|"C"|"D", "score": number in [0,1], "reasons": string[] (1-3 items)}
Tier rubric:
- A: decision-maker at ICP-fit company, strong signal (title, past roles, technical depth)
- B: influencer or junior decision-maker; clear buying role but not final authority
- C: relevant but indirect (adjacent role, unclear authority)
- D: wrong role / wrong company / low signal / likely bounce`;

function bearerOk(request, env) {
  const expected = env.LANGGRAPH_AUTH_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") ?? "";
  const [scheme, token] = auth.split(" ");
  return scheme?.toLowerCase() === "bearer" && token === expected;
}

async function handleScoreContact(request, env) {
  if (!bearerOk(request, env)) {
    return new Response(JSON.stringify({ detail: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  if (!env.CF_LORA_FINETUNE_ID) {
    return new Response(
      JSON.stringify({ detail: "LoRA not deployed yet; set CF_LORA_FINETUNE_ID" }),
      { status: 503, headers: { "content-type": "application/json" } },
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ detail: "Invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const profile = typeof body?.profile === "string" ? body.profile : "";
  if (!profile) {
    return new Response(JSON.stringify({ detail: "Missing 'profile' string" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const aiResp = await env.AI.run(env.CF_LORA_BASE_MODEL, {
    lora: env.CF_LORA_FINETUNE_ID,
    messages: [
      { role: "system", content: SCORE_SYSTEM },
      { role: "user", content: profile },
    ],
    response_format: { type: "json_object" },
    max_tokens: 256,
  });
  const raw = typeof aiResp?.response === "string" ? aiResp.response : JSON.stringify(aiResp);
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ detail: "LoRA returned non-JSON", raw }), {
      status: 502,
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/score_contact" && request.method === "POST") {
      return handleScoreContact(request, env);
    }
    return getContainer(env.CONTAINER).fetch(request);
  },
};
