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
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import {
  RocketIcon,
  FileTextIcon,
  MagnifyingGlassIcon,
  CheckCircledIcon,
  SpeakerLoudIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";

export default function Home() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { openSignIn, openSignUp } = useClerk();
  const isPending = !isLoaded;

  return (
    <Flex direction="column" gap="6">
      {/* Hero Section */}
      <Card size="4" style={{ background: "var(--indigo-3)" }}>
        <Flex direction="column" gap="4" align="center" py="4">
          <Badge size="2" variant="soft" color="indigo">
            Research-backed &middot; Personal &middot; Private
          </Badge>
          <Heading size="9" align="center" style={{ maxWidth: "800px" }}>
            Research-Backed Therapy Notes & Reflections
          </Heading>
          <Text
            size="4"
            align="center"
            color="gray"
            style={{ maxWidth: "600px" }}
          >
            Connect your therapeutic journey with evidence-based research.
            Generate insights, verify claims, and create personalized audio
            content.
          </Text>

          {user && (
            <Text size="3" color="indigo" weight="medium">
              Welcome back,{" "}
              {user.firstName || user.emailAddresses[0]?.emailAddress}!
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
                <Button size="3" onClick={() => openSignUp()} color="indigo">
                  Get Started
                </Button>
                <Button size="3" variant="soft" onClick={() => openSignIn()}>
                  Sign In
                </Button>
              </>
            ) : (
              <>
                <Button size="3" onClick={() => router.push("/goals")}>
                  <RocketIcon />
                  My Goals
                </Button>
                <Button
                  size="3"
                  variant="soft"
                  onClick={() => router.push("/notes")}
                >
                  <FileTextIcon />
                  My Notes
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
            onClick={() => (user ? router.push("/goals") : openSignUp())}
          >
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <RocketIcon width="24" height="24" color="var(--indigo-9)" />
                <Heading size="4">Therapeutic Goals</Heading>
              </Flex>
              <Text color="gray">
                Create and track therapeutic goals with priority levels, target
                dates, and comprehensive status management.
              </Text>
              <Button variant="soft" style={{ marginTop: "auto" }}>
                {user ? "Manage Goals →" : "Get Started →"}
              </Button>
            </Flex>
          </Card>

          <Card
            style={{ cursor: "pointer" }}
            onClick={() => (user ? router.push("/notes") : openSignUp())}
          >
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <FileTextIcon width="24" height="24" color="var(--indigo-9)" />
                <Heading size="4">Notes & Reflections</Heading>
              </Flex>
              <Text color="gray">
                Document your journey with rich notes, tags, and connections to
                research papers for evidence-based insights.
              </Text>
              <Button variant="soft" style={{ marginTop: "auto" }}>
                {user ? "View Notes →" : "Get Started →"}
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
                Automatically connect goals with peer-reviewed research from
                PubMed, CrossRef, Semantic Scholar, and more.
              </Text>
              <Badge variant="soft" color="green" style={{ marginTop: "auto" }}>
                7+ Data Sources
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
                AI-powered claim cards extract and verify statements against
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
                <Heading size="4">Audio Generation</Heading>
              </Flex>
              <Text color="gray">
                Generate therapeutic audio content with ElevenLabs
                text-to-speech in multiple languages.
              </Text>
              <Badge
                variant="soft"
                color="purple"
                style={{ marginTop: "auto" }}
              >
                Multi-Language
              </Badge>
            </Flex>
          </Card>

          <Card>
            <Flex direction="column" gap="3" p="2">
              <Flex align="center" gap="2">
                <LightningBoltIcon
                  width="24"
                  height="24"
                  color="var(--indigo-9)"
                />
                <Heading size="4">AI Workflows</Heading>
              </Flex>
              <Text color="gray">
                Powered by Mastra for async research generation, therapeutic
                questions, and long-form synthesis.
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
                  Cloudflare D1
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
                  Mastra
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
                  SQLite
                </Text>
                <Text size="2" color="gray">
                  Edge-Ready
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
          <Card style={{ background: "var(--violet-3)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="4">
                {user ? "Create Your First Goal" : "Start Your Journey"}
              </Heading>
              <Text color="gray">
                {user
                  ? "Start your therapeutic journey by setting meaningful goals and connecting them with evidence-based research."
                  : "Sign up to create therapeutic goals backed by research and track your progress."}
              </Text>
              <Button
                onClick={() => (user ? router.push("/goals") : openSignUp())}
                style={{ marginTop: "1rem" }}
              >
                {user ? "Create Goal" : "Sign Up"}
              </Button>
            </Flex>
          </Card>
          <Card style={{ background: "var(--blue-3)" }}>
            <Flex direction="column" gap="3" p="4">
              <Heading size="4">
                {user ? "Browse Your Notes" : "Explore Features"}
              </Heading>
              <Text color="gray">
                {user
                  ? "View all your therapeutic notes, reflections, and claim verifications in one organized place."
                  : "Discover research-backed insights, claim verification, and AI-powered audio content."}
              </Text>
              <Button
                onClick={() => (user ? router.push("/notes") : openSignIn())}
                style={{ marginTop: "1rem" }}
                variant={user ? "solid" : "soft"}
              >
                {user ? "View Notes" : "Learn More"}
              </Button>
            </Flex>
          </Card>
        </Grid>
      </Flex>
    </Flex>
  );
}
