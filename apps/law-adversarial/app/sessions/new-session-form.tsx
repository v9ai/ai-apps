"use client";

import { Button, Card, Flex, Heading, Text, TextArea, TextField, Select } from "@radix-ui/themes";
import { createSession } from "./actions";
import { useState } from "react";

const jurisdictions = [
  { value: "federal", label: "Federal" },
  { value: "state-ny", label: "New York" },
  { value: "state-ca", label: "California" },
  { value: "state-tx", label: "Texas" },
  { value: "state-il", label: "Illinois" },
  { value: "state-fl", label: "Florida" },
];

export function NewSessionForm() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      await createSession(formData);
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <form action={handleSubmit}>
        <Flex direction="column" gap="4">
          <Heading size="3">New Stress Test</Heading>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="brief_title">
              Brief title
            </Text>
            <TextField.Root
              id="brief_title"
              name="brief_title"
              placeholder="e.g. Motion to Dismiss — Smith v. Jones"
              required
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="jurisdiction">
              Jurisdiction
            </Text>
            <Select.Root name="jurisdiction" defaultValue="federal">
              <Select.Trigger id="jurisdiction" />
              <Select.Content>
                {jurisdictions.map((j) => (
                  <Select.Item key={j.value} value={j.value}>
                    {j.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium">
              Brief document (PDF or DOCX)
            </Text>
            <input
              type="file"
              name="file"
              accept=".pdf,.docx"
              style={{
                fontSize: "var(--font-size-2)",
                color: "var(--gray-12)",
              }}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="brief_text">
              Or paste brief text
            </Text>
            <TextArea
              id="brief_text"
              name="brief_text"
              placeholder="Paste your legal brief text here..."
              rows={8}
              style={{ fontFamily: "var(--default-font-family)" }}
            />
          </Flex>

          <Flex direction="column" gap="1">
            <Text as="label" size="2" weight="medium" htmlFor="max_rounds">
              Max adversarial rounds
            </Text>
            <Select.Root name="max_rounds" defaultValue="3">
              <Select.Trigger id="max_rounds" />
              <Select.Content>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Select.Item key={n} value={String(n)}>
                    {n} round{n > 1 ? "s" : ""}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Session"}
          </Button>
        </Flex>
      </form>
    </Card>
  );
}
