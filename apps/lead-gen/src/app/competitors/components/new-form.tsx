"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { TrashIcon, PlusIcon } from "@radix-ui/react-icons";
import { css } from "styled-system/css";
import { button } from "@/recipes/button";
import {
  useCreateCompetitorAnalysisMutation,
  useApproveCompetitorsMutation,
} from "@/__generated__/hooks";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { useTenant } from "@/components/tenant-provider";

type EditableCompetitor = { name: string; url: string };

export function NewCompetitorAnalysisForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const isNyx = tenant === "nyx";

  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<EditableCompetitor[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [createAnalysis, { loading: creating }] = useCreateCompetitorAnalysisMutation();
  const [approve, { loading: approving }] = useApproveCompetitorsMutation();

  if (!isNyx) {
    return (
      <Container size="3" p="8">
        <Text color="gray">Competitor analysis is only available for the NYX tenant.</Text>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container size="3" p="8">
        <Text color="red">Admin access required.</Text>
      </Container>
    );
  }

  async function handleCreate() {
    setError(null);
    if (!productName.trim() || !productUrl.trim()) {
      setError("Product name and URL are required");
      return;
    }
    try {
      const { data } = await createAnalysis({
        variables: { productName: productName.trim(), productUrl: productUrl.trim() },
      });
      const created = data?.createCompetitorAnalysis;
      if (!created) throw new Error("No analysis returned");
      setAnalysisId(created.id);
      setSuggestions(
        (created.competitors ?? []).map((c) => ({ name: c.name, url: c.url })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleApprove() {
    if (!analysisId) return;
    setError(null);
    const clean = suggestions
      .map((s) => ({ name: s.name.trim(), url: s.url.trim() }))
      .filter((s) => s.name && s.url);
    if (clean.length === 0) {
      setError("Add at least one competitor");
      return;
    }
    try {
      await approve({ variables: { analysisId, competitors: clean } });
      router.push(`/competitors/${analysisId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Container size="3" p="6">
      <Heading size="6" mb="4">
        New competitor analysis
      </Heading>

      {analysisId === null ? (
        <Flex direction="column" gap="3">
          <label className={css({ display: "block" })}>
            <Text as="div" size="2" mb="1" color="gray">
              Product name
            </Text>
            <TextField.Root
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Apollo"
            />
          </label>
          <label className={css({ display: "block" })}>
            <Text as="div" size="2" mb="1" color="gray">
              Product URL
            </Text>
            <TextField.Root
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              placeholder="https://apollo.io"
            />
          </label>
          {error && <Text color="red">{error}</Text>}
          <Flex gap="2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className={button({ variant: "solid" })}
            >
              {creating ? "Discovering…" : "Suggest competitors"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/competitors")}
              className={button({ variant: "ghost" })}
            >
              Cancel
            </button>
          </Flex>
        </Flex>
      ) : (
        <Flex direction="column" gap="3">
          <Text color="gray">
            Review and edit the 5 suggested competitors, then approve to start scraping.
          </Text>
          {suggestions.map((s, idx) => (
            <Flex key={idx} gap="2" align="center">
              <TextField.Root
                value={s.name}
                placeholder="Name"
                onChange={(e) => {
                  const next = [...suggestions];
                  next[idx] = { ...next[idx], name: e.target.value };
                  setSuggestions(next);
                }}
                className={css({ flex: "0 0 200px" })}
              />
              <TextField.Root
                value={s.url}
                placeholder="https://…"
                onChange={(e) => {
                  const next = [...suggestions];
                  next[idx] = { ...next[idx], url: e.target.value };
                  setSuggestions(next);
                }}
                className={css({ flex: 1 })}
              />
              <button
                type="button"
                onClick={() => setSuggestions(suggestions.filter((_, i) => i !== idx))}
                className={button({ variant: "ghost", size: "sm" })}
                aria-label="Remove"
              >
                <TrashIcon />
              </button>
            </Flex>
          ))}
          <button
            type="button"
            onClick={() => setSuggestions([...suggestions, { name: "", url: "" }])}
            className={button({ variant: "ghost", size: "sm" })}
          >
            <PlusIcon /> Add competitor
          </button>
          {error && <Text color="red">{error}</Text>}
          <Flex gap="2">
            <button
              type="button"
              onClick={handleApprove}
              disabled={approving}
              className={button({ variant: "solid" })}
            >
              {approving ? "Starting…" : "Approve & scrape"}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/competitors/${analysisId}`)}
              className={button({ variant: "ghost" })}
            >
              Skip scrape (view analysis)
            </button>
          </Flex>
        </Flex>
      )}
    </Container>
  );
}
