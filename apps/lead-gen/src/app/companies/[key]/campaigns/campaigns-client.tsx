"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertDialog, Callout, Heading, Text, Table, Badge, Flex, Spinner } from "@radix-ui/themes";
import { button } from "@/recipes/button";
import { ExclamationTriangleIcon, Pencil1Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { useCallback } from "react";
import { useGetCompanyQuery, useGetEmailCampaignsQuery, useCreateDraftCampaignMutation, useDeleteCampaignMutation } from "@/__generated__/hooks";
import { EditCampaignDialog } from "@/components/admin/EditCampaignDialog";

const statusColors: Record<string, "green" | "yellow" | "blue" | "red" | "gray"> = {
  draft: "gray",
  pending: "yellow",
  running: "blue",
  completed: "green",
  failed: "red",
  stopped: "red",
};

export function CampaignsClient({ companyKey }: { companyKey: string }) {
  const searchParams = useSearchParams();
  const [editCampaignId, setEditCampaignId] = useState<string | null>(
    () => searchParams.get("edit"),
  );

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
      <Flex justify="center" align="center" style={{ minHeight: "400px" }}>
        <Spinner size="3" />
      </Flex>
    );
  }

  if (companyError || campaignsError) {
    const message = companyError?.message ?? campaignsError?.message ?? "Unknown error";
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>Failed to load campaigns: {message}</Callout.Text>
      </Callout.Root>
    );
  }

  if (!company) {
    return <Text color="red">Company not found</Text>;
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
    <>
      <Flex justify="between" align="center" mb="4">
        <div>
          <Heading size="5">Campaigns</Heading>
          <Text size="2" color="gray">{campaigns.length} campaign(s)</Text>
        </div>
        <button className={button({ variant: "ghost" })} onClick={handleCreate} disabled={creating}>
          <PlusIcon /> New Campaign
        </button>
      </Flex>

      {campaigns.length === 0 ? (
        <Text color="gray">No campaigns yet for this company.</Text>
      ) : (
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Mode</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Recipients</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Sent</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Created</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {campaigns.map((campaign) => (
              <Table.Row key={campaign.id}>
                <Table.Cell>
                  <Text weight="medium">{campaign.name}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={statusColors[campaign.status] ?? "gray"}>
                    {campaign.status}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{campaign.mode ?? "-"}</Table.Cell>
                <Table.Cell>{campaign.totalRecipients}</Table.Cell>
                <Table.Cell>{campaign.emailsSent}</Table.Cell>
                <Table.Cell>
                  <Text size="1" color="gray">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Flex gap="2">
                    <button
                      type="button"
                      className={button({ variant: "ghost", size: "sm" })}
                      onClick={() => setEditCampaignId(campaign.id)}
                      aria-label={`Edit ${campaign.name}`}
                    >
                      <Pencil1Icon /> Edit
                    </button>
                    <DeleteCampaignButton
                      campaignId={campaign.id}
                      campaignName={campaign.name}
                      onDeleted={() => {
                        if (editCampaignId === campaign.id) setEditCampaignId(null);
                        refetch();
                      }}
                    />
                  </Flex>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {editCampaignId && (
        <EditCampaignDialog
          campaignId={editCampaignId}
          open={editCampaignId !== null}
          onOpenChange={(open) => {
            if (!open) setEditCampaignId(null);
          }}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </>
  );
}

function DeleteCampaignButton({
  campaignId,
  campaignName,
  onDeleted,
}: {
  campaignId: string;
  campaignName: string;
  onDeleted: () => void;
}) {
  const [deleteCampaign, { loading }] = useDeleteCampaignMutation();

  const handleDelete = useCallback(async () => {
    const { data } = await deleteCampaign({ variables: { id: campaignId } });
    if (data?.deleteCampaign?.success) {
      onDeleted();
    }
  }, [deleteCampaign, campaignId, onDeleted]);

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger>
        <button
          type="button"
          className={button({ variant: "ghost", size: "sm" })}
          aria-label={`Delete ${campaignName}`}
        >
          <TrashIcon /> Delete
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="400px">
        <AlertDialog.Title>Delete campaign</AlertDialog.Title>
        <AlertDialog.Description size="2">
          Remove &ldquo;{campaignName}&rdquo;? This cannot be undone.
        </AlertDialog.Description>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <button type="button" className={button({ variant: "ghost" })}>
              Cancel
            </button>
          </AlertDialog.Cancel>
          <AlertDialog.Action>
            <button
              type="button"
              className={button({ variant: "ghost" })}
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Removing…" : "Remove"}
            </button>
          </AlertDialog.Action>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
}
