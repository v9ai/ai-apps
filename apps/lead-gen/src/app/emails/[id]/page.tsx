import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";
import { ReceivedEmailDetail } from "./received-email-detail";

export default async function ReceivedEmailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense
      fallback={
        <Container size="3" p="8">
          <Text color="gray">Loading…</Text>
        </Container>
      }
    >
      <ReceivedEmailDetail emailId={parseInt(id)} />
    </Suspense>
  );
}
