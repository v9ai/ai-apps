/**
 * Integration tests for POST /api/emails/generate-cf-batch.
 *
 * Mocks the external boundaries (admin auth, db, langgraph-client) and verifies
 * the route stitches them correctly: auth gates, candidate selection, sequential
 * generation, error handling, response shape.
 *
 * Run: pnpm vitest run src/app/api/emails/generate-cf-batch/route.test.ts
 */

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// --- Mocks (must be declared before the route is imported) ---

const mockCheckIsAdmin = vi.fn();
const mockComposeEmail = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("@/lib/admin", () => ({
  checkIsAdmin: () => mockCheckIsAdmin(),
}));

vi.mock("@/lib/langgraph-client", () => ({
  composeEmail: (input: unknown) => mockComposeEmail(input),
}));

vi.mock("@/db", () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  },
}));

// Import AFTER mocks so the route resolves them.
import { POST } from "./route";

// --- Helpers ---

/** Build a chainable Drizzle query mock that resolves to `result` when awaited. */
function buildSelectChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select",
    "from",
    "leftJoin",
    "innerJoin",
    "where",
    "orderBy",
    "limit",
    "offset",
    "groupBy",
    "having",
  ];
  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }
  // Make awaitable
  (chain as { then: unknown }).then = (resolve: (v: unknown) => void) =>
    resolve(result);
  return chain;
}

/** Build a chainable insert().values().returning() mock that resolves to `result`. */
function buildInsertChain(result: unknown[]) {
  const chain: Record<string, unknown> = {};
  chain.values = vi.fn(() => chain);
  chain.returning = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://test.local/api/emails/generate-cf-batch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ALICE = {
  id: 101,
  first_name: "Alice",
  last_name: "Anderson",
  email: "alice@acme.test",
  company_name: "Acme",
};
const BOB = {
  id: 102,
  first_name: "Bob",
  last_name: "Beck",
  email: "bob@beta.test",
  company_name: "Beta",
};

// --- Tests ---

describe("POST /api/emails/generate-cf-batch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not signed in", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: false, userId: null });
    const res = await POST(makeRequest({ count: 5 }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns 403 when signed in but not admin", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: false, userId: 7 });
    const res = await POST(makeRequest({ count: 5 }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "Forbidden" });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("clamps count to [1, 10]", async () => {
    mockCheckIsAdmin.mockResolvedValue({ isAdmin: true, userId: 1 });

    // Try an absurdly large count — should fetch at most 10 candidates.
    const captured: { limit: number | null } = { limit: null };
    const chain = buildSelectChain([]);
    (chain.limit as ReturnType<typeof vi.fn>).mockImplementation((n: number) => {
      captured.limit = n;
      return chain;
    });
    mockSelect.mockReturnValueOnce(chain);

    const res = await POST(makeRequest({ count: 9999 }));
    expect(res.status).toBe(200);
    expect(captured.limit).toBe(10);

    // Non-positive falls back to 1.
    captured.limit = null;
    const chain2 = buildSelectChain([]);
    (chain2.limit as ReturnType<typeof vi.fn>).mockImplementation((n: number) => {
      captured.limit = n;
      return chain2;
    });
    mockSelect.mockReturnValueOnce(chain2);
    await POST(makeRequest({ count: -3 }));
    expect(captured.limit).toBe(1);
  });

  it("defaults to 5 when body has no count", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: true, userId: 1 });
    const captured: { limit: number | null } = { limit: null };
    const chain = buildSelectChain([]);
    (chain.limit as ReturnType<typeof vi.fn>).mockImplementation((n: number) => {
      captured.limit = n;
      return chain;
    });
    mockSelect.mockReturnValueOnce(chain);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(200);
    expect(captured.limit).toBe(5);
  });

  it("generates and persists drafts for each candidate sequentially", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: true, userId: 1 });

    // Candidate query returns Alice + Bob.
    mockSelect.mockReturnValueOnce(buildSelectChain([ALICE, BOB]));

    // Compose returns canned subject/body per call.
    mockComposeEmail
      .mockResolvedValueOnce({ subject: "Hi Alice", body: "Hello Alice…" })
      .mockResolvedValueOnce({ subject: "Hi Bob", body: "Hello Bob…" });

    // Each insert returns a unique id.
    mockInsert
      .mockReturnValueOnce(buildInsertChain([{ id: 9001 }]))
      .mockReturnValueOnce(buildInsertChain([{ id: 9002 }]));

    const res = await POST(makeRequest({ count: 2 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      generated: number;
      draftIds: number[];
      errors: Array<{ contactId: number; error: string }>;
    };
    expect(body).toEqual({
      generated: 2,
      draftIds: [9001, 9002],
      errors: [],
    });

    // composeEmail was called once per candidate, with the recipient name + company.
    expect(mockComposeEmail).toHaveBeenCalledTimes(2);
    expect(mockComposeEmail).toHaveBeenNthCalledWith(1, {
      recipientName: "Alice Anderson",
      companyName: "Acme",
      instructions: expect.stringContaining("cold-outreach"),
    });
    expect(mockComposeEmail).toHaveBeenNthCalledWith(2, {
      recipientName: "Bob Beck",
      companyName: "Beta",
      instructions: expect.stringContaining("cold-outreach"),
    });

    // insert called once per candidate.
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it("captures per-candidate errors and continues with the rest", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: true, userId: 1 });

    mockSelect.mockReturnValueOnce(buildSelectChain([ALICE, BOB]));

    // First call fails (e.g., LangGraph 502), second succeeds.
    mockComposeEmail
      .mockRejectedValueOnce(new Error("LangGraph 502: upstream"))
      .mockResolvedValueOnce({ subject: "Hi Bob", body: "Hello Bob…" });

    mockInsert.mockReturnValueOnce(buildInsertChain([{ id: 9002 }]));

    const res = await POST(makeRequest({ count: 2 }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      generated: number;
      draftIds: number[];
      errors: Array<{ contactId: number; error: string }>;
    };

    expect(body.generated).toBe(1);
    expect(body.draftIds).toEqual([9002]);
    expect(body.errors).toEqual([
      { contactId: ALICE.id, error: "LangGraph 502: upstream" },
    ]);

    // Insert only called once — the failed one was skipped.
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("inserts replyDrafts rows with the cold-outreach shape", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: true, userId: 1 });

    mockSelect.mockReturnValueOnce(buildSelectChain([ALICE]));

    mockComposeEmail.mockResolvedValueOnce({
      subject: "Quick chat?",
      body: "Hi Alice, …",
    });

    const insertChain = buildInsertChain([{ id: 9001 }]);
    mockInsert.mockReturnValueOnce(insertChain);

    await POST(makeRequest({ count: 1 }));

    expect(insertChain.values).toHaveBeenCalledTimes(1);
    const inserted = (insertChain.values as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(inserted).toMatchObject({
      received_email_id: null,
      contact_id: ALICE.id,
      status: "pending",
      draft_type: "outreach",
      subject: "Quick chat?",
      body_text: "Hi Alice, …",
    });
    // generation_model identifies the upstream — currently base Mistral on CF.
    expect(inserted.generation_model).toMatch(/mistral/);
    expect(JSON.parse(inserted.thread_context)).toEqual({ source: "cf-batch" });
  });

  it("returns generated:0 with empty arrays when no candidates match", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: true, userId: 1 });
    mockSelect.mockReturnValueOnce(buildSelectChain([]));

    const res = await POST(makeRequest({ count: 5 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      generated: 0,
      draftIds: [],
      errors: [],
    });
    expect(mockComposeEmail).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("handles malformed JSON body by falling back to default count", async () => {
    mockCheckIsAdmin.mockResolvedValueOnce({ isAdmin: true, userId: 1 });
    const captured: { limit: number | null } = { limit: null };
    const chain = buildSelectChain([]);
    (chain.limit as ReturnType<typeof vi.fn>).mockImplementation((n: number) => {
      captured.limit = n;
      return chain;
    });
    mockSelect.mockReturnValueOnce(chain);

    const req = new NextRequest("http://test.local/api/emails/generate-cf-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(captured.limit).toBe(5);
  });
});
