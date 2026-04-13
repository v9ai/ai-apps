import { ContactDetailProvider } from "@/components/contact-detail-provider";
import { Suspense } from "react";
import { Container, Text } from "@radix-ui/themes";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <Suspense
      fallback={
        <Container size="3" p="8">
          <Text color="gray">Loading...</Text>
        </Container>
      }
    >
      <ContactDetailProvider contactSlug={slug} />
    </Suspense>
  );
}
