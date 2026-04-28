import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { OpportunitiesProvider } from "./opportunities-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OpportunitiesPage() {
  return (
    <Suspense
      fallback={
        <Container size="4" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <OpportunitiesProvider />
    </Suspense>
  );
}
