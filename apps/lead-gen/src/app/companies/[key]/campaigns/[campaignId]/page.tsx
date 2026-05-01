import type { Metadata } from "next";
import { Suspense } from "react";
import { eq } from "drizzle-orm";
import { db, companies, emailCampaigns } from "@/db";
import { Spinner, Flex } from "@radix-ui/themes";
import { css } from "styled-system/css";
import { CampaignDetailClient } from "./campaign-detail-client";

type Props = {
  params: Promise<{ key: string; campaignId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { key, campaignId } = await params;
  const [campaign] = await db
    .select({ name: emailCampaigns.name })
    .from(emailCampaigns)
    .where(eq(emailCampaigns.id, campaignId))
    .limit(1);
  if (!campaign) return { title: "Campaign not found — Agentic Lead Gen" };

  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.key, key))
    .limit(1);

  const companyName = company?.name ?? key;
  return { title: `${campaign.name} — ${companyName} — Agentic Lead Gen` };
}

export default async function CampaignDetailPage({ params }: Props) {
  const { key, campaignId } = await params;

  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" className={css({ minHeight: "400px" })}>
          <Spinner size="3" />
        </Flex>
      }
    >
      <CampaignDetailClient companyKey={key} campaignId={campaignId} />
    </Suspense>
  );
}
