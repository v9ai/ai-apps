import { Suspense } from "react";
import { Spinner, Flex } from "@radix-ui/themes";
import { CompanyContactsClient } from "./contacts-client";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function CompanyContactsPage({ params }: Props) {
  const { key } = await params;

  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" minHeight="400px">
          <Spinner size="3" />
        </Flex>
      }
    >
      <CompanyContactsClient companyKey={key} />
    </Suspense>
  );
}
