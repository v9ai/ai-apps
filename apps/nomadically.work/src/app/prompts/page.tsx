"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Container,
  Text,
  Heading,
  Flex,
  Box,
  Badge,
  Tabs,
  Callout,
  Strong,
} from "@radix-ui/themes";
import {
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import { useAuth } from "@/lib/auth-hooks";
import { useGetPromptsQuery } from "@/__generated__/hooks";
import { LangSmithTab } from "./LangSmithTab";

function PromptsPageContent() {
  const { user } = useAuth();
  const { error } = useGetPromptsQuery();

  return (
    <Container size="4" p={{ initial: "4", md: "8" }}>
      <Flex direction="column" gap="6">
        <Flex direction="column" gap="2">
          <Flex align="center" justify="between">
            <Heading size="8">Prompt Management</Heading>
            <Flex align="center" gap="3">
              {user && (
                <Flex align="center" gap="2">
                  <Text size="2" color="gray">
                    Signed in as
                  </Text>
                  <Badge color="blue" variant="soft">
                    {user.email}
                  </Badge>
                </Flex>
              )}
            </Flex>
          </Flex>
          <Text size="3" color="gray">
            Prompt storage and versioning via LangSmith
          </Text>
        </Flex>

        {error && (
          <Callout.Root color="red">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              <Strong>Error loading prompts:</Strong> {error.message}
            </Callout.Text>
          </Callout.Root>
        )}

        <LangSmithTab />
      </Flex>
    </Container>
  );
}

export default function PromptsPage() {
  return (
    <Suspense fallback={
      <Container size="4" p={{ initial: "4", md: "8" }}>
        <Flex direction="column" gap="6">
          <Heading size="8">Prompt Management</Heading>
          <Text size="3" color="gray">
            Loading...
          </Text>
        </Flex>
      </Container>
    }>
      <PromptsPageContent />
    </Suspense>
  );
}
