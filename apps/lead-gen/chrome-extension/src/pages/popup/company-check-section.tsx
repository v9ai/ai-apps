import React, { useEffect, useState } from "react";
import { Stack, Button, Loader, Text, Group } from "@mantine/core";
import { gqlRequest } from "../../services/graphql";

const APP_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:3004";

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "not-company-page" }
  | { phase: "found"; key: string; name: string }
  | { phase: "not-found"; linkedinSlug: string }
  | { phase: "adding" }
  | { phase: "added" };

export default function CompanyCheckSection() {
  const [state, setState] = useState<State>({ phase: "idle" });

  useEffect(() => {
    setState({ phase: "loading" });

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0]?.url ?? "";
      const match = url.match(/linkedin\.com\/company\/([^/?#]+)/);

      if (!match) {
        setState({ phase: "not-company-page" });
        return;
      }

      const slug = match[1];
      const linkedinUrl = `https://www.linkedin.com/company/${slug}`;

      try {
        const result = await gqlRequest(
          `query FindCompanyForPopup($linkedinUrl: String) {
            findCompany(linkedinUrl: $linkedinUrl) {
              found
              company { id key name }
            }
          }`,
          { linkedinUrl },
        );

        const { found, company } = result.data?.findCompany ?? {};
        if (found && company?.key) {
          setState({ phase: "found", key: company.key, name: company.name });
        } else {
          setState({ phase: "not-found", linkedinSlug: slug });
        }
      } catch {
        setState({ phase: "not-found", linkedinSlug: slug });
      }
    });
  }, []);

  const handleAddToDb = async () => {
    setState({ phase: "adding" });
    try {
      await chrome.runtime.sendMessage({ action: "scrapeCompanyFull" });
    } catch {
      // background might not respond synchronously — that's fine
    }
    setState({ phase: "added" });
  };

  if (state.phase === "not-company-page") return null;

  if (state.phase === "loading" || state.phase === "idle") {
    return (
      <Group justify="center" py="xs">
        <Loader size="xs" color="gray" />
      </Group>
    );
  }

  if (state.phase === "found") {
    return (
      <Stack gap={4}>
        <Button
          component="a"
          href={`${APP_BASE}/companies/${state.key}`}
          target="_blank"
          rel="noopener noreferrer"
          color="teal"
          size="sm"
          fullWidth
        >
          Open {state.name} in Lead Gen →
        </Button>
      </Stack>
    );
  }

  if (state.phase === "not-found") {
    return (
      <Button
        onClick={handleAddToDb}
        color="orange"
        size="sm"
        fullWidth
      >
        Add to DB
      </Button>
    );
  }

  if (state.phase === "adding") {
    return (
      <Group justify="center" gap="xs" py="xs">
        <Loader size="xs" color="orange" />
        <Text size="xs" c="orange">Scraping…</Text>
      </Group>
    );
  }

  if (state.phase === "added") {
    return (
      <Text size="xs" c="teal" ta="center" py="xs">
        Scrape started — check back shortly
      </Text>
    );
  }

  return null;
}
