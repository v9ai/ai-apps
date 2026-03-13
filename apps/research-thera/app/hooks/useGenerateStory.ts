"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGenerateLongFormTextMutation } from "@/app/__generated__/hooks";

export function useGenerateStory(characteristicId: number) {
  const router = useRouter();
  const [generateLongFormText] = useGenerateLongFormTextMutation();
  const [generatingGoalId, setGeneratingGoalId] = useState<number | null>(null);
  const [generatingFromCharacteristic, setGeneratingFromCharacteristic] = useState(false);
  const [storyMessage, setStoryMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleGenerateStory = useCallback(
    async (goalId: number) => {
      setGeneratingGoalId(goalId);
      setStoryMessage(null);
      try {
        const { data } = await generateLongFormText({
          variables: { goalId, characteristicId },
        });
        if (data?.generateLongFormText.success) {
          router.push(`/goals/${goalId}`);
        } else {
          setStoryMessage({
            text:
              data?.generateLongFormText.message || "Story generation failed.",
            type: "error",
          });
        }
      } catch (err: unknown) {
        setStoryMessage({
          text: err instanceof Error ? err.message : "An error occurred.",
          type: "error",
        });
      } finally {
        setGeneratingGoalId(null);
      }
    },
    [characteristicId, generateLongFormText, router],
  );

  const handleGenerateFromCharacteristic = useCallback(
    async () => {
      setGeneratingFromCharacteristic(true);
      setStoryMessage(null);
      try {
        const { data } = await generateLongFormText({
          variables: { characteristicId },
        });
        if (data?.generateLongFormText.success) {
          setStoryMessage({
            text: "Story generated successfully!",
            type: "success",
          });
        } else {
          setStoryMessage({
            text:
              data?.generateLongFormText.message || "Story generation failed.",
            type: "error",
          });
        }
      } catch (err: unknown) {
        setStoryMessage({
          text: err instanceof Error ? err.message : "An error occurred.",
          type: "error",
        });
      } finally {
        setGeneratingFromCharacteristic(false);
      }
    },
    [characteristicId, generateLongFormText],
  );

  return {
    handleGenerateStory,
    handleGenerateFromCharacteristic,
    generatingGoalId,
    generatingFromCharacteristic,
    storyMessage,
  };
}
