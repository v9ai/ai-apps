import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockGoal, mockCharacteristic } from "@/test/fixtures/storyGraph";

// Mock d1Tools
vi.mock("@/src/db", () => ({
  d1Tools: {
    getGoal: vi.fn(),
    getCharacteristic: vi.fn(),
  },
}));

// Mock runStoryGraph
vi.mock("@/src/graphs/generateStory", () => ({
  runStoryGraph: vi.fn(),
}));

import { generateLongFormText } from "../generateLongFormText";
import { d1Tools } from "@/src/db";
import { runStoryGraph } from "@/src/graphs/generateStory";

const mockedD1 = vi.mocked(d1Tools);
const mockedRunStoryGraph = vi.mocked(runStoryGraph);

function makeCtx(overrides: Partial<{ userEmail: string; userId: string }> = {}) {
  return {
    userEmail: overrides.userEmail,
    userId: overrides.userId ?? "user_123",
  } as any;
}

function makeArgs(overrides: Partial<{
  goalId: number;
  characteristicId: number | null;
  language: string | null;
  minutes: number | null;
}> = {}) {
  return {
    goalId: overrides.goalId ?? 1,
    characteristicId: overrides.characteristicId ?? null,
    language: overrides.language ?? null,
    minutes: overrides.minutes ?? null,
  };
}

describe("generateLongFormText resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedD1.getGoal.mockResolvedValue(mockGoal as any);
    mockedD1.getCharacteristic.mockResolvedValue(null as any);
    mockedRunStoryGraph.mockResolvedValue({ storyId: 42, text: "Story text" });
  });

  it("throws 'Authentication required' when ctx.userEmail is undefined", async () => {
    await expect(
      generateLongFormText({}, makeArgs(), makeCtx(), {} as any),
    ).rejects.toThrow("Authentication required");
  });

  it("throws when goal does not exist", async () => {
    mockedD1.getGoal.mockRejectedValue(new Error("Goal not found"));

    await expect(
      generateLongFormText(
        {},
        makeArgs(),
        makeCtx({ userEmail: "user@test.com" }),
        {} as any,
      ),
    ).rejects.toThrow("Goal not found");
  });

  it("throws SAFEGUARDING_ALERT when riskTier is SAFEGUARDING_ALERT", async () => {
    mockedD1.getCharacteristic.mockResolvedValue({
      ...mockCharacteristic,
      riskTier: "SAFEGUARDING_ALERT",
    } as any);

    await expect(
      generateLongFormText(
        {},
        makeArgs({ characteristicId: 3 }),
        makeCtx({ userEmail: "user@test.com" }),
        {} as any,
      ),
    ).rejects.toThrow("SAFEGUARDING_ALERT");
  });

  it("returns { success: true, storyId, text } on happy path", async () => {
    const result = await generateLongFormText(
      {},
      makeArgs(),
      makeCtx({ userEmail: "user@test.com" }),
      {} as any,
    );

    expect(result).toEqual({
      success: true,
      message: "Story generated successfully",
      storyId: 42,
      text: "Story text",
    });
  });

  it("passes characteristicId: undefined when arg is null", async () => {
    await generateLongFormText(
      {},
      makeArgs({ characteristicId: null }),
      makeCtx({ userEmail: "user@test.com" }),
      {} as any,
    );

    expect(mockedRunStoryGraph).toHaveBeenCalledWith(
      expect.objectContaining({ characteristicId: undefined }),
    );
  });

  it("forwards language and minutes to runStoryGraph", async () => {
    await generateLongFormText(
      {},
      makeArgs({ language: "Romanian", minutes: 15 }),
      makeCtx({ userEmail: "user@test.com" }),
      {} as any,
    );

    expect(mockedRunStoryGraph).toHaveBeenCalledWith(
      expect.objectContaining({
        language: "Romanian",
        minutes: 15,
      }),
    );
  });
});
