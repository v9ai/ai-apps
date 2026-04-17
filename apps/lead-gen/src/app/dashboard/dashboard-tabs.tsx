"use client";

import { useState, useCallback, Suspense, type ReactNode } from "react";
import { Box, Flex, Spinner, Text } from "@radix-ui/themes";
import {
  CubeIcon,
  RocketIcon,
  BellIcon,
  PersonIcon,
  EnvelopeClosedIcon,
  ChatBubbleIcon,
  LayersIcon,
} from "@radix-ui/react-icons";
import dynamic from "next/dynamic";
import { css } from "styled-system/css";
import { CompaniesList } from "@/components/companies-list";
import { useAuth } from "@/lib/auth-hooks";
import { ADMIN_EMAIL } from "@/lib/constants";

const FollowUpsContent = dynamic(() => import("@/app/follow-ups/page"));
const ContactsContent = dynamic(
  () => import("@/app/admin/contacts/page"),
);
const EmailsContent = dynamic(() =>
  import("@/app/emails/page").then((m) => ({
    default: m.EmailsPageContent,
  })),
);
const PostsContent = dynamic(
  () => import("@/app/admin/linkedin-posts/page"),
);
const PipelineContent = dynamic(() =>
  import("@/app/how-it-works/pipeline-client").then((m) => ({
    default: m.PipelineClient,
  })),
);
const OpportunitiesContent = dynamic(() =>
  import("./opportunities-tab").then((m) => ({
    default: m.OpportunitiesTab,
  })),
);

type TabDef = {
  key: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
};

const TABS: TabDef[] = [
  {
    key: "companies",
    label: "companies",
    icon: <CubeIcon width={14} height={14} />,
  },
  {
    key: "opportunities",
    label: "opportunities",
    icon: <RocketIcon width={14} height={14} />,
  },
  {
    key: "follow-ups",
    label: "follow-ups",
    icon: <BellIcon width={14} height={14} />,
  },
  {
    key: "contacts",
    label: "contacts",
    icon: <PersonIcon width={14} height={14} />,
    adminOnly: true,
  },
  {
    key: "emails",
    label: "emails",
    icon: <EnvelopeClosedIcon width={14} height={14} />,
    adminOnly: true,
  },
  {
    key: "posts",
    label: "posts",
    icon: <ChatBubbleIcon width={14} height={14} />,
    adminOnly: true,
  },
  {
    key: "pipeline",
    label: "pipeline",
    icon: <LayersIcon width={14} height={14} />,
  },
];

const tabButton = css({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
  textTransform: "lowercase",
  whiteSpace: "nowrap",
  transition: "background 0.15s, color 0.15s",
  fontFamily: "inherit",
  _hover: {
    background: "var(--gray-4)",
  },
});

function TabLoading() {
  return (
    <Flex justify="center" py="8">
      <Spinner size="3" />
    </Flex>
  );
}

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState("companies");
  const { user } = useAuth();
  const isAdmin =
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin);

  const content = (() => {
    switch (activeTab) {
      case "companies":
        return <CompaniesList />;
      case "opportunities":
        return <OpportunitiesContent />;
      case "follow-ups":
        return <FollowUpsContent />;
      case "contacts":
        return <ContactsContent />;
      case "emails":
        return <EmailsContent />;
      case "posts":
        return <PostsContent />;
      case "pipeline":
        return <PipelineContent />;
      default:
        return null;
    }
  })();

  return (
    <Flex direction="column" style={{ height: "100vh" }}>
      <Flex
        align="center"
        gap="1"
        px="4"
        py="2"
        style={{
          borderBottom: "1px solid var(--gray-6)",
          overflowX: "auto",
          flexShrink: 0,
          background: "var(--gray-2)",
        }}
      >
        {visibleTabs.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={tabButton}
            style={{
              background:
                activeTab === key ? "var(--gray-4)" : "transparent",
              color:
                activeTab === key ? "var(--gray-12)" : "var(--gray-11)",
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </Flex>

      <Box style={{ flex: 1, overflow: "auto" }}>
        <Suspense fallback={<TabLoading />}>{content}</Suspense>
      </Box>
    </Flex>
  );
}
