"use client";

import { useState, useEffect } from "react";
import { SegmentedControl, Flex, Text, Spinner } from "@radix-ui/themes";
import { CheckIcon } from "@radix-ui/react-icons";
import {
  useTagLanguageQuery,
  useSetTagLanguageMutation,
} from "@/app/__generated__/hooks";

type Lang = "en" | "ro";

export function TagLanguageControl({ tag }: { tag: string }) {
  const { data, loading } = useTagLanguageQuery({
    variables: { tag },
    fetchPolicy: "cache-and-network",
  });
  const [save, { loading: saving }] = useSetTagLanguageMutation();
  const [justSaved, setJustSaved] = useState(false);

  const current: Lang = (data?.tagLanguage as Lang | null) === "ro" ? "ro" : "en";

  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 1500);
    return () => clearTimeout(t);
  }, [justSaved]);

  async function handleChange(next: string) {
    if (next !== "en" && next !== "ro") return;
    if (next === current) return;
    await save({
      variables: { tag, language: next },
      refetchQueries: ["TagLanguage"],
    });
    setJustSaved(true);
  }

  return (
    <Flex align="center" gap="2">
      <Text size="1" color="gray">
        AI language
      </Text>
      <SegmentedControl.Root
        value={current}
        onValueChange={handleChange}
        size="1"
      >
        <SegmentedControl.Item value="en">English</SegmentedControl.Item>
        <SegmentedControl.Item value="ro">Română</SegmentedControl.Item>
      </SegmentedControl.Root>
      {(loading || saving) && <Spinner size="1" />}
      {justSaved && !saving && (
        <Flex align="center" gap="1">
          <CheckIcon color="green" />
          <Text size="1" color="green">
            Saved
          </Text>
        </Flex>
      )}
    </Flex>
  );
}
