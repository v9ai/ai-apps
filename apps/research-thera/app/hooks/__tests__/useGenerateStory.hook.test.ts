// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: "2", charId: "3" }),
}));

// Mock the mutation hook
const mockMutate = vi.fn();
vi.mock("@/app/__generated__/hooks", () => ({
  useGenerateLongFormTextMutation: () => [mockMutate],
}));

import { useGenerateStory } from "../useGenerateStory";

describe("useGenerateStory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to /goals/{id} on success", async () => {
    mockMutate.mockResolvedValue({
      data: {
        generateLongFormText: {
          success: true,
          message: "Story generated successfully",
          storyId: 42,
        },
      },
    });

    const { result } = renderHook(() => useGenerateStory(3));

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });

    expect(mockPush).toHaveBeenCalledWith("/goals/1");
  });

  it("does NOT navigate when success is false", async () => {
    mockMutate.mockResolvedValue({
      data: {
        generateLongFormText: {
          success: false,
          message: "Generation failed",
        },
      },
    });

    const { result } = renderHook(() => useGenerateStory(3));

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("sets storyMessage with server error message", async () => {
    mockMutate.mockResolvedValue({
      data: {
        generateLongFormText: {
          success: false,
          message: "SAFEGUARDING_ALERT: blocked",
        },
      },
    });

    const { result } = renderHook(() => useGenerateStory(3));

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });

    expect(result.current.storyMessage).toEqual({
      text: "SAFEGUARDING_ALERT: blocked",
      type: "error",
    });
  });

  it("sets storyMessage on network/GraphQL error (catch)", async () => {
    mockMutate.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useGenerateStory(3));

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });

    expect(result.current.storyMessage).toEqual({
      text: "Network error",
      type: "error",
    });
  });

  it('defaults to "Story generation failed." when message is null', async () => {
    mockMutate.mockResolvedValue({
      data: {
        generateLongFormText: {
          success: false,
          message: null,
        },
      },
    });

    const { result } = renderHook(() => useGenerateStory(3));

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });

    expect(result.current.storyMessage?.text).toBe("Story generation failed.");
  });

  it('defaults to "An error occurred." for non-Error exceptions', async () => {
    mockMutate.mockRejectedValue("string-error");

    const { result } = renderHook(() => useGenerateStory(3));

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });

    expect(result.current.storyMessage?.text).toBe("An error occurred.");
  });

  it("clears previous storyMessage on new generation attempt", async () => {
    // First call: error
    mockMutate.mockResolvedValueOnce({
      data: {
        generateLongFormText: { success: false, message: "First error" },
      },
    });

    const { result } = renderHook(() => useGenerateStory(3));

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });
    expect(result.current.storyMessage?.text).toBe("First error");

    // Second call: success — message should be cleared during call
    mockMutate.mockResolvedValueOnce({
      data: {
        generateLongFormText: { success: true, storyId: 42 },
      },
    });

    await act(async () => {
      await result.current.handleGenerateStory(1);
    });

    expect(result.current.storyMessage).toBeNull();
  });

  it("sets generatingGoalId during mutation, clears after", async () => {
    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockMutate.mockReturnValue(pendingPromise);

    const { result } = renderHook(() => useGenerateStory(3));

    // Start generation (don't await)
    let promise: Promise<void>;
    act(() => {
      promise = result.current.handleGenerateStory(5);
    });

    // During mutation
    expect(result.current.generatingGoalId).toBe(5);

    // Resolve
    await act(async () => {
      resolvePromise!({
        data: { generateLongFormText: { success: true, storyId: 1 } },
      });
      await promise;
    });

    expect(result.current.generatingGoalId).toBeNull();
  });
});
