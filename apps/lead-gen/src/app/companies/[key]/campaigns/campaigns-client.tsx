"use client";

import { css } from "styled-system/css";
import { flex } from "styled-system/patterns";
import { button } from "@/recipes/button";
import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useGetCompanyQuery, useGetEmailCampaignsQuery, useCreateDraftCampaignMutation } from "@/__generated__/hooks";

const statusBadgeStyle: Record<string, { color: string; borderColor: string; bg: string }> = {
  draft: { color: "ui.secondary", borderColor: "ui.border", bg: "transparent" },
  pending: { color: "status.warning", borderColor: "status.warning", bg: "transparent" },
  running: { color: "accent.primary", borderColor: "accent.primary", bg: "transparent" },
  completed: { color: "status.positive", borderColor: "status.positive", bg: "status.positiveDim" },
  failed: { color: "status.negative", borderColor: "status.negative", bg: "transparent" },
  stopped: { color: "status.negative", borderColor: "status.negative", bg: "transparent" },
};

export function CampaignsClient({ companyKey }: { companyKey: string }) {
  const { data: companyData, loading: companyLoading, error: companyError } = useGetCompanyQuery({
    variables: { key: companyKey },
  });

  const company = companyData?.company;

  const { data, loading, error: campaignsError, refetch } = useGetEmailCampaignsQuery({
    variables: { limit: 50 },
  });

  const [createCampaign, { loading: creating }] = useCreateDraftCampaignMutation();

  // Filter campaigns for this company
  const campaigns = (data?.emailCampaigns?.campaigns ?? []).filter(
    (c) => c.companyId === company?.id,
  );

  if (companyLoading || loading) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={flex({ justify: "center", align: "center" })} style={{ minHeight: "400px" }}>
          <div className={css({ w: "16px", h: "16px", border: "2px solid", borderColor: "ui.border", borderTopColor: "accent.primary", borderRadius: "50%", animation: "spin 0.6s linear infinite" })} />
        </div>
      </div>
    );
  }

  if (companyError || campaignsError) {
    const message = companyError?.message ?? campaignsError?.message ?? "Unknown error";
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <div className={flex({ gap: "3" })} style={{ padding: "12px", border: "1px solid", borderColor: "var(--colors-status-negative)" }}>
          <div className={css({ flexShrink: 0 })}>
            <ExclamationTriangleIcon />
          </div>
          <span>Failed to load campaigns: {message}</span>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "8" })}>
        <span className={css({ color: "status.negative" })}>Company not found</span>
      </div>
    );
  }

  const handleCreate = async () => {
    await createCampaign({
      variables: {
        input: {
          name: `${company.name} Campaign ${new Date().toLocaleDateString()}`,
          companyId: company.id,
        },
      },
    });
    refetch();
  };

  return (
    <div className={css({ maxWidth: "1200px", mx: "auto", px: "4", py: "6" })}>
      <div className={flex({ justify: "space-between", align: "center" })} style={{ marginBottom: "16px" }}>
        <div>
          <h2 className={css({ fontSize: "xl", fontWeight: "bold", color: "ui.heading" })}>
            <Link href={`/companies/${companyKey}`} style={{ textDecoration: "none", color: "inherit" }}>
              {company.name}
            </Link>
            {" / Campaigns"}
          </h2>
          <span className={css({ fontSize: "sm", color: "ui.secondary" })}>{campaigns.length} campaign(s)</span>
        </div>
        <button className={button({ variant: "ghost" })} onClick={handleCreate} disabled={creating}>
          <PlusIcon /> New Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <span className={css({ color: "ui.secondary" })}>No campaigns yet for this company.</span>
      ) : (
        <table className={css({ borderCollapse: "collapse", width: "100%", fontSize: "sm" })}>
          <thead>
            <tr className={css({ borderBottom: "1px solid", borderBottomColor: "ui.border" })}>
              <th className={css({ bg: "ui.surfaceRaised", fontWeight: "bold", p: "2 3", textAlign: "left", fontSize: "xs", color: "ui.secondary", textTransform: "lowercase" })}>Name</th>
              <th className={css({ bg: "ui.surfaceRaised", fontWeight: "bold", p: "2 3", textAlign: "left", fontSize: "xs", color: "ui.secondary", textTransform: "lowercase" })}>Status</th>
              <th className={css({ bg: "ui.surfaceRaised", fontWeight: "bold", p: "2 3", textAlign: "left", fontSize: "xs", color: "ui.secondary", textTransform: "lowercase" })}>Mode</th>
              <th className={css({ bg: "ui.surfaceRaised", fontWeight: "bold", p: "2 3", textAlign: "left", fontSize: "xs", color: "ui.secondary", textTransform: "lowercase" })}>Recipients</th>
              <th className={css({ bg: "ui.surfaceRaised", fontWeight: "bold", p: "2 3", textAlign: "left", fontSize: "xs", color: "ui.secondary", textTransform: "lowercase" })}>Sent</th>
              <th className={css({ bg: "ui.surfaceRaised", fontWeight: "bold", p: "2 3", textAlign: "left", fontSize: "xs", color: "ui.secondary", textTransform: "lowercase" })}>Created</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const style = statusBadgeStyle[campaign.status] ?? statusBadgeStyle.draft;
              return (
                <tr key={campaign.id} className={css({ borderBottom: "1px solid", borderBottomColor: "ui.border" })}>
                  <td className={css({ p: "2 3" })}>
                    <span className={css({ fontWeight: "medium" })}>{campaign.name}</span>
                  </td>
                  <td className={css({ p: "2 3" })}>
                    <span className={css({ fontSize: "xs", px: "2", py: "1", border: "1px solid", borderColor: style.borderColor, color: style.color, bg: style.bg })}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className={css({ p: "2 3" })}>{campaign.mode ?? "-"}</td>
                  <td className={css({ p: "2 3" })}>{campaign.totalRecipients}</td>
                  <td className={css({ p: "2 3" })}>{campaign.emailsSent}</td>
                  <td className={css({ p: "2 3" })}>
                    <span className={css({ fontSize: "xs", color: "ui.secondary" })}>
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
