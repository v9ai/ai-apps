"use client";

import { useTransition, useState } from "react";
import { Button, Callout, Flex, Text } from "@radix-ui/themes";
import { BookOpen, RefreshCw } from "lucide-react";
import { runConditionResearch } from "./research-action";

export function ResearchButton({
  conditionId,
  hasExisting,
}: {
  conditionId: string;
  hasExisting: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await runConditionResearch(conditionId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Research failed");
      }
    });
  }

  return (
    <Flex direction="column" gap="2">
      <Button
        variant="soft"
        color="indigo"
        size="2"
        onClick={handleClick}
        disabled={isPending}
      >
        {isPending ? (
          <>
            <RefreshCw size={14} className="animate-spin" />
            <Text size="2">Researching... this may take a minute</Text>
          </>
        ) : (
          <>
            <BookOpen size={14} />
            <Text size="2">
              {hasExisting ? "Re-run Research" : "Run Research"}
            </Text>
          </>
        )}
      </Button>
      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
    </Flex>
  );
}
