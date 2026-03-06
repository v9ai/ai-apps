"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { Container, Heading, Button, Flex, Text, Box, Card, Skeleton, Badge, Tabs } from "@radix-ui/themes";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useGetApplicationQuery, useGenerateTopicDeepDiveMutation, useGenerateStudyTopicDeepDiveMutation } from "@/__generated__/hooks";
import type { AiInterviewPrepRequirement } from "@/__generated__/hooks";
import Link from "next/link";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";
import { ApplicationHeader } from "@/components/app-detail/ApplicationHeader";
import { RequirementDialog } from "@/components/app-detail/RequirementDialog";
import { StudyTopicDialog } from "@/components/app-detail/StudyTopicDialog";
import { JobDescriptionTab } from "@/components/app-detail/JobDescriptionTab";
import { InterviewPrepTab } from "@/components/app-detail/InterviewPrepTab";
import { CodingTab } from "@/components/app-detail/CodingTab";
import { BackendPrepTab } from "@/components/app-detail/BackendPrepTab";
import { DeepResearchTab } from "@/components/app-detail/DeepResearchTab";
import { StudyTab } from "@/components/app-detail/StudyTab";
import { LearningDashboard } from "@/components/app-detail/LearningDashboard";

const TAB_VALUES = ["description", "interview", "coding", "backend", "research", "study", "learn"] as const;
type TabValue = (typeof TAB_VALUES)[number];

function ApplicationDetailInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = Number(params.id);

  const { data, loading, error, refetch } = useGetApplicationQuery({
    variables: { id },
    skip: isNaN(id),
  });

  const { user } = useAuth();
  const isAdmin = user?.email === ADMIN_EMAIL;
  const app = data?.application;

  // Tab state persisted to URL
  const rawTab = searchParams.get("tab") ?? "description";
  const activeTab: TabValue = TAB_VALUES.includes(rawTab as TabValue) ? (rawTab as TabValue) : "description";
  const setActiveTab = useCallback(
    (tab: string) => {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      router.replace(url.pathname + url.search, { scroll: false });
    },
    [router],
  );

  // Cross-tab dialog state
  const [selectedReq, setSelectedReq] = useState<AiInterviewPrepRequirement | null>(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  const [selectedStudyTopic, setSelectedStudyTopic] = useState<{ req: AiInterviewPrepRequirement; topic: string } | null>(null);
  const [studyTopicLoading, setStudyTopicLoading] = useState(false);
  const [studyTopicError, setStudyTopicError] = useState<string | null>(null);
  const [generateTopicDeepDive] = useGenerateTopicDeepDiveMutation();
  const [generateStudyTopicDeepDive] = useGenerateStudyTopicDeepDiveMutation();

  // Cross-tab coordination: "Link source" from dialog → Job Description tab
  const [activeLinkTarget, setActiveLinkTarget] = useState<string | null>(null);
  const [flashRequirement, setFlashRequirement] = useState<string | null>(null);

  useEffect(() => {
    if (!flashRequirement) return;
    const t = setTimeout(() => setFlashRequirement(null), 2000);
    return () => clearTimeout(t);
  }, [flashRequirement]);

  // Keyboard shortcuts 1-7 to switch tabs
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < TAB_VALUES.length) {
        setActiveTab(TAB_VALUES[idx]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setActiveTab]);

  const handleOpenTopic = useCallback(
    (req: AiInterviewPrepRequirement) => {
      setSelectedReq(req);
      setDeepDiveError(null);
    },
    [],
  );

  const handleGenerateDeepDive = useCallback(
    async () => {
      if (!selectedReq || !app) return;
      setDeepDiveLoading(true);
      setDeepDiveError(null);
      try {
        const result = await generateTopicDeepDive({
          variables: { applicationId: app.id, requirement: selectedReq.requirement },
          refetchQueries: ["GetApplication"],
        });
        const updatedReqs = result.data?.generateTopicDeepDive?.aiInterviewPrep?.requirements;
        const updatedReq = updatedReqs?.find((r) => r.requirement === selectedReq.requirement);
        if (updatedReq) setSelectedReq(updatedReq as AiInterviewPrepRequirement);
      } catch (e) {
        setDeepDiveError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setDeepDiveLoading(false);
      }
    },
    [selectedReq, app, generateTopicDeepDive],
  );

  const handleOpenStudyTopic = useCallback(
    (e: React.MouseEvent, req: AiInterviewPrepRequirement, topic: string) => {
      e.stopPropagation();
      setSelectedStudyTopic({ req, topic });
      setStudyTopicError(null);
    },
    [],
  );

  const handleGenerateStudyTopicDeepDive = useCallback(
    async () => {
      if (!selectedStudyTopic || !app) return;
      setStudyTopicLoading(true);
      setStudyTopicError(null);
      try {
        const result = await generateStudyTopicDeepDive({
          variables: {
            applicationId: app.id,
            requirement: selectedStudyTopic.req.requirement,
            studyTopic: selectedStudyTopic.topic,
          },
          refetchQueries: ["GetApplication"],
        });
        const updatedReqs = result.data?.generateStudyTopicDeepDive?.aiInterviewPrep?.requirements;
        const updatedReq = updatedReqs?.find((r) => r.requirement === selectedStudyTopic.req.requirement);
        if (updatedReq) setSelectedStudyTopic({ req: updatedReq as AiInterviewPrepRequirement, topic: selectedStudyTopic.topic });
      } catch (e) {
        setStudyTopicError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        setStudyTopicLoading(false);
      }
    },
    [selectedStudyTopic, app, generateStudyTopicDeepDive],
  );

  const handleLinkSource = useCallback(
    (requirement: string) => {
      setSelectedReq(null);
      setTimeout(() => {
        setActiveLinkTarget(requirement);
        setActiveTab("description");
      }, 50);
    },
    [setActiveTab],
  );

  if (loading) {
    return (
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="400px" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">Error Loading Application</Heading>
            <Text color="gray">{error.message}</Text>
            <Button onClick={() => refetch()}>Retry</Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  if (!app) {
    return (
      <Container size="3" p="8">
        <Card>
          <Flex direction="column" align="center" gap="4" p="6">
            <Heading size="5">Application Not Found</Heading>
            <Text color="gray">This application doesn&apos;t exist or you don&apos;t have access.</Text>
            <Button asChild>
              <Link href="/applications">Back to Applications</Link>
            </Button>
          </Flex>
        </Card>
      </Container>
    );
  }

  const reqCount = app.aiInterviewPrep?.requirements?.length ?? 0;
  const readyCount = app.aiInterviewPrep?.requirements?.filter((r) => r.deepDive).length ?? 0;
  const exerciseCount = app.agenticCoding?.exercises?.length ?? 0;
  const backendSectionCount = app.aiBackendPrep
    ? [
        app.aiBackendPrep.systemDesign, app.aiBackendPrep.distributedSystems, app.aiBackendPrep.databaseDesign,
        app.aiBackendPrep.sqlOptimization, app.aiBackendPrep.nosqlPatterns, app.aiBackendPrep.apiDesign,
        app.aiBackendPrep.authSecurity, app.aiBackendPrep.caching, app.aiBackendPrep.messageQueues,
        app.aiBackendPrep.microservices, app.aiBackendPrep.testing, app.aiBackendPrep.devops,
        app.aiBackendPrep.securityOwasp, app.aiBackendPrep.performance, app.aiBackendPrep.concurrencyAsync,
        app.aiBackendPrep.observability, app.aiBackendPrep.eventDriven, app.aiBackendPrep.serverlessEdge,
        app.aiBackendPrep.typescriptNode, app.aiBackendPrep.aiMlIntegration,
      ].filter((s) => s?.title || s?.overview).length
    : 0;
  const researchQuestionCount = app.aiDeepResearch?.questions?.length ?? 0;

  return (
    <Container size="3" p={{ initial: "4", md: "8" }}>
      <ApplicationHeader app={app} isAdmin={isAdmin} />

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List style={{ borderBottom: "1px solid var(--gray-6)" }}>
          <Tabs.Trigger value="description">
            <Flex direction="column" align="center" gap="0">
              <Text>Job Description</Text>
              <span className="tab-shortcut-hint">1</span>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="interview">
            <Flex direction="column" align="center" gap="0">
              <Flex align="center" gap="1">
                <Text>Interview Prep</Text>
                {reqCount > 0 && <Badge size="1" variant="soft" color="blue" ml="1">{readyCount}/{reqCount}</Badge>}
              </Flex>
              <span className="tab-shortcut-hint">2</span>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="coding">
            <Flex direction="column" align="center" gap="0">
              <Flex align="center" gap="1">
                <Text>Coding</Text>
                {exerciseCount > 0 && <Badge size="1" variant="soft" color="violet" ml="1">{exerciseCount}</Badge>}
              </Flex>
              <span className="tab-shortcut-hint">3</span>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="backend">
            <Flex direction="column" align="center" gap="0">
              <Flex align="center" gap="1">
                <Text>Backend Prep</Text>
                {backendSectionCount > 0 && <Badge size="1" variant="soft" color="teal" ml="1">{backendSectionCount}/20</Badge>}
              </Flex>
              <span className="tab-shortcut-hint">4</span>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="research">
            <Flex direction="column" align="center" gap="0">
              <Flex align="center" gap="1">
                <Text>Deep Research</Text>
                {researchQuestionCount > 0 && <Badge size="1" variant="soft" color="purple" ml="1">{researchQuestionCount}</Badge>}
              </Flex>
              <span className="tab-shortcut-hint">5</span>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="study">
            <Flex direction="column" align="center" gap="0">
              <Text>Study</Text>
              <span className="tab-shortcut-hint">6</span>
            </Flex>
          </Tabs.Trigger>
          <Tabs.Trigger value="learn">
            <Flex direction="column" align="center" gap="0">
              <Flex align="center" gap="1">
                <Text>Learn</Text>
                <Badge size="1" variant="soft" color="violet" ml="1">New</Badge>
              </Flex>
              <span className="tab-shortcut-hint">7</span>
            </Flex>
          </Tabs.Trigger>
        </Tabs.List>

        <Box pt="4">
          <Tabs.Content value="description">
            <JobDescriptionTab
              app={app}
              isAdmin={isAdmin}
              activeLinkTarget={activeLinkTarget}
              onSetActiveLinkTarget={setActiveLinkTarget}
              onOpenTopic={handleOpenTopic}
              flashRequirement={flashRequirement}
              refetch={refetch}
            />
          </Tabs.Content>
          <Tabs.Content value="interview">
            <InterviewPrepTab
              app={app}
              isAdmin={isAdmin}
              onOpenTopic={handleOpenTopic}
              onOpenStudyTopic={handleOpenStudyTopic}
            />
          </Tabs.Content>
          <Tabs.Content value="coding">
            <CodingTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
          <Tabs.Content value="backend">
            <BackendPrepTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
          <Tabs.Content value="research">
            <DeepResearchTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
          <Tabs.Content value="study">
            <StudyTab app={app} isAdmin={isAdmin} />
          </Tabs.Content>
          <Tabs.Content value="learn">
            <LearningDashboard app={app} isAdmin={isAdmin} />
          </Tabs.Content>
        </Box>
      </Tabs.Root>

      <RequirementDialog
        selectedReq={selectedReq}
        onClose={() => { setSelectedReq(null); setDeepDiveError(null); }}
        deepDiveLoading={deepDiveLoading}
        deepDiveError={deepDiveError}
        onGenerateDeepDive={handleGenerateDeepDive}
        onOpenStudyTopic={handleOpenStudyTopic}
        onLinkSource={handleLinkSource}
        companyKey={app.companyKey}
      />

      <StudyTopicDialog
        selectedStudyTopic={selectedStudyTopic}
        onClose={() => { setSelectedStudyTopic(null); setStudyTopicError(null); }}
        studyTopicLoading={studyTopicLoading}
        studyTopicError={studyTopicError}
        onGenerate={handleGenerateStudyTopicDeepDive}
      />
    </Container>
  );
}

export default function ApplicationDetailPage() {
  return (
    <Suspense fallback={
      <Container size="3" p="8">
        <Skeleton height="32px" mb="6" style={{ maxWidth: 200 }} />
        <Skeleton height="400px" />
      </Container>
    }>
      <ApplicationDetailInner />
    </Suspense>
  );
}
