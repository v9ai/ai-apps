"use client";

import {
  Flex,
  Heading,
  Text,
  Card,
  Button,
  Badge,
  Separator,
  Grid,
} from "@radix-ui/themes";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/app/lib/auth/client";
import { AuthDialog } from "./components/AuthDialog";
import {
  RocketIcon,
  MagnifyingGlassIcon,
  CheckCircledIcon,
  SpeakerLoudIcon,
} from "@radix-ui/react-icons";
import {
  LayoutDashboard,
  MessageSquare,
  FlaskConical,
  Users,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  return (
    <Flex direction="column" gap="6">
      {/* Hero Section */}
      <Card size={{ initial: "2", md: "4" }} style={{ background: "var(--indigo-3)" }}>
        <Flex direction="column" gap="4" align="center" py="4">
          <Badge size="2" variant="soft" color="indigo">
            Personal Health &middot; Research-Backed &middot; Private
          </Badge>
          <Heading size={{ initial: "7", md: "9" }} align="center" style={{ maxWidth: "800px" }}>
            Your Personal Health & Research Companion
          </Heading>
          <Text
            size="4"
            align="center"
            color="gray"
            style={{ maxWidth: "640px" }}
          >
            Track conditions, medications, and blood tests alongside
            therapeutic goals and notes — connected to peer-reviewed research
            and an AI health chat that knows your records.
          </Text>

          {user && (
            <Text size="3" color="indigo" weight="medium">
              Welcome back,{" "}
              {user.name || user.email}!
            </Text>
          )}

          <Flex gap="3" mt="2">
            {isPending ? (
              <>
                <Button size="3" disabled loading>
                  Loading...
                </Button>
                <Button size="3" variant="soft" disabled>
                  Loading...
                </Button>
              </>
            ) : !user ? (
              <>
                <Button size="3" onClick={() => openAuth("signup")} color="indigo">
                  Get Started
                </Button>
                <Button size="3" variant="soft" onClick={() => openAuth("signin")}>
                  Sign In
                </Button>
              </>
            ) : (
              <>
                <Button size="3" onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard size={16} />
                  Open Dashboard
                </Button>
                <Button
                  size="3"
                  variant="soft"
                  onClick={() => router.push("/chat")}
                >
                  <MessageSquare size={16} />
                  Open Chat
                </Button>
              </>
            )}
          </Flex>
        </Flex>
      </Card>

      {/* Features Grid */}
      <Flex direction="column" gap="4">
        <Heading size="6">Key Features</Heading>
        <Grid columns={{ initial: "1", md: "2", lg: "3" }} gap="4">
          <Card
            style={{ cursor: "pointer" }}
            onClick={() => (user ? router.push("/dashboard") : openAuth("signup"))}
          >
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <LayoutDashboard size={24} color="var(--indigo-9)" />
                <Heading size="4">Health Dashboard</Heading>
              </Flex>
              <Text color="gray">
                One-glance overview of conditions, medications, blood tests,
                appointments, and brain-memory baselines — all in a single
                query.
              </Text>
              <Button variant="soft" style={{ marginTop: "auto" }}>
                {user ? "Open Dashboard →" : "Get Started →"}
              </Button>
            </Flex>
          </Card>

          <Card
            style={{ cursor: "pointer" }}
            onClick={() => (user ? router.push("/chat") : openAuth("signup"))}
          >
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <MessageSquare size={24} color="var(--indigo-9)" />
                <Heading size="4">AI Health Chat</Heading>
              </Flex>
              <Text color="gray">
                Ask questions about your own records. Backed by vector search
                over your conditions, markers, medications, and symptoms with
                safety guardrails.
              </Text>
              <Button variant="soft" style={{ marginTop: "auto" }}>
                {user ? "Open Chat →" : "Get Started →"}
              </Button>
            </Flex>
          </Card>

          <Card
            style={{ cursor: "pointer" }}
            onClick={() =>
              user ? router.push("/blood-tests") : openAuth("signup")
            }
          >
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <FlaskConical size={24} color="var(--indigo-9)" />
                <Heading size="4">Blood Tests & Trajectory</Heading>
              </Flex>
              <Text color="gray">
                Upload lab PDFs; markers are extracted and embedded
                automatically. View per-marker time-series trends across
                every test.
              </Text>
              <Button variant="soft" style={{ marginTop: "auto" }}>
                {user ? "Upload & View →" : "Get Started →"}
              </Button>
            </Flex>
          </Card>

          <Card
            style={{ cursor: "pointer" }}
            onClick={() => (user ? router.push("/family") : openAuth("signup"))}
          >
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <Users size={24} color="var(--indigo-9)" />
                <Heading size="4">Family Records</Heading>
              </Flex>
              <Text color="gray">
                Track family members' conditions, documents, and shared
                health history with read-only document viewing from R2.
              </Text>
              <Button variant="soft" style={{ marginTop: "auto" }}>
                {user ? "View Family →" : "Get Started →"}
              </Button>
            </Flex>
          </Card>

          <Card
            style={{ cursor: "pointer" }}
            onClick={() => (user ? router.push("/goals") : openAuth("signup"))}
          >
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <RocketIcon width="24" height="24" color="var(--indigo-9)" />
                <Heading size="4">Therapeutic Goals & Notes</Heading>
              </Flex>
              <Text color="gray">
                Goals with priorities and target dates, paired with rich
                notes, tags, and connections to research papers.
              </Text>
              <Button variant="soft" style={{ marginTop: "auto" }}>
                {user ? "Manage Goals →" : "Get Started →"}
              </Button>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <MagnifyingGlassIcon
                  width="24"
                  height="24"
                  color="var(--indigo-9)"
                />
                <Heading size="4">Research Integration</Heading>
              </Flex>
              <Text color="gray">
                Peer-reviewed research from PubMed, CrossRef, Semantic
                Scholar, OpenAlex, arXiv, Europe PMC, and DataCite.
              </Text>
              <Badge variant="soft" color="green" style={{ marginTop: "auto" }}>
                7+ Sources
              </Badge>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <CheckCircledIcon
                  width="24"
                  height="24"
                  color="var(--indigo-9)"
                />
                <Heading size="4">Claim Verification</Heading>
              </Flex>
              <Text color="gray">
                AI claim cards extract and verify statements against
                research literature with confidence scores.
              </Text>
              <Badge variant="soft" color="blue" style={{ marginTop: "auto" }}>
                Evidence-Based
              </Badge>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <SpeakerLoudIcon
                  width="24"
                  height="24"
                  color="var(--indigo-9)"
                />
                <Heading size="4">Audio + AI Workflows</Heading>
              </Flex>
              <Text color="gray">
                ElevenLabs TTS for therapeutic audio plus async DeepSeek
                workflows for research synthesis and questions.
              </Text>
              <Badge
                variant="soft"
                color="orange"
                style={{ marginTop: "auto" }}
              >
                Async Jobs
              </Badge>
            </Flex>
          </Card>
        </Grid>
      </Flex>

      <Separator size="4" />

      {/* Tech Stack */}
      <Flex direction="column" gap="4">
        <Heading size="6">Built With</Heading>
        <Card>
          <Flex direction="column" gap="3" p="4">
            <Grid columns={{ initial: "2", md: "4" }} gap="4">
              <Flex direction="column" gap="1">
                <Text weight="bold" size="2">
                  Frontend
                </Text>
                <Text size="2" color="gray">
                  Next.js 15
                </Text>
                <Text size="2" color="gray">
                  React 19
                </Text>
                <Text size="2" color="gray">
                  Radix UI
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                <Text weight="bold" size="2">
                  Backend
                </Text>
                <Text size="2" color="gray">
                  GraphQL
                </Text>
                <Text size="2" color="gray">
                  Apollo Server
                </Text>
                <Text size="2" color="gray">
                  Neon PostgreSQL
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                <Text weight="bold" size="2">
                  AI & Services
                </Text>
                <Text size="2" color="gray">
                  OpenAI
                </Text>
                <Text size="2" color="gray">
                  ElevenLabs
                </Text>
                <Text size="2" color="gray">
                  DeepSeek
                </Text>
                <Text size="2" color="gray">
                  LangGraph
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                <Text weight="bold" size="2">
                  Database
                </Text>
                <Text size="2" color="gray">
                  Drizzle ORM
                </Text>
                <Text size="2" color="gray">
                  PostgreSQL
                </Text>
                <Text size="2" color="gray">
                  pgvector
                </Text>
              </Flex>
            </Grid>
          </Flex>
        </Card>
      </Flex>

      {/* Quick Actions */}
      <Flex direction="column" gap="4">
        <Heading size="6">Get Started</Heading>
        <Grid columns={{ initial: "1", md: "2" }} gap="4">
          <Card style={{ background: "var(--indigo-3)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="4">
                {user ? "Open Your Dashboard" : "Start Your Journey"}
              </Heading>
              <Text color="gray">
                {user
                  ? "See conditions, medications, blood tests, appointments, and brain-memory baselines together in one place."
                  : "Sign up to track health records, therapeutic goals, and research-backed insights all in one private hub."}
              </Text>
              <Button
                onClick={() =>
                  user ? router.push("/dashboard") : openAuth("signup")
                }
                style={{ marginTop: "1rem" }}
              >
                {user ? "Open Dashboard" : "Sign Up"}
              </Button>
            </Flex>
          </Card>
          <Card style={{ background: "var(--violet-3)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="4">
                {user ? "Chat With Your Records" : "Explore Features"}
              </Heading>
              <Text color="gray">
                {user
                  ? "Ask questions about your own conditions, markers, medications, and symptoms with safety guardrails."
                  : "Discover health tracking, AI chat, blood-test analysis, and research-backed claim verification."}
              </Text>
              <Button
                onClick={() =>
                  user ? router.push("/chat") : openAuth("signin")
                }
                style={{ marginTop: "1rem" }}
                variant={user ? "solid" : "soft"}
              >
                {user ? "Open Chat" : "Learn More"}
              </Button>
            </Flex>
          </Card>
        </Grid>
      </Flex>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        defaultMode={authMode}
      />
    </Flex>
  );
}
