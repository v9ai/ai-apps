import React, { useState } from "react";
import {
  MantineProvider,
  AppShell,
  Group,
  Title,
  Stack,
  Textarea,
  Button,
  Text,
  Alert,
  Code,
  Divider,
} from "@mantine/core";
import logo from "@assets/img/logo.svg";
import { deepseekService } from "../../services/deepseek";
import { insertJobsBatch } from "../../services/job-inserter";
import { scrapeLinkedInJobsWithPagination } from "./linkedin-scraper";
import { scrapeAshbyJobsWithPagination } from "./ashby-scraper";
import { detectSourceFromUrl, isGoogleSearchUrl } from "../../lib/source-detector";
import PostsSection from "./posts-section";

export default function Popup() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jobClickStatus, setJobClickStatus] = useState("");
  const [fetchJobsStatus, setFetchJobsStatus] = useState("");
  const [fetchJobsLoading, setFetchJobsLoading] = useState(false);
  const [analyzeStatus, setAnalyzeStatus] = useState("");
  const [analyzeLoading, setAnalyzeLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError("");
    setResponse("");

    try {
      const stream = await deepseekService.generateText(prompt);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setResponse(accumulated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const handleClickSecondJob = async () => {
    setJobClickStatus("Clicking first job...");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        setJobClickStatus("Error: No active tab");
        return;
      }

      if (!tab.url?.includes("linkedin.com")) {
        setJobClickStatus("Please navigate to LinkedIn jobs page");
        return;
      }

      // Inject and execute the click sequence
      setJobClickStatus("Clicking first job...");

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Find first non-dismissed job
          const jobCards = document.querySelectorAll(".job-card-container");
          let firstNonDismissedJob = null;

          for (let i = 0; i < jobCards.length; i++) {
            const jobCard = jobCards[i];
            // Skip if job is dismissed
            if (!jobCard.getAttribute("data-lg-dismissed")) {
              firstNonDismissedJob = jobCard;
              break;
            }
          }

          if (firstNonDismissedJob) {
            const link = firstNonDismissedJob.querySelector(
              ".job-card-list__title--link",
            ) as HTMLElement;
            if (link) {
              link.click();

              // Wait for the job details to load and click Easy Apply
              setTimeout(() => {
                const easyApplyButton = document.querySelector(
                  ".jobs-apply-button",
                ) as HTMLElement;
                if (easyApplyButton) {
                  easyApplyButton.click();

                  // Wait for the Easy Apply modal to open and click Next
                  setTimeout(() => {
                    const nextButton = document.querySelector(
                      "[data-easy-apply-next-button]",
                    ) as HTMLElement;
                    if (nextButton) {
                      nextButton.click();

                      // Wait and click the second Next button or Review
                      setTimeout(() => {
                        // Check for Review button first
                        const reviewButton = document.querySelector(
                          "[data-live-test-easy-apply-review-button]",
                        ) as HTMLElement;

                        if (reviewButton) {
                          reviewButton.click();
                        } else {
                          // If no Review, try Next button
                          const nextButton2 = document.querySelector(
                            "[data-easy-apply-next-button]",
                          ) as HTMLElement;
                          if (nextButton2) {
                            nextButton2.click();

                            // Wait and check for Review button again
                            setTimeout(() => {
                              const reviewButton2 = document.querySelector(
                                "[data-live-test-easy-apply-review-button]",
                              ) as HTMLElement;
                              if (reviewButton2) {
                                reviewButton2.click();
                              }
                            }, 1500);
                          }
                        }
                      }, 1500);
                    }
                  }, 1500);

                  return "Applied!";
                }
                return "Easy Apply button not found";
              }, 1000);

              return link.textContent?.trim();
            }
          }
          return null;
        },
      });

      const title = results?.[0]?.result;
      setJobClickStatus(
        title ? `Clicked: ${title} - Applying...` : "Processing...",
      );

      // Wait a bit longer to show final status
      setTimeout(() => {
        setJobClickStatus("Application process started!");
      }, 1500);
    } catch (err) {
      setJobClickStatus(
        err instanceof Error ? err.message : "Error clicking job",
      );
    }
  };

  const handleFetchJobs = async () => {
    setFetchJobsLoading(true);
    setFetchJobsStatus("Extracting jobs...");
    setError("");

    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab.id) {
        setFetchJobsStatus("Error: No active tab found");
        setFetchJobsLoading(false);
        return;
      }

      const url = tab.url || "";
      const isGoogleSearch = isGoogleSearchUrl(url);

      // Google search scraping with automatic pagination
      if (isGoogleSearch) {
        const result = await scrapeAshbyJobsWithPagination(tab.id, (status) =>
          setFetchJobsStatus(status),
        );

        setFetchJobsStatus(result.message);
        setFetchJobsLoading(false);
        return;
      }

      // LinkedIn-specific scraping with pagination support
      if (url.includes("linkedin.com")) {
        const result = await scrapeLinkedInJobsWithPagination(
          tab.id,
          (status) => setFetchJobsStatus(status),
        );

        if (result.success) {
          setFetchJobsStatus(
            result.pagesScraped && result.pagesScraped > 1
              ? `${result.message} from ${result.pagesScraped} pages`
              : result.message,
          );
        } else {
          setFetchJobsStatus(result.message);
        }
        setFetchJobsLoading(false);
        return;
      }

      // Non-LinkedIn/Ashby job extraction
      let response;
      try {
        response = await chrome.tabs.sendMessage(tab.id, {
          action: "extractJobs",
        });
      } catch (err) {
        setFetchJobsStatus(
          "Error: Content script not loaded. Please reload the page and try again.",
        );
        setFetchJobsLoading(false);
        return;
      }

      if (!response || !response.jobs || response.jobs.length === 0) {
        setFetchJobsStatus("No jobs found on this page.");
        setFetchJobsLoading(false);
        return;
      }

      // Detect source from URL
      const { sourceType, tags } = detectSourceFromUrl(url);

      // Deduplicate jobs by URL before processing
      const uniqueJobsMap = new Map();
      response.jobs.forEach((job: any) => {
        if (job.url && !uniqueJobsMap.has(job.url)) {
          uniqueJobsMap.set(job.url, job);
        }
      });

      const uniqueJobs = Array.from(uniqueJobsMap.values());

      setFetchJobsStatus(
        `Found ${response.jobs.length} jobs (${uniqueJobs.length} unique). Saving to database...`,
      );

      // Prepare jobs with metadata
      const jobsWithMeta = uniqueJobs.map((job: any) => ({
        ...job,
        sourceType: sourceType,
        sourceCategory: "job_board",
        guid: job.url,
        keywords: tags,
      }));

      // Save all jobs via worker
      try {
        const result = await insertJobsBatch(jobsWithMeta, sourceType);

        if (result.success) {
          setFetchJobsStatus(`✓ ${result.message}`);
        } else {
          setFetchJobsStatus(`Error: ${result.message}`);
        }
      } catch (err) {
        setFetchJobsStatus(
          `Error saving jobs: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    } catch (err) {
      setFetchJobsStatus(
        err instanceof Error ? `Error: ${err.message}` : "Failed to fetch jobs",
      );
    } finally {
      setFetchJobsLoading(false);
    }
  };

  const handleAnalyzeCompanies = async () => {
    setAnalyzeLoading(true);
    setAnalyzeStatus("Starting company analysis...");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) {
        setAnalyzeStatus("Error: No active tab");
        setAnalyzeLoading(false);
        return;
      }

      if (!tab.url.includes("linkedin.com/search/results/companies")) {
        setAnalyzeStatus("Navigate to a LinkedIn company search page first");
        setAnalyzeLoading(false);
        return;
      }

      setAnalyzeStatus("Browsing companies... check console for progress");

      // Send message to background script (not content script)
      const response = await chrome.runtime.sendMessage({
        action: "startCompanyBrowsing",
      });

      if (!response.success) {
        setAnalyzeStatus(response.error || "Failed to start");
        setAnalyzeLoading(false);
      }
      // Loading state stays on — background will navigate pages autonomously
    } catch (err) {
      setAnalyzeStatus(err instanceof Error ? err.message : "Error analyzing companies");
      setAnalyzeLoading(false);
    }
  };

  const handleStopAnalyze = async () => {
    await chrome.runtime.sendMessage({ action: "stopCompanyBrowsing" });
    setAnalyzeStatus("Stopped");
    setAnalyzeLoading(false);
  };

  return (
    <MantineProvider>
      <AppShell
        header={{ height: 60 }}
        footer={{ height: 40 }}
        padding="md"
        style={{ width: 384, height: 500 }}
      >
        <AppShell.Header
          p="md"
          bg="dark.8"
          style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
        >
          <Group>
            <img src={logo} style={{ height: 32, width: 32 }} alt="logo" />
            <Title order={4} c="white">
              DeepSeek AI
            </Title>
          </Group>
        </AppShell.Header>

        <AppShell.Main bg="dark.9" style={{ overflow: "auto" }}>
          <Stack gap="md">
            <Stack gap="xs">
              <Text size="sm" fw={500} c="white">
                Prompt:
              </Text>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask anything..."
                rows={3}
                disabled={loading}
                styles={{
                  input: {
                    backgroundColor: "var(--mantine-color-dark-8)",
                    borderColor: "var(--mantine-color-dark-4)",
                    color: "white",
                  },
                }}
              />
            </Stack>

            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              fullWidth
              color="blue"
            >
              {loading ? "Generating..." : "Generate"}
            </Button>

            <Divider color="dark.4" />

            <Stack gap="xs">
              <Button onClick={handleClickSecondJob} fullWidth color="green">
                Apply to First Job
              </Button>
              {jobClickStatus && (
                <Alert color="dark" radius="sm" p="xs">
                  <Text size="xs" ta="center" c="white">
                    {jobClickStatus}
                  </Text>
                </Alert>
              )}
            </Stack>

            <Divider
              color="dark.4"
              label="Extract Jobs"
              labelPosition="center"
            />

            <Stack gap="xs">
              <Button
                onClick={handleFetchJobs}
                disabled={fetchJobsLoading}
                color="blue"
                size="sm"
                fullWidth
              >
                {fetchJobsLoading ? "Extracting..." : "Extract & Save Jobs"}
              </Button>
              {fetchJobsStatus && (
                <Alert color="dark" radius="sm" p="xs">
                  <Text size="xs" ta="center" c="white">
                    {fetchJobsStatus}
                  </Text>
                </Alert>
              )}
            </Stack>

            <Divider
              color="dark.4"
              label="Companies"
              labelPosition="center"
            />

            <Stack gap="xs">
              <Group grow gap="xs">
                <Button
                  onClick={handleAnalyzeCompanies}
                  disabled={analyzeLoading}
                  color="violet"
                  size="sm"
                >
                  {analyzeLoading ? "Analyzing..." : "Analyze Companies"}
                </Button>
                {analyzeLoading && (
                  <Button onClick={handleStopAnalyze} color="red" size="sm">
                    Stop
                  </Button>
                )}
              </Group>
              {analyzeStatus && (
                <Alert color="dark" radius="sm" p="xs">
                  <Text size="xs" ta="center" c="white">
                    {analyzeStatus}
                  </Text>
                </Alert>
              )}
            </Stack>

            <Divider
              color="dark.4"
              label="LinkedIn Posts"
              labelPosition="center"
            />

            <PostsSection />

            {error && (
              <Alert color="red" radius="sm">
                <Text size="sm" c="white">
                  {error}
                </Text>
              </Alert>
            )}

            {response && (
              <Stack gap="xs" style={{ flex: 1, overflow: "hidden" }}>
                <Text size="sm" fw={500} c="white">
                  Response:
                </Text>
                <Code
                  block
                  style={{
                    backgroundColor: "var(--mantine-color-dark-8)",
                    border: "1px solid var(--mantine-color-dark-4)",
                    maxHeight: 200,
                    overflow: "auto",
                    color: "var(--mantine-color-gray-3)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {response}
                </Code>
              </Stack>
            )}
          </Stack>
        </AppShell.Main>

        <AppShell.Footer
          p="xs"
          bg="dark.8"
          style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}
        >
          <Text size="xs" c="gray.3" ta="center">
            {import.meta.env.VITE_API_BASE_URL || "localhost:3004"}
          </Text>
        </AppShell.Footer>
      </AppShell>
    </MantineProvider>
  );
}
