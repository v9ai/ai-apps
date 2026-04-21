import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { ProductDetail } from "../components/product-detail";

type Params = { slug: string };

export default async function ProductDetailPage({
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
      <ProductDetail slug={slug} />
    </Suspense>
  );
}
