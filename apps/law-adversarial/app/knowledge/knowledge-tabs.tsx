"use client";

import { Tabs } from "@radix-ui/themes";
import { ComplaintsTab } from "./complaints-tab";
import { LitigationTab } from "./litigation-tab";

export function KnowledgeTabs() {
  return (
    <Tabs.Root defaultValue="complaints">
      <Tabs.List>
        <Tabs.Trigger value="complaints">NYPD Complaints</Tabs.Trigger>
        <Tabs.Trigger value="litigation">Civil Litigation</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="complaints" style={{ paddingTop: 16 }}>
        <ComplaintsTab />
      </Tabs.Content>

      <Tabs.Content value="litigation" style={{ paddingTop: 16 }}>
        <LitigationTab />
      </Tabs.Content>
    </Tabs.Root>
  );
}
