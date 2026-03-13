import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockGoal,
  mockFamilyMember,
  mockCharacteristic,
  mockUniqueOutcomes,
  mockResearchPaper,
  mockDeepSeekResponse,
  mockStory,
} from "@/test/fixtures/storyGraph";

// Mock d1Tools
vi.mock("@/src/db", () => ({
  d1Tools: {
    getGoal: vi.fn(),
    getFamilyMember: vi.fn(),
    getCharacteristic: vi.fn(),
    getUniqueOutcomesForCharacteristic: vi.fn(),
    listTherapyResearch: vi.fn(),
    createGoalStory: vi.fn(),
  },
}));

// Mock DeepSeek client
const mockChat = vi.fn();
vi.mock("@ai-apps/deepseek", () => ({
  createDeepSeekClient: vi.fn(() => ({ chat: mockChat })),
}));

import { runStoryGraph, getDevelopmentalTier } from "../generateStory";
import { d1Tools } from "@/src/db";

const mockedD1 = vi.mocked(d1Tools);

describe("runStoryGraph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedD1.getGoal.mockResolvedValue(mockGoal as any);
    mockedD1.getFamilyMember.mockResolvedValue(mockFamilyMember as any);
    mockedD1.getCharacteristic.mockResolvedValue(mockCharacteristic as any);
    mockedD1.getUniqueOutcomesForCharacteristic.mockResolvedValue(mockUniqueOutcomes as any);
    mockedD1.listTherapyResearch.mockResolvedValue([mockResearchPaper] as any);
    mockedD1.createGoalStory.mockResolvedValue(mockStory as any);
    mockChat.mockResolvedValue(mockDeepSeekResponse);
  });

  it("returns { storyId, text } on happy path", async () => {
    const result = await runStoryGraph({
      goalId: 1,
      characteristicId: 3,
      userEmail: "user@test.com",
    });

    expect(result).toEqual({
      storyId: mockStory.id,
      text: mockDeepSeekResponse.choices[0].message.content,
    });
  });

  it("defaults language to 'English', minutes to 10", async () => {
    await runStoryGraph({
      goalId: 1,
      userEmail: "user@test.com",
    });

    expect(mockedD1.createGoalStory).toHaveBeenCalledWith(
      1,
      "English",
      10,
      expect.any(String),
    );
  });

  it("throws when DeepSeek returns empty text", async () => {
    mockChat.mockResolvedValue({ choices: [{ message: { content: "" } }] });

    await expect(
      runStoryGraph({ goalId: 1, userEmail: "user@test.com" }),
    ).rejects.toThrow("DeepSeek returned empty text");
  });

  it("handles goal with no familyMember (self-directed)", async () => {
    mockedD1.getGoal.mockResolvedValue({ ...mockGoal, familyMemberId: null } as any);

    const result = await runStoryGraph({
      goalId: 1,
      userEmail: "user@test.com",
    });

    expect(result.storyId).toBe(mockStory.id);
    expect(mockedD1.getFamilyMember).not.toHaveBeenCalled();

    // Check DeepSeek prompt mentions self-directed
    const chatCall = mockChat.mock.calls[0][0];
    const userMsg = chatCall.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain("self-directed");
  });

  it("handles no characteristic (undefined)", async () => {
    const result = await runStoryGraph({
      goalId: 1,
      userEmail: "user@test.com",
      // characteristicId is undefined
    });

    expect(result.storyId).toBe(mockStory.id);
    expect(mockedD1.getCharacteristic).not.toHaveBeenCalled();
  });

  it("handles empty research list", async () => {
    mockedD1.listTherapyResearch.mockResolvedValue([] as any);

    const result = await runStoryGraph({
      goalId: 1,
      userEmail: "user@test.com",
    });

    expect(result.storyId).toBe(mockStory.id);
    // Prompt should contain fallback text about no research
    const chatCall = mockChat.mock.calls[0][0];
    const userMsg = chatCall.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain("No research papers available");
  });

  it("includes unique outcomes in DeepSeek prompt", async () => {
    await runStoryGraph({
      goalId: 1,
      characteristicId: 3,
      userEmail: "user@test.com",
    });

    const chatCall = mockChat.mock.calls[0][0];
    const userMsg = chatCall.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain("Stayed at sleepover");
  });

  it("includes research findings in DeepSeek prompt", async () => {
    await runStoryGraph({
      goalId: 1,
      characteristicId: 3,
      userEmail: "user@test.com",
    });

    const chatCall = mockChat.mock.calls[0][0];
    const userMsg = chatCall.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain("CBT reduces anxiety symptoms by 60%");
  });
});

describe("getDevelopmentalTier", () => {
  it("returns EARLY_CHILDHOOD for age <= 5", () => {
    expect(getDevelopmentalTier(3)).toBe("EARLY_CHILDHOOD");
    expect(getDevelopmentalTier(5)).toBe("EARLY_CHILDHOOD");
  });

  it("returns MIDDLE_CHILDHOOD for age 6-11", () => {
    expect(getDevelopmentalTier(6)).toBe("MIDDLE_CHILDHOOD");
    expect(getDevelopmentalTier(11)).toBe("MIDDLE_CHILDHOOD");
  });

  it("returns EARLY_ADOLESCENCE for age 12-14", () => {
    expect(getDevelopmentalTier(12)).toBe("EARLY_ADOLESCENCE");
    expect(getDevelopmentalTier(14)).toBe("EARLY_ADOLESCENCE");
  });

  it("returns LATE_ADOLESCENCE for age 15-18", () => {
    expect(getDevelopmentalTier(15)).toBe("LATE_ADOLESCENCE");
    expect(getDevelopmentalTier(18)).toBe("LATE_ADOLESCENCE");
  });

  it("returns ADULT for age > 18", () => {
    expect(getDevelopmentalTier(19)).toBe("ADULT");
    expect(getDevelopmentalTier(35)).toBe("ADULT");
  });

  it("returns ADULT for null/undefined", () => {
    expect(getDevelopmentalTier(null)).toBe("ADULT");
    expect(getDevelopmentalTier(undefined)).toBe("ADULT");
  });
});
