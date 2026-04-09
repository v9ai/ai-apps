import { Suspense } from "react";
import { Container, Spinner, Flex } from "@radix-ui/themes";
import { CampaignsClient } from "./campaigns-client";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function CompanyCampaignsPage({ params }: Props) {
  const { key } = await params;

  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Flex justify="center" align="center" style={{ minHeight: "400px" }}>
            <Spinner size="3" />
          </Flex>
        </Container>
      }
    >
      <CampaignsClient companyKey={key} />
    </Suspense>
  );
}
