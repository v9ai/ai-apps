import type { Metadata } from "next";
import { headers } from "next/headers";
import { Box, Flex } from "@radix-ui/themes";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/navigation/Sidebar";
import { HowItWorksClient } from "./how-it-works-client";

export const metadata: Metadata = {
  title: "How It Works | Todo",
  description:
    "8 cognitive science papers, 4 AI agents, and evidence-based features — the science behind smarter task management.",
};

export default async function HowItWorksPage() {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
  try {
    session = await auth.api.getSession({ headers: await headers() });
  } catch {
    // not logged in — render without sidebar
  }

  if (session) {
    return (
      <Flex style={{ minHeight: "100vh" }}>
        <Sidebar userName={session.user.name} />
        <Box
          style={{
            flex: 1,
            marginLeft: "var(--sidebar-width)",
            padding: "24px 32px",
          }}
        >
          <HowItWorksClient />
        </Box>
      </Flex>
    );
  }

  return <HowItWorksClient />;
}
