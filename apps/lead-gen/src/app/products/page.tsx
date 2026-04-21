import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { ProductsList } from "./components/products-list";

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading…</Text>
        </Container>
      }
    >
      <ProductsList />
    </Suspense>
  );
}
