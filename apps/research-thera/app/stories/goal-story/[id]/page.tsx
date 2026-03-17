"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Flex, Spinner } from "@radix-ui/themes";

// GoalStory has been merged into Story — redirect to /stories/[id]
export default function GoalStoryRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    router.replace(`/stories/${params.id}`);
  }, [router, params.id]);

  return (
    <Flex justify="center" align="center" style={{ minHeight: "200px" }}>
      <Spinner size="3" />
    </Flex>
  );
}
