import { Suspense } from "react";
import { Spinner, Flex } from "@radix-ui/themes";
import { CompanyPostsClient } from "./posts-client";

type Props = {
  params: Promise<{ key: string }>;
};

export default async function CompanyPostsPage({ params }: Props) {
  const { key } = await params;

  return (
    <Suspense
      fallback={
        <Flex justify="center" align="center" minHeight="400px">
          <Spinner size="3" />
        </Flex>
      }
    >
      <CompanyPostsClient companyKey={key} />
    </Suspense>
  );
}
