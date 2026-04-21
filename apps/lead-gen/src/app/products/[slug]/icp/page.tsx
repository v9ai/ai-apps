import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { ProductIcpPage } from "../../components/product-icp-page";

type Params = { slug: string };

export default async function ProductIcpRoute({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;

  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading…</Text>
        </Container>
      }
    >
      <ProductIcpPage slug={slug} />
    </Suspense>
  );
}
