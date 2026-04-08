"use client";

import { Callout, Container, Heading, Text, Table, Badge, Flex, Spinner } from "@radix-ui/themes";
import { button } from "@/recipes/button";
import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useGetCompanyQuery, useGetEmailCampaignsQuery, useCreateDraftCampaignMutation } from "@/__generated__/hooks";

const statusColors: Record<string, "green" | "yellow" | "blue" | "red" | "gray"> = {
  draft: "gray",
  pending: "yellow",
  running: "blue",
  completed: "green",
  failed: "red",
  stopped: "red",
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
      <Container size="4" p="8">
        <Flex justify="center" align="center" style={{ minHeight: "400px" }}>
          <Spinner size="3" />
        </Flex>
      </Container>
    );
  }

  if (companyError || campaignsError) {
    const message = companyError?.message ?? campaignsError?.message ?? "Unknown error";
    return (
      <Container size="4" p="8">
        <Callout.Root color="red">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>Failed to load campaigns: {message}</Callout.Text>
        </Callout.Root>
      </Container>
    );
  }

  if (!company) {
    return (
      <Container size="4" p="8">
        <Text color="red">Company not found</Text>
      </Container>
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
    <Container size="4" p="6">
      <Flex justify="between" align="center" mb="4">
        <div>
          <Heading size="5">
            <Link href={`/companies/${companyKey}`} style={{ textDecoration: "none", color: "inherit" }}>
              {company.name}
            </Link>
            {" / Campaigns"}
          </Heading>
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
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Container>
  );
}
