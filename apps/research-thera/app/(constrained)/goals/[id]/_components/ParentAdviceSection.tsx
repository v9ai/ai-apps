"use client";

import { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Card,
  Badge,
  Separator,
  Spinner,
} from "@radix-ui/themes";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { GlassButton } from "@/app/components/GlassButton";
import {
  useGenerateParentAdviceMutation,
  type GetGoalQuery,
} from "@/app/__generated__/hooks";

type Goal = NonNullable<GetGoalQuery["goal"]>;

export default function ParentAdviceSection({ goal }: { goal: Goal }) {
  const hasResearch = !!goal.research && goal.research.length > 0;

  const [generateAdvice, { loading }] = useGenerateParentAdviceMutation({
    refetchQueries: ["GetGoal"],
  });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleGenerate = async () => {
    setMessage(null);
    try {
      const result = await generateAdvice({
        variables: { goalId: goal.id, language: "Romanian" },
      });
      const res = result.data?.generateParentAdvice;
      if (res?.success) {
        setMessage({ text: res.message || "Advice generated.", type: "success" });
      } else {
        setMessage({ text: res?.message || "Failed to generate advice.", type: "error" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "Error generating advice.", type: "error" });
    }
  };

  return (
    <Card>
      <Flex direction="column" gap="3" p="4">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Flex align="center" gap="2">
            <Heading size="4">Parent Advice</Heading>
            {goal.parentAdviceLanguage && (
              <Badge variant="soft" size="1">
                {goal.parentAdviceLanguage}
              </Badge>
            )}
          </Flex>
          <GlassButton
            variant="primary"
            size="medium"
            loading={loading}
            disabled={!hasResearch}
            onClick={handleGenerate}
          >
            {loading && <Spinner size="1" />}
            {goal.parentAdvice ? "Regenerate" : "Generate Advice"}
          </GlassButton>
        </Flex>

        {!hasResearch && (
          <Text size="2" color="gray">
            Generate research first — parent advice is grounded in evidence from research papers.
          </Text>
        )}

        {message && (
          <Text size="2" color={message.type === "success" ? "green" : "red"}>
            {message.text}
          </Text>
        )}

        {goal.parentAdvice && (
          <>
            <Separator size="4" />
            <Box className="prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <Heading size="5" mb="3">{children}</Heading>,
                  h2: ({ children }) => <Heading size="4" mb="2" mt="4">{children}</Heading>,
                  h3: ({ children }) => <Heading size="3" mb="2" mt="3">{children}</Heading>,
                  h4: ({ children }) => <Heading size="2" mb="1" mt="2">{children}</Heading>,
                  p: ({ children }) => <Text as="p" size="2" mb="2" style={{ lineHeight: 1.7 }}>{children}</Text>,
                  li: ({ children }) => <li style={{ lineHeight: 1.6, marginBottom: "4px", fontSize: "var(--font-size-2)" }}>{children}</li>,
                  strong: ({ children }) => <Text weight="bold">{children}</Text>,
                  hr: () => <Separator my="4" size="4" />,
                }}
              >
                {goal.parentAdvice}
              </ReactMarkdown>
            </Box>
            {goal.parentAdviceGeneratedAt && (
              <Text size="1" color="gray">
                Generated{" "}
                {new Date(goal.parentAdviceGeneratedAt).toLocaleDateString()}
              </Text>
            )}
          </>
        )}

        {hasResearch && !goal.parentAdvice && !loading && (
          <Text size="2" color="gray">
            Generate evidence-based parenting advice grounded in the {goal.research.length} research paper{goal.research.length === 1 ? "" : "s"} for this goal.
          </Text>
        )}
      </Flex>
    </Card>
  );
}
